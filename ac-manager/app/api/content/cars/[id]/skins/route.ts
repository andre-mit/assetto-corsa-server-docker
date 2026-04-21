import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'game-content');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const skinsDir = path.join(CONTENT_DIR, 'cars', id, 'skins');
    const entries = await fs.readdir(skinsDir, { withFileTypes: true });
    const skins = entries
      .filter(e => e.isDirectory())
      .map(e => e.name);

    return NextResponse.json({ skins });
  } catch {
    // No skins directory or car doesn't exist
    return NextResponse.json({ skins: [] });
  }
}
