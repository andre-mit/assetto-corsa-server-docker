import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerQueue } from '@/lib/modQueue';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Trigger queue just in case some jobs are stuck
    triggerQueue().catch(err => console.error("[api/mods/job/list] Error triggering queue:", err));

    // Fetch active or recent jobs (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const jobs = await prisma.modJob.findMany({
      where: {
        OR: [
          { status: { in: ['PENDING', 'DOWNLOADING', 'EXTRACTING', 'INGESTING'] } },
          { updatedAt: { gte: yesterday } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json(jobs);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/job/list] Error fetching jobs:', error.message || error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
