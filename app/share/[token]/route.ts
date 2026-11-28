import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/security/ratelimit";
import { resolveShareToken } from "@/lib/share/links";
import { DASH_PATH, SHARE_COOKIE } from "@/lib/dashboards/landscapes-phase1/access";

/**
 * An approved, view-only share link. The random token in the URL is the key:
 * it is checked here, kept in an httpOnly cookie for the dashboard, and the
 * visitor is sent on to the investment dashboard (all landscapes, all tabs).
 * The dashboard logs each view and re-checks the link on every visit, so
 * expiry and revoking still apply. Nothing here can be downloaded.
 */
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = new URL(req.url);
  const ip = getClientIp(req);
  const limited = await rateLimit({ key: "share", ip, limit: 60, windowSec: 60 });
  if (!limited.ok) return new NextResponse("Too many requests. Please wait a minute and reload.", { status: 429, headers: noStore });

  const link = await resolveShareToken(token);
  if (!link) {
    const res = NextResponse.redirect(new URL(`${DASH_PATH}?link=unavailable`, base), { status: 303, headers: noStore });
    res.cookies.delete({ name: SHARE_COOKIE, path: "/dashboards" });
    return res;
  }
  const res = NextResponse.redirect(new URL(DASH_PATH, base), { status: 303, headers: noStore });
  res.cookies.set({
    name: SHARE_COOKIE, value: token, path: "/dashboards", httpOnly: true, sameSite: "lax",
    secure: base.protocol === "https:", expires: new Date(link.expires_at),
  });
  return res;
}
