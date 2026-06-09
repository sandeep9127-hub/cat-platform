import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const url = String(form.get("url") ?? "").trim();
  const sourceType = String(form.get("source_type") ?? "other") as
    | "gov_site" | "ngo_site" | "research_inst" | "foundation"
    | "news_outlet" | "partner_report" | "other";
  const trustTier = String(form.get("trust_tier") ?? "tier_2_trusted") as
    | "tier_1_authoritative" | "tier_2_trusted" | "tier_3_emerging";

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
      sourceType,
      trustTier,
      crawlFrequencyDays: 7,
    })
    .onConflictDoNothing({ target: schema.sourceRegistry.url });

  return NextResponse.redirect(new URL("/admin/sources", req.url));
}
