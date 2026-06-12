import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const reason = form?.get("reason")?.toString() ?? null;
  await db
    .update(schema.discoveryCandidates)
    .set({ status: "dismissed", triagedAt: new Date(), dismissalReason: reason })
    .where(eq(schema.discoveryCandidates.id, id));
  return NextResponse.redirect(new URL("/admin/candidates", req.url), 303);
}
