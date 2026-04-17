import { NextResponse } from 'next/server';
import { getContainerStatus } from '@/lib/docker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const state = await getContainerStatus();

        return NextResponse.json({ Status: state?.Status || 'not_found' });
    } catch (error) {
        return NextResponse.json({ Status: 'stopped' });
    }
}