import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db, schema } from "@/lib/db";
import {
  PREVIEW_COOKIE,
  PREVIEW_TOKEN,
  PREVIEW_PASSWORD_SHA256,
  PREVIEW_MAX_AGE,
  safeFrom,
} from "@/lib/preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") ?? "");
  const name = String(form?.get("name") ?? "").trim().slice(0, 120);
  const from = safeFrom(String(form?.get("from") ?? "/"));

  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const ok =
    password.length > 0 &&
    crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(PREVIEW_PASSWORD_SHA256, "hex"),
    );

  if (!ok) {
    const loc = "/preview?error=1" + (from !== "/" ? "&from=" + encodeURIComponent(from) : "");
    return new NextResponse(null, { status: 303, headers: { Location: loc } });
  }

  // Log who came in (name optional), with IP + agent, to the audit trail.
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    await db.insert(schema.auditLog).values({
      action: "preview_unlock",
      actorEmail: name || null,
      entityType: "preview",
      meta: { name: name || null, ip, userAgent: req.headers.get("user-agent") || "", from },
    });
  } catch {
    // Never block access on a logging failure.
  }

  const res = new NextResponse(null, { status: 303, headers: { Location: from } });
  res.cookies.set(PREVIEW_COOKIE, PREVIEW_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: PREVIEW_MAX_AGE,
  });
  return res;
}
