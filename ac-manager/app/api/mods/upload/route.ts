import { NextResponse } from 'next/server';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { promisify } from 'util';
import path from 'path';
import prisma from '@/lib/prisma';
import { triggerQueue } from '@/lib/modQueue';

const TEMP_DIR = path.join(process.cwd(), 'tmp');

export async function POST(request: Request) {
  try {
    console.log('[api/mods/upload] Received upload request');
    const filename = request.headers.get('x-filename');

    if (!filename || !request.body) {
      console.log('[api/mods/upload] Missing file or filename headers');
      return NextResponse.json({ error: 'No file provided or missing custom headers.' }, { status: 400 });
    }

    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
    
    const tempZipPath = path.join(TEMP_DIR, `upload_${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    console.log(`[api/mods/upload] Streaming upload to ${tempZipPath}`);

    // Stream the body directly to a file using Node's stream pipeline
    const fileStream = fs.createWriteStream(tempZipPath);
    
    // Convert Web ReadableStream to Node Readable
    const nodeStream = Readable.fromWeb(request.body as import('stream/web').ReadableStream);
    
    await pipeline(nodeStream, fileStream);

    console.log('[api/mods/upload] File written to disk, creating Job in DB...');
    // Create a background job
    const job = await prisma.modJob.create({
      data: {
        type: 'UPLOAD',
        target: tempZipPath,
        status: 'PENDING',
        progress: 0,
      },
    });

    console.log(`[api/mods/upload] Job created: ${job.id}`);

    // Trigger queue
    triggerQueue().catch(err => console.error("[api/mods/upload] Error triggering queue:", err));

    return NextResponse.json({ 
      success: true, 
      message: 'Upload processing queued.',
      jobId: job.id 
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/upload] Error during mod upload:', error.message || error);
    return NextResponse.json({ error: 'Internal error while processing the upload.' }, { status: 500 });
  }
}