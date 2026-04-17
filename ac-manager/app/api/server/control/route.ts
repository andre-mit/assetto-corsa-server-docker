import { NextResponse } from 'next/server';
import { getAcContainer } from '@/lib/docker';

export async function POST(request: Request) {
  try {
    const { action } = await request.json(); // { action: 'start' | 'stop' | 'restart' }
    const container = await getAcContainer();

    if (action === 'start') await container.start();
    else if (action === 'stop') await container.stop();
    else if (action === 'restart') await container.restart();
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}