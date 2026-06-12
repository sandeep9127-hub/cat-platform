import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateFactSheet } from "@/lib/factsheet/generate";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300; // web search + extraction can take a while

/**
 * Generate a Solutions Atlas fact sheet on demand from a registered source.
 * Uses the typed programme name when given, else the source URL as the seed.
 * The engine's confidence gate decides published vs flagged.
 */
export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.redirect(new URL("/admin/sources?error=unauthorized", req.url), 303);
  }

  const form = await req.formData().catch(() => null);
  const name = String(form?.get("name") ?? "").trim();
  const url = String(form?.get("url") ?? "").trim();
  const query = name || url;
  if (!query) {
    return NextResponse.redirect(new URL("/admin/sources?gen=noquery", req.url), 303);
  }

  let result: Awaited<ReturnType<typeof generateFactSheet>>;
  try {
    result = await generateFactSheet(query);
  } catch {
    return NextResponse.redirect(new URL("/admin/sources?gen=error", req.url), 303);
  }

  if (!result.ok) {
    return NextResponse.redirect(new URL("/admin/sources?gen=norows", req.url), 303);
  }

  await writeAudit({
    actorUserId: (session?.user as { id?: string })?.id ?? null,
    actorEmail: session?.user?.email ?? null,
    action: "factsheet.generated",
    entityType: "solution_factsheet",
    entityId: result.sheet.slug,
    meta: { title: result.sheet.title, status: result.status, from: "source", sourceUrl: url },
  });

  return NextResponse.redirect(
    new URL(`/admin/sources?gen=${result.status}&slug=${encodeURIComponent(result.sheet.slug)}`, req.url),
    303,
  );
}
