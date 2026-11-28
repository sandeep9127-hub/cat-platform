import { NextResponse } from "next/server";
import { dashboardAccess } from "@/lib/dashboards/landscapes-phase1/access";
import { deleteDoc, listDocs, putDoc, validKey, type DocKind } from "@/lib/dashboards/userDocs";

/**
 * Private notes and saved Studio views for the "All landscapes, Phase 1"
 * dashboard. Signed-in editors keep theirs under their account; approved
 * share-link holders keep theirs under their link. Each owner sees only their own.
 * (Lives under /dashboards so the share-link cookie, scoped to that path, reaches it.)
 */
export const dynamic = "force-dynamic";
const DASH = "landscapes-phase-1";
const KINDS = new Set<DocKind>(["note", "view"]);

async function owner(): Promise<string | null> {
  const a = await dashboardAccess();
  if (!a) return null;
  if (a.kind === "editor") return a.userId ? `user:${a.userId}` : null;
  return `link:${a.link.id}`;
}

/** Same-origin check for writes (route handlers have no built-in CSRF check). */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "No access." }, { status: 401, headers: noStore });
  return NextResponse.json({ docs: await listDocs(o, DASH) }, { headers: noStore });
}

export async function PUT(req: Request) {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "No access." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  let body: { kind?: unknown; key?: unknown; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const kind = body.kind as DocKind;
  if (!KINDS.has(kind) || !validKey(body.key) || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (JSON.stringify(body.data).length > 30000) return NextResponse.json({ error: "Too long" }, { status: 413 });
  await putDoc(o, DASH, kind, body.key, body.data as Record<string, unknown>);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const o = await owner();
  if (!o) return NextResponse.json({ error: "No access." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind") as DocKind;
  const key = u.searchParams.get("key");
  if (!KINDS.has(kind) || !validKey(key)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await deleteDoc(o, DASH, kind, key);
  return NextResponse.json({ ok: true });
}
