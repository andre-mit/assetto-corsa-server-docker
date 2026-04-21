import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const car = await prisma.car.findUnique({
      where: { folderName: id },
      select: {
        skins: {
          select: {
            id: true,
            name: true,
            s3PreviewUrl: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    return NextResponse.json({ skins: car?.skins || [] });
  } catch {
    return NextResponse.json({ skins: [] });
  }
}
