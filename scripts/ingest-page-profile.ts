/**
 * Project the CODE-DRIVEN landscape-page content (lib/data) into the RAG index
 * so "Ask the Hub" can answer from what's actually shown on each landscape page
 * — the at-a-glance profile facts, context, key challenges, Transformational
 * Priorities, and the Interventions list.
 *
 * NOT a duplicate of the data: lib/data stays the single source of truth; this
 * is a derived, embedded SEARCH index. Edit lib/data → re-run this script →
 * `npx tsx scripts/ingest-page-profile.ts` (optionally a slug arg for one).
 *
 * Stored as a `dataset`-type document titled "Landscape page profile (Hub)" so
 * it's idempotent and never collides with lip/budget (ingest-landscape) or the
 * Chapter-7 alignment dataset.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import dns from "node:dns";
import { LANDSCAPES } from "../lib/data/landscapes";
import { LANDSCAPE_PRIORITIES } from "../lib/data/landscape-priorities";
import { LANDSCAPE_INTERVENTIONS } from "../lib/data/landscape-interventions";

dns.setDefaultResultOrder("verbatim");

const DOC_TITLE = "Landscape page profile (Hub)";
const NVIDIA_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_KEY) throw new Error("NVIDIA_API_KEY missing");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 4,
});

async function embedOne(text: string, attempt = 0): Promise<number[]> {
  const MAX = 6;
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${NVIDIA_KEY}` },
      body: JSON.stringify({
        input: [text],
        model: "nvidia/nv-embedqa-e5-v5",
        input_type: "passage",
        encoding_format: "float",
        truncate: "END",
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < MAX) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20_000)));
        return embedOne(text, attempt + 1);
      }
      throw new Error(`Embed ${res.status}: ${body}`);
    }
    return (await res.json()).data[0].embedding as number[];
  } catch (e) {
    if (attempt < MAX && /fetch failed|network|ECONN|ETIMEDOUT|socket|terminated/i.test(String((e as Error)?.message || e))) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20_000)));
      return embedOne(text, attempt + 1);
    }
    throw e;
  }
}

/** Build the readable text chunks rendered on a landscape page. */
function chunksFor(slug: string): { text: string; section: string }[] {
  const p = LANDSCAPES[slug];
  if (!p) return [];
  const out: { text: string; section: string }[] = [];
  const sec = (s: string) => `Landscape page · ${p.name} / ${s}`;

  out.push({
    section: sec("At a glance"),
    text: `${p.name} landscape — at a glance. District: ${p.district}. Region: ${p.region}. Geographical area: ${p.area}. Population: ${p.population}. Households: ${p.households}. Inhabited villages: ${p.villages}. Agro-climatic zone: ${p.agroclimaticZone}.`,
  });
  out.push({
    section: sec("Context"),
    text: `${p.name} — context. ${p.gloss} ${p.bodyContext}`,
  });
  if (p.keyChallenges?.length) {
    out.push({
      section: sec("Key challenges"),
      text: `${p.name} — key challenges. ` + p.keyChallenges.map((c, i) => `(${i + 1}) ${c}`).join(" "),
    });
  }
  const priorities = LANDSCAPE_PRIORITIES[slug];
  if (priorities?.length) {
    out.push({
      section: sec("Transformational priorities"),
      text: `${p.name} — landscape transformational priorities. ` + priorities.map((x, i) => `(${i + 1}) ${x}`).join(" "),
    });
  }
  const groups = LANDSCAPE_INTERVENTIONS[slug];
  if (groups?.length) {
    for (const g of groups) {
      out.push({
        section: sec(`Interventions · ${g.category}`),
        text: `${p.name} — planned interventions in ${g.category}. ` + g.items.map((it) => `${it.title}: ${it.body}`).join(" "),
      });
    }
  }
  return out;
}

async function ingestSlug(slug: string): Promise<number> {
  const chunks = chunksFor(slug);
  if (!chunks.length) return 0;
  // Idempotent: clear this projection's prior doc(s) for the slug (chunks cascade).
  await pool.query(
    `DELETE FROM "cat".landscape_documents WHERE landscape_slug = $1 AND type = 'dataset' AND title = $2`,
    [slug, DOC_TITLE]
  );
  const { rows } = await pool.query(
    `INSERT INTO "cat".landscape_documents (landscape_slug, title, type, language, publication_year, is_published)
     VALUES ($1, $2, 'dataset', 'english', 2026, true) RETURNING id`,
    [slug, DOC_TITLE]
  );
  const docId = rows[0].id as string;
  const embs = await Promise.all(chunks.map((c) => embedOne(c.text)));
  const params: unknown[] = [];
  const values = chunks
    .map((c, j) => {
      const b = j * 6;
      params.push(docId, slug, j, c.text, c.section, `[${embs[j].join(",")}]`);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, 'narrative'::"cat".landscape_chunk_kind, $${b + 5}, $${b + 6}::vector)`;
    })
    .join(",");
  await pool.query(
    `INSERT INTO "cat".landscape_document_chunks
       (document_id, landscape_slug, chunk_index, chunk_text, chunk_kind, section_path, embedding)
     VALUES ${values}`,
    params
  );
  return chunks.length;
}

async function main() {
  const only = process.argv[2];
  const slugs = only ? [only] : Object.keys(LANDSCAPES);
  let total = 0;
  for (const slug of slugs) {
    const n = await ingestSlug(slug);
    total += n;
    console.log(`  ${slug.padEnd(20)} ${n} page chunks`);
  }
  console.log(`\n✓ Done. ${total} landscape-page chunks across ${slugs.length} landscapes.`);
  await pool.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
