import { NextRequest, NextResponse } from "next/server";
import { authoriseCronRequest } from "@/lib/ingestion/run";
import { runDiscovery } from "@/lib/ingestion/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Weekly discovery agent (also runnable on demand from /admin/candidates).
 * The agent logic lives in lib/ingestion/discovery.ts so the cron and the
 * manual admin trigger share one implementation.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !authoriseCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDiscovery();
  return NextResponse.json(result, { status: result.skipped ? 503 : 200 });
}

export const POST = GET;
