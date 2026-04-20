import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { triggerQueue } from '@/lib/modQueue';

const TEMP_DIR = path.join(process.cwd(), 'tmp');

export type UploadResponse = {
  success: boolean;
  message: string;
  jobId?: string;
}

export async function POST(request: Request) {
  try {
    const filenameEncoded = request.headers.get("x-file-name");
    const uploadId = request.headers.get("x-upload-id");
    const chunkIndexStr = request.headers.get("x-chunk-index");
    const totalChunksStr = request.headers.get("x-total-chunks");

    if (!filenameEncoded || !uploadId || !chunkIndexStr || !totalChunksStr) {
      return NextResponse.json({ error: 'Missing chunk headers.' }, { status: 400 });
    }

    const filename = decodeURIComponent(filenameEncoded);
    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);

    await fs.promises.mkdir(TEMP_DIR, { recursive: true });

    const safeUploadId = uploadId.replace(/[^a-zA-Z0-9.-_]/g, '');
    const tempZipPath = path.join(TEMP_DIR, `upload_${safeUploadId}.zip`);

    const initialHandle = await fs.promises.open(tempZipPath, 'a');
    await initialHandle.close();

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB standard
    const offset = chunkIndex * CHUNK_SIZE;

    const buffer = Buffer.from(await request.arrayBuffer());

    const fh = await fs.promises.open(tempZipPath, 'r+');
    await fh.write(buffer, 0, buffer.length, offset);
    await fh.close();

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

    const responseData: UploadResponse = {
      success: true,
      message: `Chunk ${chunkIndex + 1} received`
    };

    return NextResponse.json(responseData);

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/upload] Error during mod upload:', error.message || error);
    return NextResponse.json({ error: 'Internal error while processing the upload.' }, { status: 500 });
  }
}