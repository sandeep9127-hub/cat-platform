# Checkpoint: 20 Nov 2026 (night)

Branch `feat/claude-model-routing`, all work committed. The live site and production database are untouched.

## Done
- **Step 1 (AI):** all LLM calls go to Claude through `lib/ai/claude.ts`. Task-to-model routing is in `lib/ai/models.ts`. There are daily spending caps, a cost log, and security fixes.
- **New CAT stack (not live):**
  - Neon org database "CAT hub" (`DATABASE_URL_CAT`), holding the app tables copied from production and the v2 schema (`drizzle/sql/2026-11-20_*.sql`).
  - Cloudflare R2 bucket `cat-hub-documents`, private, with upload rules (CORS) set.
  - Voyage embeddings and reranking.
  - Soniox key.
  - Google service account `cat-hub-drive-reader@cat-hub-515317.iam.gserviceaccount.com`, with Viewer access to the Drive "Final folder".
- **Ingestion pipeline (`lib/ingest/*`):**
  - DOCX parser that skips images and takes page numbers from Word's saved markers.
  - Section-aware chunking.
  - A context line per chunk from Haiku.
  - Voyage embeddings.
  - Version comparison by Sonnet.
  - Transactional publish, then deletion of the old version (only the change summary is kept).
- **First import (`scripts/import-final-folder.ts`):**
  - 10 landscape reports, about 5,000 chunks, about $1.50 in total.
  - Chitrakonda, Patratu, Rajnagar and Vempalli have "changes since August" summaries.
  - Complete: 10 documents and 4,984 report chunks, plus 580 intervention chunks. AI spend was $1.57, and the content fingerprints are filled in.
- **Interventions (`scripts/load-interventions.ts`):**
  - The 10 live sheets are loaded as the approved baseline: 580 rows, ₹566.13 cr.
  - They're also indexed as searchable chunks (`scripts/index-interventions.ts`).
- **Search (`lib/rag/search.ts`):** hybrid retrieval (vector + full text, merged with reciprocal rank fusion, then reranked with Voyage `rerank-3`). Tested on real questions; about 2 seconds per query.
- **Daily Drive sync (`lib/ingest/sync.ts`, `scripts/drive-sync.ts`, `.github/workflows/drive-sync.yml`):**
  - Reports re-ingest when they change.
  - Sheet changes are staged for approval.
  - A plain-text digest goes to editors, but only when `SYNC_EMAIL=on`.
  - The GitHub Actions schedule runs at 02:30 IST and only from `main`, in a protected "production" environment.

## Next (tomorrow morning: "continue working")
0. **Solutions Atlas map (agreed 20 Nov):** dot density plus zoomable clusters, no three.js.
   - The drawing was briefed to the UI session (branch `feat/ui-refresh`; it covers only `/map` and the home-page Atlas, not the Organisations map).
   - My side is the data. Download datameet `Districts/Census_2011/2011_Dist` (.shp ~10.3 MB + .dbf ~55 KB, public domain) **once Sandeep says yes**.
   - Then compute district centroids, store them in `cat.geographies` (CAT DB), and add `geo_precision` ('district' | 'state' | 'national'), lat/lon and a points list to `solution_factsheets`.
   - National and multi-state programmes go off the map into a "Nationwide (N)" strip.
1. Run `npx tsx scripts/drive-sync.ts --dry-run`. It should report nothing changed.
2. Ask v2: Claude answers with page/section citations over `hybridSearch`, conversations, stop/new chat.
3. Admin: triage screen (approve intervention changes, discovery candidates, org submissions), full investment table with private share links, quality dashboard, daily model health check.
4. Voice (Soniox), comparison of landscapes, solution matchmaker, notes and diagrams.
5. Cutover prep: CAT Vercel project, GitHub secrets in the "production" environment, preview deploy.

## 21 Nov progress
- Step 1 done: `scripts/drive-sync.ts --dry-run` reports 0 changes, 0 problems (19s).
- Step 0 data done (commit 7e652e0): 641 district centroids in `cat.district_centroids` (cat.geographies untouched); a trigger sets `geo_precision`, `geo_points`, latitude/longitude on every fact sheet (8 district, 32 state, 19 national). Re-run `npx tsx scripts/load-districts.ts` after adding aliases. UI session told the field names.
- Fact sheet duplicates merged (Sandeep approved): 52 published + 7 `merged` (`merged_into` set; old links 307 to the kept sheet; `scripts/merge-duplicate-factsheets.ts`).
- Step 3 admin done (CAT DB; admin pages need sign-in, so they were tested through their data functions plus the public share page in a browser):
  - `/admin/budget-changes`: approve or reject sheet edits (Server Action, locked transaction, triage events, re-index for Ask).
  - `/admin/budget-tables` (+ `/[slug]`, `/all`): full 45-column approved tables; private share links (token shown once, sha256 stored, expiry ≤1 year, revoke, optional CSV, views logged). Public page `/share/<token>` (noindex, no-referrer, rate-limited). **Needs `NEXT_PUBLIC_SITE_URL` on the deployment** to create links.
  - `/admin/quality`: spend vs caps, service health, Ask v2 stats, queues, sync runs, library reports.
  - Nightly model health check (`scripts/model-health.ts`) in the Drive sync workflow; needs GitHub secret `SONIOX_API_KEY` too.
