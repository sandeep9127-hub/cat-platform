/**
 * The single embeddings client for the Hub's RAG (Voyage AI).
 *
 * Anthropic has no embeddings API; Voyage is its recommended partner. We use
 * voyage-4 at 1024 dimensions so vectors fit the existing vector(1024)
 * columns. Queries and documents are embedded with different input_type
 * values, so always use embedQuery() for questions and embedDocuments() for
 * chunks being stored.
 *
 * Replaced NVIDIA nv-embedqa-e5-v5, which NVIDIA retired on 2026-08-25.
 * Vectors from the two models are not comparable: anything stored with the
 * old model must be re-embedded (scripts/reembed-chunks.ts).
 */

export const EMBED_MODEL = process.env.EMBED_MODEL?.trim() || "voyage-4";
export const EMBED_DIM = 1024;

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 64;
const MAX_RETRIES = 5;

export function embeddingsEnabled(): boolean {
  return !!process.env.VOYAGE_API_KEY;
}

type InputType = "query" | "document";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callVoyage(input: string[], inputType: InputType): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY missing");

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        input,
        model: EMBED_MODEL,
        input_type: inputType,
        output_dimension: EMBED_DIM,
        truncation: true,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }
    // Rate limits and transient server errors: back off and retry.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`Voyage embed failed: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
}

/** Embed one search question. */
export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await callVoyage([text.slice(0, 4000)], "query");
  return v;
}

/** Embed chunks for storage, in batches. Order of the result matches the input. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...(await callVoyage(texts.slice(i, i + BATCH_SIZE), "document")));
  }
  return out;
}

/** pgvector literal for a vector, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
