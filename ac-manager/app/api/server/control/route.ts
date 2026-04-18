import { NextResponse } from 'next/server';
import { getAcContainer } from '@/lib/docker';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body; // { action: 'start' | 'stop' | 'restart' }
    const container = await getAcContainer();

    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else if (action === 'restart') await container.restart();
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    console.log(`[api/server/control] Action '${action}' executed successfully on AC container`);
    return NextResponse.json({ success: true, action });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[api/server/control] Error executing action:`, error.message || error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}