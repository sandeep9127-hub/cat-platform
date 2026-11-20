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
  - At the time of writing, Vempalli was still running. Re-run the script to finish it if needed; it skips anything already imported.
- **Interventions (`scripts/load-interventions.ts`):**
  - The 10 live sheets are loaded as the approved baseline: 580 rows, ₹566.13 cr.
  - They're also indexed as searchable chunks (`scripts/index-interventions.ts`).
- **Search (`lib/rag/search.ts`):** hybrid retrieval (vector + full text, merged with reciprocal rank fusion, then reranked with Voyage `rerank-3`). Tested on real questions; about 2 seconds per query.
- **Daily Drive sync (`lib/ingest/sync.ts`, `scripts/drive-sync.ts`, `.github/workflows/drive-sync.yml`):**
  - Reports re-ingest when they change.
  - Sheet changes are staged for approval.
  - A plain-text digest goes to editors, but only when `SYNC_EMAIL=on`.
  - The GitHub Actions schedule runs at 02:30 IST and only from `main`, in a protected "production" environment.

## Next
1. Confirm Vempalli finished; run `npx tsx scripts/backfill-content-hash.ts`, then `npx tsx scripts/drive-sync.ts --dry-run` (it should report nothing changed).
2. Ask v2: Claude answers with page/section citations over `hybridSearch`, conversations, stop/new chat.
3. Admin: triage screen (approve intervention changes, discovery candidates, org submissions), full investment table with private share links, quality dashboard, daily model health check.
4. Voice (Soniox), comparison of landscapes, solution matchmaker, notes and diagrams.
5. Cutover prep: CAT Vercel project, GitHub secrets in the "production" environment, preview deploy.

## Open decisions for Sandeep
- Who receives the sync email digest. The DB currently has 2 admins and 2 editors copied from the old site.
- Vercel Pro for the CAT team, before the preview deploy.
- Patharpratima's report has no Word heading styles, so its citations are coarse. Fix the styles in the source document, or leave it as is.
- Inconsistencies found inside the revised Patratu report (government convergence ₹11.49 vs ₹11.63 cr, community contribution ₹2.73 vs ₹2.46 cr, external financing ₹38.41 cr) for the team to check.

A separate UI/UX session works on branch `feat/ui-refresh`. It doesn't touch Ask, `lib/ai` or `lib/db`.
