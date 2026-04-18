import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set(JWT_COOKIE_NAME, "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    console.log("[auth/logout] Logout successful");
    return response;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[auth/logout] Logout error:", error.message || error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
