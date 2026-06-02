import { NextRequest, NextResponse } from "next/server";
import { insertSubmission, type Submission } from "@/lib/db/directory";

export const runtime = "nodejs";
export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 400) =>
  typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined;
const numOrNull = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const submissionType = body.submissionType === "edit" ? "edit" : "new";
  const name = str(body.name, 300);
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  // Light honeypot / contact check: an email is requested so we can verify.
  const contactEmail = str(body.contactEmail, 200);

  const submission: Submission = {
    submissionType,
    targetOrgId: str(body.targetOrgId, 64) ?? null,
    name,
    orgType: str(body.orgType, 80),
    domains: Array.isArray(body.domains)
      ? (body.domains as unknown[]).map((d) => String(d).slice(0, 120)).slice(0, 30)
      : [],
    state: str(body.state, 120),
    district: str(body.district, 120),
    subdistrict: str(body.subdistrict, 120),
    block: str(body.block, 120),
    latitude: numOrNull(body.latitude),
    longitude: numOrNull(body.longitude),
    comments: str(body.comments, 2000),
    contactPerson: str(body.contactPerson, 200),
    contactEmail,
    submitterNote: str(body.submitterNote, 2000),
  };

  try {
    await insertSubmission(submission);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "submit_failed", detail: (e as Error).message }, { status: 500 });
  }
}
