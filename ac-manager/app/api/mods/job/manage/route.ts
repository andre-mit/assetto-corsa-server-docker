import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    // Delete all completed/failed/cancelled jobs from DB to clear the interface
    await prisma.modJob.deleteMany({
      where: {
        status: { in: ['SUCCESS', 'FAILED', 'CANCELLED'] }
      }
    });
    return NextResponse.json({ success: true, message: 'Completed jobs cleared' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/job/manage] Error clearing completed jobs:', error.message || error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
