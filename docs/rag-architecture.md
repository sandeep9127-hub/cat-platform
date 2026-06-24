# Transformation Hub — RAG Architecture

> How "Ask the Hub" works: a grounded, cite-or-refuse retrieval-augmented
> generation system over the CAT curated corpus.

## The core principle

It's a **grounded, cite-or-refuse RAG**: every answer is built *only* from the
Hub's curated corpus — never the open web — and if nothing in the corpus clears a
relevance threshold, the model is **never called** and the user gets an honest
refusal. That guarantee is what makes "source-verified" true rather than
aspirational.

## 1. Models

- **Embeddings:** NVIDIA-hosted `nv-embedqa-e5-v5` (1024-dim). Documents are
  embedded as `passage`, user queries as `query` (asymmetric retrieval).
- **Generation:** **Kimi K2**, NVIDIA-hosted, streamed. (A separate fact-sheet
  *authoring* pipeline uses OpenRouter / Gemini Flash, but that is content
  creation, not the live Ask path.)

## 2. Storage — Neon Postgres + `pgvector` (schema `cat`)

| Table | Role |
|---|---|
| `landscape_documents` | One row per source per landscape (`type`: lip · budget · climate · dataset…; `is_published`). |
| `landscape_document_chunks` | The vector index: `chunk_text`, `chunk_kind` (narrative / budget_summary / climate_summary / …), `section_path`, `embedding vector(1024)`, FK to the document (cascade-deletes on re-ingest). |
| `factsheet_chunks` | Solutions Atlas fact sheets embedded for Ask. |
| `entries` | Full-text-search (FTS) records. |

Similarity = pgvector **cosine distance** (`embedding <=> query`).

## 3. Write path — ingestion (how content enters the index)

| Source | Tool | Becomes |
|---|---|---|
| LIP report (`.docx`) | `scripts/ingest-landscape.mjs` (mammoth → markdown → section chunks) | `narrative` chunks |
| Budget (5.2 `.xlsx`) | same | `landscape_budget_lines` table + per-package `budget_summary` chunks |
| C-GEM climate workbook | `scripts/ingest-climate.mjs` | `climate_summary` chunk |
| Chapter-7 alignment matrices | `scripts/ingest-alignment.mjs` | `narrative` chunks (dataset doc) |
| Landscape **page** content (`lib/data`: profile, priorities, interventions, **budget overview**) | `scripts/ingest-page-profile.ts` | projected `narrative` chunks — a derived index, **not a data copy** (`lib/data` stays the source of truth; re-run after edits) |
| Fact sheets | `lib/factsheet/rag.ts` (on publish) | `factsheet_chunks` |
| In-app admin upload | `lib/landscape/ingest.ts` (Vercel Blob → unpdf / mammoth) | `narrative` chunks |

Embedding is batched with exponential-backoff retries (the NVIDIA endpoint
occasionally 5xx's mid-batch). Ingestion is idempotent per landscape slug.

## 4. Read path — `/api/agent` (one engine, two surfaces)

1. **Embed the query** (NVIDIA `query` input type).
2. **Federated retrieval in parallel** across three legs:
   - `searchLandscapeChunks` (pgvector) — scoped to one landscape *or* all ingested landscapes,
   - `searchFactsheetChunks` (only in the "all sources" scope),
   - `searchEntries` (FTS).
3. **Normalise scores** across the legs so they're comparable, merge, rank → top
   citations (numbered `[1]…[N]`) + a labelled `contextBlock`.
4. **Refusal floor:** if there are zero hits, or `topScore < threshold`, return a
   refusal — **no LLM call** (the no-hallucination guarantee).
5. **Generate:** Kimi K2 with a system prompt that states *"the numbered passages
   are the only source material; cite with `[1]`, `[2]` immediately after the
   sentence that uses them."* Streamed over SSE: `meta` (citations) → `delta`
   (text) → `done`.
6. **Frontend** renders the streamed answer with **inline citation chips** linking
   to the source tray, plus **Copy** and **Visualize**.

**Scope:** "All sources" federates the whole library; a landscape scope
(`/agent?scope=<slug>`, used by the per-landscape "Ask [X]" tab, which redirects
here) restricts retrieval to that landscape's chunks.

## 5. Guardrails

- Hard **refuse-below-threshold** (the no-hallucination floor).
- Per-IP **rate limit** (~10 questions/min) + a **daily turn ceiling**
  (`AGENT_DAILY_TURNS`) + a per-session turn cap.
- "Reads only from the library, not the web" — stated in the UI and enforced by
  the retrieval design.

## 6. One knowledge base, many uses

The same indexed corpus powers **Ask the Hub**, the **per-landscape Ask**, and
(via the structured budget data + these chunks) the **Visualize** charts — and the
**Solutions Atlas** and Ask share the fact-sheet index. Add a source and it becomes
searchable everywhere, with no code change.

---

### Flow at a glance

```
              ┌─────────────────────────── INGEST (write) ───────────────────────────┐
  LIP .docx ─┐                                                                        │
  Budget xlsx ┤                                                                        │
  C-GEM xlsx  ┤── parse ──► chunk ──► embed (NVIDIA passage) ──► pgvector index        │
  Ch-7 matrix ┤                          landscape_document_chunks / factsheet_chunks  │
  lib/data    ┤  (projection, not a copy)                                              │
  Fact sheets ┘                                                                        │
              └───────────────────────────────────────────────────────────────────────┘

  Question ─► embed (query) ─► federated retrieve (landscape ∥ factsheet ∥ FTS)
            ─► normalise + rank ─► [score < floor? ──► REFUSE, no LLM]
            ─► Kimi K2 (passages only, cite [n]) ─► stream ─► answer + inline citations
```
