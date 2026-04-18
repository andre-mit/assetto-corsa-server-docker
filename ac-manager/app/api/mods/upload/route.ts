import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { triggerQueue } from '@/lib/modQueue';

const TEMP_DIR = path.join(process.cwd(), 'tmp');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('modFile') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    await fs.mkdir(TEMP_DIR, { recursive: true });
    
    // We still have to write the uploaded file to disk first
    // In a fully optimized system, we'd stream the upload too,
    // but for now this is a good first step.
    const tempZipPath = path.join(TEMP_DIR, `upload_${Date.now()}.zip`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempZipPath, buffer);

    // Create a background job
    const job = await prisma.modJob.create({
      data: {
        type: 'UPLOAD',
        target: tempZipPath,
        status: 'PENDING',
        progress: 0,
      },
    });

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