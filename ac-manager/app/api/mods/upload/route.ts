import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { installModFromZip } from '@/lib/modInstaller';

const TEMP_DIR = path.join(process.cwd(), 'tmp');

export async function POST(request: Request) {
  const tempZipPath = path.join(TEMP_DIR, `upload_${Date.now()}.zip`);

  try {
    const formData = await request.formData();
    const file = formData.get('modFile') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    await fs.mkdir(TEMP_DIR, { recursive: true });
    
    // Write the uploaded file to a temporary location
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempZipPath, buffer);

    // Call the installer
    const result = await installModFromZip(tempZipPath);

    // Cleanup the uploaded zip
    await fs.rm(tempZipPath, { force: true });

    console.log(`[api/mods/upload] Success: ${result.message}`);
    return NextResponse.json(result);

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/upload] Error during mod upload/install:', error.message || error);

    // Cleanup if possible
    try {
      if (await fs.stat(tempZipPath).catch(() => null)) {
        await fs.rm(tempZipPath, { force: true });
      }
    } catch (cleanupError) {
      console.error('[api/mods/upload] Cleanup error:', cleanupError);
    }

    return NextResponse.json({
      error: 'Internal error while processing the file.',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}