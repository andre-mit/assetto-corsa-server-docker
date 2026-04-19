import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { triggerQueue } from '@/lib/modQueue';

const TEMP_DIR = path.join(process.cwd(), 'tmp');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File | null;
    const filename = formData.get('filename') as string | null;
    const uploadId = formData.get('uploadId') as string | null;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const totalChunks = parseInt(formData.get('totalChunks') as string, 10);

    if (!chunk || !filename || !uploadId) {
      return NextResponse.json({ error: 'Missing chunk data or identifiers.' }, { status: 400 });
    }

    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
    
    // Ensure safe filename pattern
    const safeUploadId = uploadId.replace(/[^a-zA-Z0-9.-_]/g, '');
    const tempZipPath = path.join(TEMP_DIR, `upload_${safeUploadId}.zip`);
    
    // Append chunk to the file
    // We expect sequential chunks because the client awaits each fetch.
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await fs.promises.appendFile(tempZipPath, buffer);

    console.log(`[api/mods/upload] Received chunk ${chunkIndex + 1}/${totalChunks} for ${filename}`);

    // If this is the last chunk, process it as a ModJob
    if (chunkIndex === totalChunks - 1) {
      console.log(`[api/mods/upload] File complete on disk: ${tempZipPath}. Creating DB Job...`);
      const job = await prisma.modJob.create({
        data: {
          type: 'UPLOAD',
          target: tempZipPath,
          status: 'PENDING',
          progress: 0,
        },
      });

      console.log(`[api/mods/upload] Job created: ${job.id}`);
      triggerQueue().catch(err => console.error("[api/mods/upload] Error triggering queue:", err));

      return NextResponse.json({ 
        success: true, 
        message: 'Upload processing queued.',
        jobId: job.id 
      });
    }

    // Success for intermediate chunk
    return NextResponse.json({ 
      success: true, 
      message: `Chunk ${chunkIndex + 1} received` 
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/upload] Error during mod upload:', error.message || error);
    return NextResponse.json({ error: 'Internal error while processing the upload.' }, { status: 500 });
  }
}