import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runDiscovery } from "@/lib/ingestion/discovery";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Manual "Run discovery now" — same agent as the weekly cron, triggered by an editor. */
export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.redirect(new URL("/admin/candidates?disc=unauth", req.url), 303);
  }

  let result: Awaited<ReturnType<typeof runDiscovery>>;
  try {
    result = await runDiscovery("manual");
  } catch {
    return NextResponse.redirect(new URL("/admin/candidates?disc=error", req.url), 303);
  }

  if (result.skipped) {
    return NextResponse.redirect(new URL("/admin/candidates?disc=skipped", req.url), 303);
  }

  const found = Number(result.yielded ?? 0);
  await writeAudit({
    actorUserId: (session?.user as { id?: string })?.id ?? null,
    actorEmail: session?.user?.email ?? null,
    action: "discovery.run_manual",
    entityType: "ingestion_run",
    entityId: typeof result.id === "string" ? result.id : null,
    meta: { found },
  });

  return NextResponse.redirect(new URL(`/admin/candidates?disc=ok&found=${found}`, req.url), 303);
}
