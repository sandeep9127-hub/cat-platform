import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { authConfig } from "@/auth.config";
import { PREVIEW_COOKIE, PREVIEW_TOKEN, previewGateEnabled } from "@/lib/preview";

// Edge middleware: admin/editor auth gate + a pre-launch private-preview gate.
//
// IMPORTANT (perf): next-auth v5's `auth()` wrapper, when it wraps the WHOLE
// middleware, marks every matched response `Cache-Control: no-store` to protect
// session data — which disabled CDN/ISR caching site-wide and gave multi-second
// TTFBs on every page. So we only run `auth()` on the admin surface (which
// genuinely must not be cached); public routes are handled by a plain function
// that never touches the session, so their ISR/CDN cache headers survive.
const { auth } = NextAuth(authConfig);

// Reachable even while the preview gate is on: the gate itself, its unlock
// endpoint, the editor sign-in flow, NextAuth, and cron callbacks.
function isAlwaysAllowed(pathname: string): boolean {
  return (
    pathname === "/preview" ||
    pathname.startsWith("/api/preview") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron")
  );
}

// Admin desk + its API — editor/admin only. Auth-aware (and intentionally
// uncached). Only invoked for /admin and /api/admin paths.
const adminGuard = auth((req) => {
  const role = (req.auth?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // 1) Admin surface → run the auth-aware guard (no caching there is correct).
  //    auth()'s type is the stricter route-handler one; at runtime it's invoked
  //    as middleware with (req, ev), so cast to the middleware signature.
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const guard = adminGuard as unknown as (
      req: NextRequest,
      ev: NextFetchEvent
    ) => Promise<NextResponse> | NextResponse;
    return guard(req, ev);
  }

  // 2) Everything else → pre-launch private preview gate, with NO auth() call,
  //    so public pages stay cacheable (ISR/CDN). The gate only reads a cookie.
  if (!previewGateEnabled()) return NextResponse.next();
  if (isAlwaysAllowed(pathname)) return NextResponse.next();
  if (req.cookies.get(PREVIEW_COOKIE)?.value === PREVIEW_TOKEN) return NextResponse.next();

  const url = req.nextUrl.clone();
  const target = pathname + (req.nextUrl.search || "");
  url.pathname = "/preview";
  url.search = "";
  url.searchParams.set("from", target);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on every route except Next internals and any path with a file
  // extension (static assets in /public, fonts, images, the geo json).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
