import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.modJob.findUnique({
      where: { id: params.id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/job] Error fetching job:', error.message || error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
