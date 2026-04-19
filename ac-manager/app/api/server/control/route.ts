import { NextResponse } from 'next/server';
import { getAcContainer } from '@/lib/docker';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body; // { action: 'start' | 'stop' | 'restart' }
    const container = await getAcContainer();

    const DOCKER_ACTION_TIMEOUT = 12000; // 12 seconds for actions

    const executeWithTimeout = async (actionPromise: Promise<any>, label: string) => {
      return Promise.race([
        actionPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout executing ${label} on Docker`)), DOCKER_ACTION_TIMEOUT)
        )
      ]);
    };

    if (action === 'start') await executeWithTimeout(container.start(), 'start');
    else if (action === 'stop') await executeWithTimeout(container.stop(), 'stop');
    else if (action === 'restart') await executeWithTimeout(container.restart(), 'restart');
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    console.log(`[api/server/control] Action '${action}' executed successfully on AC container`);
    return NextResponse.json({ success: true, action });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[api/server/control] Error executing action:`, error.message || error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}