import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import eventBus from '@/lib/eventBus';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.modJob.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Job deleted' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[api/mods/job/delete] Error deleting job:`, error.message || error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    await prisma.modJob.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    eventBus.emitJobUpdate({ id, status: 'CANCELLED', progress: 0, type: 'UPLOAD' });

    return NextResponse.json({ success: true, message: 'Job cancelled' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[api/mods/job/patch] Error cancelling job:`, error.message || error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
