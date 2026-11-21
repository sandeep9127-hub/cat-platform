import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { decideChanges } from "@/lib/admin/budget-changes";

export const runtime = "nodejs";
export const maxDuration = 120; // approval re-indexes the landscape's budget rows for Ask

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const decision = form?.get("decision")?.toString();
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be approve or reject" }, { status: 400 });
  }
  const ids = (form?.getAll("id") ?? []).map(String);
  const note = form?.get("note")?.toString() ?? null;
  const r = await decideChanges({ ids, decision, userId: user.id ?? null, note });
  const url = new URL("/admin/budget-changes", req.url);
  url.searchParams.set("done", `${decision}:${r.decided}`);
  return NextResponse.redirect(url, 303);
}
