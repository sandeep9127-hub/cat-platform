# Transformation Hub — Admin & RAG Hand-off Build Plan

Goal: make the platform **runnable without a developer**. A logged-in CAT team
member can review submissions, add a landscape, and refresh the chatbot's
knowledge — with **no code changes and no redeploy**.

This covers two roadmap blocks:
- **P0 — Review console** (action the submissions the public site already collects)
- **P0.5 — Self-serve landscape + RAG management** (the "add 10 landscapes" case)

They share one foundation (auth + admin shell + the existing Neon DB), so they
should be built together.

---

## 0. The core architectural shift

Today the site is **build-time**: landscapes live in `lib/data/landscapes.ts`,
and RAG ingestion is a local script (`scripts/ingest-landscape.mjs`) a developer
runs. To hand off, the content layer must become **runtime**: content in the DB,
edited through a UI; ingestion triggered by a button.

Two new external pieces are required (both have free tiers):
1. **A background-job service** — ingestion is too slow for one web request.
2. **An auth layer** — to gate the admin.

Everything else reuses what already exists: Neon Postgres + pgvector,
Drizzle (`cat` schema), NVIDIA `nv-embedqa-e5-v5` embeddings, Kimi chat,
the `users` / `source_registry` / `entry_embeddings` tables.

---

## 1. Technology choices

| Concern | Choice | Why |
|---|---|---|
| Auth | **Auth.js v5** (email magic-link via **Resend**) | No passwords to manage; `users` table already exists; free. Allowlist = only invited emails get in. |
| Background jobs | **Inngest** | Durable multi-step functions (extract → chunk → embed → write), automatic retries, a dashboard the team can see. Free tier (50k steps/mo) far exceeds need. Alternative: **QStash** (simpler, lighter) if we want fewer moving parts. |
| File storage | **Vercel Blob** | Native to the existing Vercel project; stores uploaded PDFs/DOCX; free tier sufficient. |
| Hosting | unchanged (Vercel, `bom1`) | — |
| DB | unchanged (Neon + pgvector) | Content + vectors already here; runtime writes need no redeploy. |

No new database product. No recurring cost at current volume.

---

## 2. Data model (Drizzle migrations, `cat` schema)

Build on existing tables; add the following.

### Extend `users` (exists)
- `role` enum `['admin','editor','viewer']` (default `viewer`)
- `is_active` boolean
- `last_login_at` timestamp
Auth.js session/account tables added via its Drizzle adapter.

### `landscapes` (NEW — migrate out of `lib/data/landscapes.ts`)
```
id uuid pk, slug text unique, name text, state_code text,
lat double, lng double, summary text, description text,
investment_plan_status enum['none','in_progress','published'],
budget jsonb, is_published boolean, display_order int,
created_at, updated_at
```
The public site reads landscapes from here. Adding one = a DB insert via the UI.

### `kb_sources` (NEW — knowledge-base registry for ingested docs)
```
id uuid pk, title text, kind enum['landscape_plan','hlpe','report','other'],
landscape_id uuid fk -> landscapes (nullable),
blob_url text, content_hash varchar(64),       -- de-dup
status enum['uploaded','queued','ingesting','ingested','failed'],
chunk_count int, error text,
uploaded_by uuid fk -> users, created_at, ingested_at
```

### `entry_embeddings` (exists — the vector table)
- Add `source_id uuid fk -> kb_sources` so chunks can be **re-ingested or removed**
  per source. (Vector search in the chat routes is unchanged; new chunks are
  picked up automatically — no redeploy.)

### Review queue
`org_submissions` exists; reuse it. Add (or confirm) on it + a sibling
`contribute_submissions`:
- `status` enum `['pending','approved','rejected','changes_requested']`
- `reviewed_by uuid fk -> users`, `reviewed_at`, `review_note text`
A DB **view** `review_queue` can union org + contribute submissions for one inbox.

### `audit_log` (NEW)
```
id uuid pk, actor_user_id uuid fk -> users, action text,
entity_type text, entity_id uuid, meta jsonb, created_at
```

---

## 3. Routes

