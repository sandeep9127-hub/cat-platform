import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { FactSheet } from "@/lib/factsheet/generate";

const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";
const CHUNK_CHARS = 1100;

async function embed(text: string, inputType: "passage" | "query"): Promise<number[]> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY missing");
  const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: [text], model: EMBED_MODEL, input_type: inputType, encoding_format: "float", truncate: "END" }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

/** Flatten a fact sheet into searchable prose so Ask can answer from it. */
function factSheetText(s: FactSheet): string {
  const parts: string[] = [s.title];
  if (s.one_liner) parts.push(s.one_liner);
  if (s.summary) parts.push(s.summary);
  const i = s.insight || {};
  if (i.whats_working) parts.push(`What is working: ${i.whats_working}`);
  if (i.whats_hard) parts.push(`What is hard: ${i.whats_hard}`);
  if (i.why_it_matters) parts.push(`Why it matters: ${i.why_it_matters}`);
  if (i.whats_next) parts.push(`What is next: ${i.whats_next}`);
  if (s.metrics?.length) parts.push(s.metrics.map((m) => `${m.label}: ${m.value}`).join(". "));
  if (s.outcomes?.length) parts.push(s.outcomes.map((o) => `${o.figure ? o.figure + " — " : ""}${o.claim}`).join(". "));
  const meta = [s.lead_organisation, s.funders?.join(", "), s.district, s.state_code].filter(Boolean).join(", ");
  if (meta) parts.push(meta);
  return parts.join("\n\n");
}

function chunk(text: string): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > CHUNK_CHARS && buf) { out.push(buf); buf = p; }
    else buf = buf ? `${buf}\n\n${p}` : p;
  }
  if (buf) out.push(buf);
  return out;
}

/** (Re)embed a fact sheet into the RAG so it's answerable under Ask "All sources". */
export async function embedFactSheetIntoRag(s: FactSheet): Promise<number> {
  const chunks = chunk(factSheetText(s));
  await db.execute(sql`DELETE FROM "cat".factsheet_chunks WHERE factsheet_slug = ${s.slug}`);
  for (let idx = 0; idx < chunks.length; idx++) {
    const vec = `[${(await embed(chunks[idx], "passage")).join(",")}]`;
    await db.execute(sql`
      INSERT INTO "cat".factsheet_chunks (factsheet_slug, chunk_index, chunk_text, embedding)
      VALUES (${s.slug}, ${idx}, ${chunks[idx]}, ${vec}::vector)
    `);
  }
  return chunks.length;
}

export type FactSheetHit = { slug: string; title: string; chunkText: string; score: number };

/** Search published fact-sheet chunks by a pre-computed query embedding. */
export async function searchFactsheetChunks(queryEmbedding: number[], limit = 6): Promise<FactSheetHit[]> {
  const vec = `[${queryEmbedding.join(",")}]`;
  const r = await db.execute(sql`
    SELECT c.factsheet_slug AS slug, f.title AS title, c.chunk_text AS "chunkText",
           1 - (c.embedding <=> ${vec}::vector) AS score
    FROM "cat".factsheet_chunks c
    JOIN "cat".solution_factsheets f ON f.slug = c.factsheet_slug AND f.status = 'published'
    ORDER BY c.embedding <=> ${vec}::vector
    LIMIT ${limit}
  `);
  return (r as unknown as { rows: FactSheetHit[] }).rows;
}
