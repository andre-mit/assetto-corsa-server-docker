import { NextResponse } from 'next/server';
import { getContainerStatus } from '@/lib/docker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const state = await getContainerStatus();
        const status = state?.Status || 'not_found';
        console.log(`[api/server/status] Server status retrieved: ${status}`);
        return NextResponse.json({ Status: status });
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[api/server/status] Error fetching container status:", error.message || error);
        return NextResponse.json({ Status: 'stopped' });
    }
}