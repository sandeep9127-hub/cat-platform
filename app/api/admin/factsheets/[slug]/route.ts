import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getFactSheet, type FactSheet, type FactSheetRow } from "@/lib/factsheet/generate";
import { normalizeCategorySlugs } from "@/lib/data/categories";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const SCALE_BANDS = new Set([
  "pilot", "block", "district", "multi_district", "state", "multi_state", "national",
]);

function toStringArray(value: FormDataEntryValue | null): string[] {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Edit an auto-generated fact sheet. Admin/editor gated (mirrors the generate
 * route). Validates the submitted fields, preserves existing values when a
 * JSON field fails to parse, re-embeds the sheet into the RAG so Ask stays in
 * sync, writes an audit entry, and marks the row human-edited.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const existing = await getFactSheet(slug, { includeUnpublished: true });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const form = await req.formData();

  const title = String(form.get("title") || existing.title).slice(0, 200);
  const one_liner = String(form.get("one_liner") || "").trim() || null;
  const summary = String(form.get("summary") || "").trim() || null;
  const lead_organisation = String(form.get("lead_organisation") || "").trim() || null;
  const district = String(form.get("district") || "").trim() || null;
  const state_code = String(form.get("state_code") || "").trim().toUpperCase().slice(0, 2) || null;
  const source_name = String(form.get("source_name") || "").trim() || null;
  const source_url = String(form.get("source_url") || "").trim() || null;

  const rawScale = String(form.get("scale_band") || "").trim();
  const scale_band = SCALE_BANDS.has(rawScale) ? rawScale : existing.scale_band;

  const rawYear = String(form.get("start_year") || "").trim();
  const yearNum = rawYear ? Number.parseInt(rawYear, 10) : NaN;
  const start_year = Number.isInteger(yearNum) ? yearNum : null;

  // Categories arrive as one checkbox value per slug (the edit form) but we
  // also tolerate a legacy comma-separated string. Canonicalise either shape
  // against the controlled vocabulary so a stray "Fisheries" can never save as
  // a slug the Atlas filter and counts won't match.
  const rawThemes = form.getAll("themes").flatMap((v) => String(v).split(","));
  const themes = normalizeCategorySlugs(rawThemes);
  const principle_alignment = toStringArray(form.get("principle_alignment"));

  const insight = {
    whats_working: String(form.get("whats_working") || "").trim() || null,
    whats_hard: String(form.get("whats_hard") || "").trim() || null,
    why_it_matters: String(form.get("why_it_matters") || "").trim() || null,
    whats_next: String(form.get("whats_next") || "").trim() || null,
  };

  // metrics / outcomes are edited as raw JSON; keep the existing value on any
  // parse error so a bad paste can never blank a cited field.
  let metrics = existing.metrics;
  const rawMetrics = String(form.get("metrics") || "").trim();
  if (rawMetrics) {
    try {
      const parsed = JSON.parse(rawMetrics);
      if (Array.isArray(parsed)) metrics = parsed as FactSheet["metrics"];
    } catch {
      /* keep existing */
    }
  }

  let outcomes = existing.outcomes;
  const rawOutcomes = String(form.get("outcomes") || "").trim();
  if (rawOutcomes) {
    try {
      const parsed = JSON.parse(rawOutcomes);
      if (Array.isArray(parsed)) outcomes = parsed as FactSheet["outcomes"];
    } catch {
      /* keep existing */
    }
  }

  const actorEmail = session?.user?.email ?? null;

  // jsonb columns: cast ::jsonb on a JSON.stringify'd value (mirrors generate.ts).
  await db.execute(sql`
    UPDATE "cat".solution_factsheets SET
      title=${title},
      one_liner=${one_liner},
      summary=${summary},
      lead_organisation=${lead_organisation},
      district=${district},
      state_code=${state_code},
      start_year=${start_year},
      scale_band=${scale_band},
      themes=${JSON.stringify(themes)}::jsonb,
      principle_alignment=${JSON.stringify(principle_alignment)}::jsonb,
      metrics=${JSON.stringify(metrics)}::jsonb,
      outcomes=${JSON.stringify(outcomes)}::jsonb,
      insight=${JSON.stringify(insight)}::jsonb,
      source_name=${source_name},
      source_url=${source_url},
      edited_by_human=true,
      last_edited_at=now(),
      last_edited_by=${actorEmail},
      updated_at=now()
    WHERE slug=${slug}
  `);

  // Re-fetch the saved row and re-embed into the RAG so Ask stays in sync.
  // Best-effort: a failed embed must not fail the save.
  const saved = await getFactSheet(slug, { includeUnpublished: true });
  if (saved) {
    try {
      const { embedFactSheetIntoRag } = await import("@/lib/factsheet/rag");
      await embedFactSheetIntoRag(rowToFactSheet(saved));
    } catch (e) {
      console.error("[factsheet] RAG re-embed failed for", slug, (e as Error).message);
    }
  }

  await writeAudit({
    actorUserId: (session?.user as { id?: string })?.id ?? null,
    actorEmail,
    action: "factsheet.edited",
    entityType: "solution_factsheet",
    entityId: slug,
  });

  // Redirect back to the list (the edit page posts a plain HTML form).
  return NextResponse.redirect(new URL("/admin/factsheets", req.url), { status: 303 });
}

/** Map a snake_case DB row to the FactSheet shape the RAG embedder expects. */
function rowToFactSheet(r: FactSheetRow): FactSheet {
  return {
    slug: r.slug,
    title: r.title,
    one_liner: r.one_liner,
    summary: r.summary,
    state_code: r.state_code,
    district: r.district,
    latitude: r.latitude,
    longitude: r.longitude,
    themes: Array.isArray(r.themes) ? r.themes : [],
    scale_band: r.scale_band,
    lead_organisation: r.lead_organisation,
    implementers: Array.isArray(r.implementers) ? r.implementers : [],
    funders: Array.isArray(r.funders) ? r.funders : [],
    principle_alignment: Array.isArray(r.principle_alignment) ? r.principle_alignment : [],
    start_year: r.start_year,
    metrics: Array.isArray(r.metrics) ? r.metrics : [],
    insight: r.insight ?? {
      whats_working: null, whats_hard: null, why_it_matters: null, whats_next: null,
    },
    outcomes: Array.isArray(r.outcomes) ? r.outcomes : [],
    citations: Array.isArray(r.citations) ? r.citations : [],
    source_name: r.source_name,
    source_url: r.source_url,
    confidence: r.confidence,
  };
}