- Found: only 3 of 10 reports have page numbers (Dantewada, Patratu, Rajnagar); the rest cite by section. Told the AI session (PDF export via Drive is the likely fix). 182 discovery candidates are waiting in /admin/candidates.
- Local dev against the CAT DB: launch config `cat-hub-v2-admin` (port 3200, `scripts/dev-cat.mjs`).
- Architecture whiteboard: https://claude.ai/artifact/SZw46XxNtif7JHkhFLeqGt
- Enhanced AI features (Ask v2 onwards) move to a fresh session. Notes for it:
  - Today `/api/agent` (`app/api/agent/route.ts`) still uses the legacy retrieval (entries FTS + old landscape/factsheet chunk tables). `components/agent/AgentChat.tsx` posts `{sessionToken, messages, scope}` and reads SSE events `meta {citations}`, `delta {text}`, `done {refused}`, `error`.
  - Plan: put v2 behind an `ASK_V2=on` env flag so the legacy path stays intact for the live site. v2 = `hybridSearch` (lib/rag/search.ts) -> Claude Haiku stream with citations carrying document, section path and page; a rerank-score refusal floor (calibrate on real questions); server-issued httpOnly session cookie, stored only as sha256 in `cat.conversations.session_token_hash`; history loaded from `cat.messages` (not trusted from the client); partial answer saved with `interrupted = true` when the reader presses Stop; "New chat" = new conversation id. Keep the SSE event shape so AgentChat keeps working, adding `conversationId` to `meta`.
  - Check whether fact-sheet and entry embeddings in the CAT DB are Voyage-compatible before mixing them into v2 retrieval.
  - No `psql` on this Mac: query the CAT DB with a small `npx tsx` script placed inside the repo (imports of `@/lib/db` don't resolve from the scratchpad).
- **Ask v2 built (behind `ASK_V2=on`, off by default; the legacy `/api/agent` path is unchanged):**
  - `lib/ask/v2.ts`: optional follow-up rewrite (Haiku, `ask_rewrite`), then `hybridSearch`, then the refusal floor, then Claude Haiku (`ask_v2`, thinking off) with each passage as a `search_result` block. Native citations become `[n]` markers placed at the end of the cited text, so every marker points at a passage Claude actually cited. Citations carry document, section path and page.
  - Refusal floor **0.55** on the top rerank score, from `scripts/calibrate-ask-floor.ts`: 20 real questions scored 0.61–0.93 (median 0.89); 10 off-topic ones 0.25–0.49. Below the floor, Claude isn't called.
  - `lib/ask/session.ts` + `lib/ask/store.ts`: httpOnly `cat_ask_sid` cookie (SameSite=Lax, path `/api/agent`), stored only as sha256. Every read is scoped to that hash, so an unknown or someone else's conversation id starts a new conversation. History comes from `cat.messages`, never from the client.
  - Stop saves the partial answer with `interrupted = true`. New chat starts a new conversation. `GET /api/agent?history=latest` restores the latest conversation after a refresh.
  - SSE contract unchanged (meta/delta/done/error), with `conversationId` added to `meta`.
  - Measured locally: sources about 2 s, first word about 3 s, full answer 4–6 s; follow-ups about 3 s longer because of the rewrite. About $0.0015 per answer.
  - Dev against the CAT DB: `node scripts/dev-cat.mjs` (launch config `cat-hub-v2`, port 3100) sets `DATABASE_URL=$DATABASE_URL_CAT` for that process only.
  - Known gaps: "what changed" questions score low (0.66) because change summaries live in `version_diffs`, not in `chunks`. Multi-landscape comparisons (0.61) need per-landscape retrieval, which is the Compare feature's job. Citation links go to `/landscape/<slug>` until the page viewer exists.
- **UI/UX research running in parallel** (separate session): Refero search, then curated ideas, then clickable demos for Sandeep to agree or disagree with, covering the Ask entry points ("Ask the Hub doesn't invite people to chat"), the Ask page, Compare, Matchmaker, notes/charts and voice.

## Open decisions for Sandeep
- Who receives the sync email digest. The DB currently has 2 admins and 2 editors copied from the old site.
- Vercel Pro for the CAT team, before the preview deploy.
- Patharpratima's report has no Word heading styles, so its citations are coarse. Fix the styles in the source document, or leave it as is.
- Vempalli's revised LIP was only partly updated: Chapter 1 still says ₹83.48 cr, 29 villages and 9,100 households, while Chapter 4 and the live sheet say ₹78.43 cr and 8,885 households. Its Connectivity score is also given as 2.5 in one chapter and 2.3 in another.
- Inconsistencies found inside the revised Patratu report (government convergence ₹11.49 vs ₹11.63 cr, community contribution ₹2.73 vs ₹2.46 cr, external financing ₹38.41 cr) for the team to check.

A separate UI/UX session works on branch `feat/ui-refresh`. It doesn't touch Ask, `lib/ai` or `lib/db`.
