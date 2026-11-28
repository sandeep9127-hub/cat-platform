import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteDoc, listDocs, putDoc, validKey, type DocKind } from "@/lib/dashboards/userDocs";

/**
 * Private notes and saved Studio views for the "All landscapes, Phase 1"
 * dashboard. Signed-in editors and admins only (middleware gates /api/admin;
 * checked again here). Each person reads and writes only their own documents.
 */
export const dynamic = "force-dynamic";
const DASH = "landscapes-phase-1";
const KINDS = new Set<DocKind>(["note", "view"]);

async function me(): Promise<string | null> {
  const s = await auth();
  const u = s?.user as { id?: string; role?: string } | undefined;
  return u?.id && (u.role === "admin" || u.role === "editor") ? u.id : null;
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

export async function GET() {
  const id = await me();
  if (!id) return NextResponse.json({ error: "Sign in to see your notes and views." }, { status: 401 });
  return NextResponse.json({ docs: await listDocs(id, DASH) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const id = await me();
  if (!id) return NextResponse.json({ error: "Sign in to save." }, { status: 401 });
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
  await putDoc(id, DASH, kind, body.key, body.data as Record<string, unknown>);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = await me();
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind") as DocKind;
  const key = u.searchParams.get("key");
  if (!KINDS.has(kind) || !validKey(key)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await deleteDoc(id, DASH, kind, key);
  return NextResponse.json({ ok: true });
}
