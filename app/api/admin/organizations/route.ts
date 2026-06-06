import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { updateOrgWebsite } from "@/lib/db/directory";

export const runtime = "nodejs";
export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

/** Admin-only: correct/clear an org's website (vets the auto-sourced URLs). */
export async function POST(req: NextRequest) {
  await requireAdmin();
  let body: { id?: unknown; website?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; website?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  let website = typeof body.website === "string" ? body.website.trim() : "";
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website && website.length > 300) website = website.slice(0, 300);

  try {
    await updateOrgWebsite(id, website || null);
    return NextResponse.json({ ok: true, website: website || null });
  } catch (e) {
    return NextResponse.json({ error: "update_failed", detail: (e as Error).message }, { status: 500 });
  }
}
