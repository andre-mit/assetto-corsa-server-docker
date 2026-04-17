import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { verifyToken, JWT_COOKIE_NAME } from "@/lib/auth";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/users")) {
    if (
      pathname.startsWith("/api/auth/login") ||
      pathname.startsWith("/api/auth/logout") ||
      pathname.startsWith("/api/auth/me")
    ) {
      return NextResponse.next();
    }

    const token = req.cookies.get(JWT_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(req);

  const localeMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  const pathAfterLocale = localeMatch ? localeMatch[2] || "/" : pathname;

  const isPublicPath = PUBLIC_PATHS.some((p) => pathAfterLocale.startsWith(p));
  const isDashboard = pathAfterLocale.startsWith("/dashboard");

  if (isDashboard && !isPublicPath) {
    const token = req.cookies.get(JWT_COOKIE_NAME)?.value;
    const payload = token ? await verifyToken(token) : null;

    if (!payload) {
      const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
  ],
};
