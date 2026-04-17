import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const tracks = await prisma.track.findMany({
    orderBy: { name: 'asc' }
  });
  console.log('Tracks found:', tracks);
  return NextResponse.json(tracks);
}