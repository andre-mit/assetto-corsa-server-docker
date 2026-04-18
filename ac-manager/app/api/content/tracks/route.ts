import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const tracks = await prisma.track.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`[api/content/tracks] Tracks retrieved: ${tracks.length} items`);
    return NextResponse.json(tracks);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[api/content/tracks] Error retrieving tracks:", error.message || error);
    return NextResponse.json(
      { error: "Failed to retrieve tracks" },
      { status: 500 },
    );
  }
}