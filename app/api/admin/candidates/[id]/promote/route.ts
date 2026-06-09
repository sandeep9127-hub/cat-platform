import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // Trigger the draft writer for this candidate.
  // In production, fire the cron handler with the candidate id.
  const draftRes = await fetch(
    new URL("/api/cron/draft-writer", _req.url).toString(),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId: id }),
    }
  );
  const _draft = await draftRes.json().catch(() => ({}));
  return NextResponse.redirect(new URL("/admin", _req.url));
}
