import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Base dir where config files are mounted (shared volume)
const CONFIG_DIR = process.env.CONFIG_DIR || "/app/cfg";

const ALLOWED_FILES = ["server_cfg.ini", "entry_list.ini", "extra_cfg.yml"];

function safePath(filename: string): string | null {
  if (!ALLOWED_FILES.includes(filename)) return null;
  const resolved = path.resolve(CONFIG_DIR, filename);
  // Prevent path traversal
  if (!resolved.startsWith(path.resolve(CONFIG_DIR))) return null;
  return resolved;
}

// GET /api/config-editor?file=server_cfg.ini
export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "file param required." }, { status: 400 });
  }

  const filePath = safePath(file);
  if (!filePath) {
    return NextResponse.json({ error: "File not allowed." }, { status: 403 });
  }

  try {
    const content = await fs.readFile(filePath, "utf-8");
    console.log(`[config-editor] File read successful: ${file}`);
    return NextResponse.json({ file, content });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[config-editor] Read error for ${file}:`, error.message || error);
    return NextResponse.json({ error: "File not found or unreadable." }, { status: 404 });
  }
}

// POST /api/config-editor
// Body: { file: "server_cfg.ini", content: "..." }
export async function POST(req: NextRequest) {
  const { file, content } = await req.json();

  if (!file || content === undefined) {
    return NextResponse.json({ error: "file and content required." }, { status: 400 });
  }

  const filePath = safePath(file);
  if (!filePath) {
    return NextResponse.json({ error: "File not allowed." }, { status: 403 });
  }

  try {
    await fs.writeFile(filePath, content, "utf-8");
    console.log(`[config-editor] File write successful: ${file}`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[config-editor] Write error for ${file}:`, error.message || error);
    return NextResponse.json({ error: "Failed to write file." }, { status: 500 });
  }
}
