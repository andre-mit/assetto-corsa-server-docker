import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(brands);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[api/content/brands] Error fetching brands:', error.message || error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
