import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

/**
 * Next.js Proxy (formerly Middleware)
 * ------------------------------------
 * As of Next.js 16, the file convention changed from `middleware.ts` to `proxy.ts`,
 * and the exported function changed from `middleware` to `proxy`.
 * The behaviour is identical — Next.js runs this function BEFORE every matched request.
 *
 * This is the most efficient way to protect routes because:
 * - It runs at the Edge (before your page/component code)
 * - It intercepts the request BEFORE rendering, preventing any flash of unauthorized content
 * - You write protection logic ONCE here instead of in every page
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the JWT token from cookies
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Verify the JWT (returns null if expired/invalid/missing)
  const session = token ? verifyToken(token) : null;
  const isAuthenticated = !!session;

  // ── Protected Routes ────────────────────────────────────────────
  // If the user tries to access /rooms/* without being logged in,
  // redirect them to the login page.
  if (pathname.startsWith("/rooms")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      // Optionally pass the intended URL so we can redirect back after login
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Auth Routes (already logged in) ────────────────────────────
  // If the user is already authenticated and tries to visit /login or /register,
  // redirect them straight to /rooms (no need to log in again).
  if (pathname === "/login" || pathname === "/register" || pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/rooms", request.url));
    }
  }

  // All other cases: allow the request through normally
  return NextResponse.next();
}

/**
 * Matcher Configuration
 * ---------------------
 * Tell Next.js which paths this proxy should run on.
 * We exclude static files, images, and API routes to avoid unnecessary overhead.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT for:
     * - _next/static (static files like JS, CSS)
     * - _next/image (Next.js image optimization)
     * - favicon.ico
     * - Public folder files
     * - API routes (we handle auth inside those route handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
