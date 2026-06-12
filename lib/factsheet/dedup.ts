import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export type FactSheetSummary = {
  slug: string;
  title: string;
  state_code: string | null;
  lead_organisation: string | null;
};

export type DuplicateMatch = {
  slug: string;
  title: string;
  score: number; // 0–1
  sameState: boolean;
  sameOrg: boolean;
};

const STOP = new Set([
  "a","an","the","of","in","on","at","to","for","with","and","or","by","from",
  "is","are","was","were","has","have","had","india","indian","national",
  "programme","program","project","scheme","initiative","development",
  "management","support","under","based","across","through","agriculture",
  "rural","state","district","area","region","phase","pilot","mission",
]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let n = 0;
  for (const w of sa) if (sb.has(w)) n++;
  const u = sa.size + sb.size - n;
  return u === 0 ? 0 : n / u;
}

function orgWords(s: string | null | undefined): string[] {
  if (!s) return [];
  return words(
    s.replace(/\b(ltd|limited|pvt|private|foundation|trust|society|federation|cooperative|ngo|cbo)\b/gi, ""),
  );
}

export async function getPublishedSummaries(): Promise<FactSheetSummary[]> {
  const r = await db.execute(
    sql`SELECT slug, title, state_code, lead_organisation
        FROM "cat".solution_factsheets
        WHERE status = 'published'
        ORDER BY title`,
  );
  return (r as unknown as { rows: FactSheetSummary[] }).rows;
}

export function scoreAgainst(
  title: string,
  state_code: string | null | undefined,
  lead_org: string | null | undefined,
  sheets: FactSheetSummary[],
  opts: { threshold?: number; excludeSlug?: string } = {},
): DuplicateMatch[] {
  const { threshold = 0.4, excludeSlug } = opts;
  const tw = words(title);
  const ow = orgWords(lead_org);

  return sheets
    .filter((fs) => fs.slug !== excludeSlug)
    .map((fs) => {
      const titleSim = jaccard(tw, words(fs.title));
      const sameState =
        !!state_code &&
        !!fs.state_code &&
        state_code.toLowerCase() === fs.state_code.toLowerCase();
      const sameOrg =
        ow.length > 0 &&
        orgWords(fs.lead_organisation).length > 0 &&
        jaccard(ow, orgWords(fs.lead_organisation)) >= 0.5;
      const score = Math.min(
        1,
        titleSim * 0.6 + (sameState ? 0.2 : 0) + (sameOrg ? 0.2 : 0),
      );
      return { slug: fs.slug, title: fs.title, score, sameState, sameOrg };
    })
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

export type AtlasPair = {
  a: FactSheetSummary;
  b: FactSheetSummary;
  score: number;
};

export function scanAtlasForDuplicates(
  sheets: FactSheetSummary[],
  threshold = 0.5,
): AtlasPair[] {
  const pairs: AtlasPair[] = [];
  for (let i = 0; i < sheets.length; i++) {
    for (let j = i + 1; j < sheets.length; j++) {
      const [a, b] = [sheets[i], sheets[j]];
      const matches = scoreAgainst(a.title, a.state_code, a.lead_organisation, [b], {
        threshold,
      });
      if (matches.length > 0) {
        pairs.push({ a, b, score: matches[0].score });
      }
    }
  }
  return pairs.sort((pa, pb) => pb.score - pa.score);
}