### Pages (App Router, all under `/admin`, gated by middleware)
- `/admin/login` — magic-link sign-in
- `/admin` — dashboard: pending submissions count, KB sources, recent activity
- `/admin/review` — submission inbox (org new/edit + contribute); Approve / Reject / Request changes
- `/admin/review/[id]` — **diff view** (current vs proposed) for edits
- `/admin/landscapes` — list + "Add landscape"
- `/admin/landscapes/[id]` — landscape editor form
- `/admin/knowledge` — KB registry: upload, ingest, re-ingest, remove, **test-a-query**
- `/admin/audit` — audit log

### API
- `/api/admin/auth/*` — Auth.js handlers
- `GET /api/admin/submissions`, `POST /api/admin/submissions/[id]/(approve|reject|request-changes)`
- `GET/POST/PATCH /api/admin/landscapes[/id]`
- `POST /api/admin/kb/upload` — store in Blob, create `kb_source`, compute hash
- `POST /api/admin/kb/[id]/ingest` — enqueue Inngest job
- `DELETE /api/admin/kb/[id]` — delete source + its chunks
- `POST /api/admin/kb/test` — run a RAG query in-admin (preview before publish)
- `POST /api/inngest` — Inngest serve endpoint (the ingestion function)

### Middleware
Protect `/admin/**` and `/api/admin/**`: no valid session → redirect to login.
Mutating actions check `role in ('admin','editor')`; viewers are read-only.

---

## 4. The ingestion function (Inngest)

Triggered by `POST /api/admin/kb/[id]/ingest`. Steps (each retriable):
1. **Fetch** the document from Blob.
2. **Extract** text (PDF via `pdf-parse`/`pdftotext`; DOCX via `mammoth`).
3. **De-dup**: compute `content_hash`; if unchanged from a prior ingest, stop.
4. **Chunk** (reuse the logic in `scripts/ingest-landscape.mjs`).
5. **Embed** each chunk in batches via NVIDIA `nv-embedqa-e5-v5` (1024-dim).
6. **Write** chunks to `entry_embeddings` with `source_id`; update progress.
7. **Finalize**: set `kb_sources.status='ingested'`, `chunk_count`, `ingested_at`.
On failure: status `failed` + `error`; Inngest dashboard shows the trace.

The existing `scripts/ingest-*.mjs` become the shared library this function calls,
so we are repackaging proven code, not rewriting it.

---

## 5. Phased sequence

**Phase 0 — Foundation** (unblocks everything)
Auth.js + Resend magic-link, `users.role`, `/admin` shell + middleware, `audit_log`.
*Outcome: a protected admin a team member can log into.*

**Phase 1 — Review console (P0)**
Submission inbox + diff view + approve/reject wired to live tables; new-submission
email/Slack alert.
*Outcome: every "Contribute / Add org / Suggest edit" button on the site is now
actionable by the team.*

**Phase 2 — Landscapes to DB (P0.5-A)**
Migrate `lib/data/landscapes.ts` → `landscapes` table; landscape editor UI; public
site reads from DB.
*Outcome: add/edit a landscape with no code, no redeploy.*

**Phase 3 — RAG pipeline (P0.5-B)**
Vercel Blob upload + Inngest ingestion function + `kb_sources` registry + progress +
test-query + de-dup.
*Outcome: upload a landscape plan, click Ingest, watch progress, confirm the
chatbot answers from it — all in the browser.*

**Phase 4 — Hand-off polish**
Roles enforced, rollback, one-page runbook, optional auto-ingest when a landscape
is published.
*Outcome: genuinely hand-off-able; secrets stay in Vercel env, never seen by the team.*

---

## 6. Cost

All free-tier at current volume: Neon (existing), Vercel (existing), Vercel Blob
(free tier), Inngest (free), Resend (free 3k emails/mo). No new recurring spend.

---

## 7. What already exists (reduces scope)

- `users` table (auth subject) — just needs the auth layer + role column.
- `entry_embeddings` vector table + pgvector + the embed/chat code.
- `source_registry` + triage/freshness workflow enums — an editorial-review model
  is already conceived; the admin UI surfaces it.
- `org_submissions` + the public submission/contribute forms — the data already
  flows in; only the review surface is missing.

The build is mostly **surfacing and connecting** existing pieces behind auth, plus
the one genuinely new capability: UI-triggered, background RAG ingestion.
