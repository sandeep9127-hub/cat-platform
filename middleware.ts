import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { PREVIEW_COOKIE, PREVIEW_TOKEN, previewGateEnabled } from "@/lib/preview";

// Edge middleware: adapter-free auth config so it can read the JWT session from
// the cookie without a DB call, plus a pre-launch private-preview gate.
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

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 1) Admin desk + its API — editor/admin only (unchanged).
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    if (role !== "admin" && role !== "editor") {
      const url = req.nextUrl.clone();
      url.pathname = "/signin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2) Pre-launch private preview gate for everything else.
  if (!previewGateEnabled()) return NextResponse.next();
  if (isAlwaysAllowed(pathname)) return NextResponse.next();
  if (req.cookies.get(PREVIEW_COOKIE)?.value === PREVIEW_TOKEN) return NextResponse.next();

  // trustHost:true → req.nextUrl reflects the real request host in production.
  const url = req.nextUrl.clone();
  const target = pathname + (req.nextUrl.search || "");
  url.pathname = "/preview";
  url.search = "";
  url.searchParams.set("from", target);
  return NextResponse.redirect(url);
});

export const config = {
  // Run on every route except Next internals and any path with a file
  // extension (static assets in /public, fonts, images, the geo json).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
