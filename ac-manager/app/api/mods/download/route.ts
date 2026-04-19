import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { triggerQueue } from '@/lib/modQueue';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL provided.' }, { status: 400 });
    }

    console.log(`[api/mods/download] Received link: ${url}`);
    
    // Create a background job instead of installing immediately
    const job = await prisma.modJob.create({
      data: {
        type: 'DOWNLOAD',
        target: url,
        status: 'PENDING',
        progress: 0,
      },
    });

    console.log(`[api/mods/download] DB Job saved successfully: ${job.id}`);
    
    // Start processing in the background
    triggerQueue().catch(err => console.error("[api/mods/download] Error triggering queue:", err));
    console.log(`[api/mods/download] Queue triggered`);

    return NextResponse.json({ 
      success: true, 
      message: 'Download queued.',
      jobId: job.id 
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/mods/download] Error queuing download:', error.message || error);
    return NextResponse.json({ error: 'Internal error while queuing the download.' }, { status: 500 });
  }
}
