import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWT_COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(JWT_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    console.log(`[auth/me] Info requested for user: ${payload.email}`);
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[auth/me] Error fetching user info:", error.message || error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
