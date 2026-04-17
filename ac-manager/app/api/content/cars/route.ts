import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const cars = await prisma.car.findMany({
      orderBy: { name: "asc" },
    });

    console.log("Cars retrieved:", cars);
    return NextResponse.json(cars);
  } catch (error) {
    console.error("Error retrieving cars:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cars" },
      { status: 500 },
    );
  }
}
