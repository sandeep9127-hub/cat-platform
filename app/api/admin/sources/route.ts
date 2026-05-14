import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const url = String(form.get("url") ?? "").trim();
  const sourceType = String(form.get("source_type") ?? "other") as schema.SourceRegistry extends never ? never : "gov_site";
  const trustTier = String(form.get("trust_tier") ?? "tier_2_trusted") as "tier_1_authoritative";

  if (!url) {
    return NextResponse.redirect(new URL("/admin/sources?error=missing-url", req.url));
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.redirect(new URL("/admin/sources?error=invalid-url", req.url));
  }

  await db
    .insert(schema.sourceRegistry)
    .values({
      url,
      sourceType: sourceType as never,
      trustTier: trustTier as never,
      crawlFrequencyDays: 7,
    })
    .onConflictDoNothing({ target: schema.sourceRegistry.url });

  return NextResponse.redirect(new URL("/admin/sources", req.url));
}
