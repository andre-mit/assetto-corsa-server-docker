import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { installModFromZip } from '@/lib/modInstaller';

const TEMP_DIR = path.join(process.cwd(), 'tmp');

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'No URL provided.' }, { status: 400 });
  }

  const tempZipPath = path.join(TEMP_DIR, `download_${Date.now()}.zip`);

  try {
    console.log(`[api/mods/download] Starting download from: ${url}`);
    
    await fs.mkdir(TEMP_DIR, { recursive: true });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText} (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempZipPath, buffer);

    console.log(`[api/mods/download] Download complete, installing mod...`);

    // Call the installer
    const result = await installModFromZip(tempZipPath);

    // Cleanup the downloaded zip
    await fs.rm(tempZipPath, { force: true });

    console.log(`[api/mods/download] Success: ${result.message}`);
    return NextResponse.json(result);

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/download] Error:', error.message || error);

    // Cleanup if possible
    try {
      if (await fs.stat(tempZipPath).catch(() => null)) {
        await fs.rm(tempZipPath, { force: true });
      }
    } catch (cleanupError) {
      console.error('[api/mods/download] Cleanup error:', cleanupError);
    }

    return NextResponse.json({
      error: 'Failed to download or process mod from URL.',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
