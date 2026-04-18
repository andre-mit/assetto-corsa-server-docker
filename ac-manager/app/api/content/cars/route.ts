import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const cars = await prisma.car.findMany({
      orderBy: { name: "asc" },
    });

    console.log(`[api/content/cars] Cars retrieved: ${cars.length} items`);
    return NextResponse.json(cars);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[api/content/cars] Error retrieving cars:", error.message || error);
    return NextResponse.json(
      { error: "Failed to retrieve cars" },
      { status: 500 },
    );
  }
}
