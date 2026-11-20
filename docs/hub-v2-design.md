# CAT Hub v2: design

*Draft for review, 20 Nov 2026. Branch `feat/claude-model-routing`. Nothing here touches the live site until the cutover step, which needs your approval.*

## 1. Ground rules

1. **The live site is never touched during the build.** All work happens on the feature branch, Neon test branches and the new CAT database. Production is only read, never written.
2. **Sustainable by design.**
   - Only paid production services with published retirement policies (Anthropic, Voyage, Soniox, Neon, Vercel, Cloudflare R2). No free "preview" endpoints.
   - Every outside service has a fallback.
   - Every original file and every parse result lives in R2, so anything can be rebuilt with a script.
   - A daily health check emails CAT when a model fails or is retired.
3. **Grounded or silent.** Public AI answers come only from the library and always cite document and page. With no source, there is no answer.
4. **Budgets are enforced in code.** Every AI call checks a daily cap and logs its cost.

## 2. Where things run

| Job | Service | Owner |
|---|---|---|
| Website, API, background jobs | Vercel (Next.js), CAT team `agroecologyindia`, Pro plan | CAT |
| Database: app data, chunks, vectors, keyword search, job queue | Neon Postgres, CAT org, project "CAT hub" | CAT |
| Original files, parsed text, exports, images | Cloudflare R2 (S3-compatible), CAT account | CAT |
| Answers, parsing hard pages, summaries, diagrams | Claude (Haiku 5.5 / Sonnet 5.5, set per task in `lib/ai/models.ts`) | CAT key |
| Embeddings and reranking | Voyage `voyage-4` (1024-d) + `rerank` | CAT key |
| Voice | Soniox `stt-rt-v6` (listen) + `tts-rt-v2` (speak) | CAT key |
| Email alerts | Resend (already in the app) | CAT |

**Fallbacks**

| Service | Fallback |
|---|---|
| Claude | Change one line to the successor model; Anthropic publishes retirement notices in advance. |
| Voyage | Open-weight `voyage-4-nano` produces compatible vectors (to be verified before relying on it). |
| Soniox | Retired models are automatically routed to the next version; browser speech as a last resort. |
| R2 | R2 uses the S3 API, so the code works with any S3 store. |
| Neon | A standard Postgres dump moves the database to any Postgres host. |

## 3. Database schema (new CAT database)

**Copied from production as-is.** These are small, under 120 MB in total:
- users, accounts and sessions;
- entries and their link tables;
- organisations and the directory;
- solution fact sheets;
- themes, news and resources;
- geographies;
- the landscape budget and climate tables;
- discovery candidates, submissions, audit log and source registry.

**Not copied:** `landscape_document_chunks`, `landscape_documents` and `factsheet_chunks`. They are 94% base64 image junk and are rebuilt from the new data.

**New tables:**

```
documents            one row per logical document (e.g. "Rajnagar LIP")
  id, landscape_slug, title, doc_type, language, current_version_id, created_by, created_at

document_versions    every upload of a document; only one is current
  id, document_id, version_no, label ("Draft Feb 2026", "Revised Jun 2026"),
  r2_original_key, r2_parsed_key, sha256 (duplicate guard), mime, bytes, page_count,
  status (uploaded → parsing → chunking → enriching → embedding → ready | failed | superseded),
  is_current, parser, parser_version, error, uploaded_by, created_at

document_pages       parsed text per page; used for "show me page 12" and highlighting
  version_id, page_no, text, method (text | claude_vision), char_count

sections             heading tree per version
  id, version_id, parent_id, heading, level, page_start, page_end, path

chunks               the searchable units
  id, version_id, document_id, landscape_slug, section_id, chunk_index,
  text, context (Claude's 1–2 line "where this sits"), kind (narrative | table | budget | figure),
  page_start, page_end, token_count, is_current,
  tsv tsvector (generated from context + text; GIN index),
  embedding vector(1024) (HNSW index), embedding_model, created_at

version_diffs        "what changed" between two versions
  from_version_id, to_version_id, summary_md, changes jsonb, model, created_at

landscape_briefs     generated 2-page briefs, cached until the source versions change
  landscape_slug, source_versions_hash, content_md, citations jsonb, r2_pdf_key, created_at

jobs                 background job queue (Postgres SKIP LOCKED; no extra service)
  id, kind, payload jsonb, status, attempts, run_after, locked_at, error, created_at

conversations        Ask sessions (text or voice)
  id, session_token, mode (text | voice), language, started_at, cost_usd
messages
  id, conversation_id, role, content, citations jsonb, artifacts jsonb (charts, diagrams, notes),
  interrupted bool, created_at

ai_usage             per-call cost log (already built in step 1)
model_health         daily check results: provider, model, ok, latency_ms, error, checked_at
eval_questions       30–50 real questions with expected answers and source pages
eval_runs / eval_results   scores per run, so every change is measured
```

**Triage: one queue instead of two.**

Today there are two triage systems:
- The **live** one: discovery candidates become fact sheets, and organisation submissions add to the directory.
- An **abandoned** one: draft entries and `submissions`. It has no screens, so contributor submissions are never reviewed.

Neither system has ownership, bulk actions, ageing or notifications. v2 keeps the triage you use and makes it manageable:

```
triage_items         one queue for every kind of incoming item
  id, kind (discovery_candidate | org_submission | contribution | factsheet_review),
  ref_id, title, status (new | in_review | needs_info | snoozed | accepted | dismissed | duplicate),
  assigned_to, priority (low | normal | high), due_at, snoozed_until,
  ai_score, ai_rationale (Haiku pre-screen: relevance, credibility, duplicate risk),
  duplicate_of_kind, duplicate_of_ref, dedup_fingerprint (normalised title + state + org),
  created_at, last_status_change_at
triage_events        every status change, with who and when (ageing, SLA, audit)
triage_comments      discussion on an item
```

**Also fixed along the way:**
- Discovery now checks the queue and past dismissals, so the same programme doesn't come back every week.
- Fact sheets get an `archived` state instead of being deleted outright.
- `solution_factsheets`, `org_submissions` and `directory_orgs` are brought into the schema code; today they exist only as raw SQL.

**Live bugs to fix in v2:**
- The weekly freshness sweep flags *every* published entry every week, because it compares a hash with a prose summary.
- The "promote to draft" button returns 401 in production.
- The `registry-crawl` job is never scheduled.
- Dismissals record no reviewer and no audit entry.

## 4. Ingestion: "upload and done"

1. An editor drops a PDF or DOCX into the admin.
2. **Upload:** the browser sends the file straight to R2 through a signed link, so there's no file-size limit from Vercel. A `document_versions` row is created, and the SHA-256 hash catches exact duplicates.
3. **Detect:** Claude Haiku reads the first pages and proposes the landscape, document type and version label ("this looks like a revised Rajnagar LIP"). The editor confirms with one click.
4. **Parse:** pages are processed in parallel.
   - Pages with real text are extracted locally, for free.
   - Pages that are scanned, image-heavy or table-heavy go to Claude. Claude reads the PDF directly and returns clean markdown, keeping tables.
   - Images are never stored as text. The page text goes to R2 and `document_pages`.
5. **Structure:** headings become `sections`. Chunks of about 300–500 tokens are cut at heading and paragraph boundaries, never mid-table, and keep page numbers.
6. **Enrich (contextual retrieval):** Claude Haiku writes 1–2 lines per chunk saying where it sits ("Rajnagar LIP 2026, §5.2 Water: farm-pond budget"). Prompt caching keeps this cheap.
7. **Embed:** Voyage in batches; the model name is stored on every row.
8. **Publish:** the new version becomes current. The old version is deleted entirely once its change summary is written (step 9).
9. **Diff:** if a previous version exists, a change summary is generated, and then the previous version is deleted.

**Drive folder sync (decided 20 Nov 2026).** The CAT documents live in one Google Drive folder, and the Hub keeps itself current from it:

- **Matching:** every file is matched by its Drive file ID, which stays the same through renames and moves. An edited or replaced file therefore becomes a new **version** of the same document.
- **When it checks:** daily on Vercel Hobby (every few minutes once on Pro), plus a "Sync now" button in the admin.
- **Change detection:** Drive's `modifiedTime` and checksum. Google Docs are exported to PDF.
- **Access:** the site reads Drive through a read-only service account that the folder is shared with. It can never write.
- **Publishing:** text, answers and citations update automatically, and editors get an email with the version diff. **Changed budget-table figures wait for one-click editor approval** in the triage queue before the structured tables on landscape pages change.
- **What syncs:** only the **"Final folder"**. Drafts in "Claude outputs" and "Working folder" are ignored; a file reaches the Hub when it's saved into Final.
  - `Landscape report - final/New updated reports`: current LIPs.
  - `Report as on 25/08/2026`: current for landscapes with no newer report.
  - `5.2 data - final/Live Google Sheets`: the structured intervention and budget data, about 80 rows per landscape with costs, phases, funding split, reach and tags.
- **Old versions are removed:** when a new version arrives, the Hub writes the change summary, then **deletes the old version completely** (file, pages, sections, chunks). Only the summary is kept, with the old version's label.
- **Manual documents:** Pangi and the HLPE report aren't in the folder. They're kept as `source = manual` documents outside the sync and never auto-update.

Every step is a row in `jobs` with retries, and the admin shows live progress per document. Jobs run on a Vercel cron every minute (Pro plan), in small steps so no function times out.

## 5. Retrieval and answering

1. **Understand the question:** Haiku rewrites follow-ups into a standalone question and detects the landscape, language and intent (answer, compare, find solutions, make a chart or note).
2. **Hybrid search** over current chunks only, filtered by landscape when one is given:
   - vector (pgvector cosine), top 40;
   - keyword (Postgres full-text), top 40;
   - merged with reciprocal rank fusion.
3. **Rerank** with Voyage rerank and keep the best 8–10.
4. **Answer** with Claude:
   - each passage goes in as a citable source block, so the citations are native, not regex;
   - every claim is tied to a document and page;
   - if the reranked top score is below a floor, the Hub says it doesn't have this.
5. **Show proof:** clicking a citation opens the page viewer with the passage highlighted.

**Measuring quality:**
- a test set of 30–50 real questions, each with the page that answers it;
- metrics: retrieval hit@10, citation accuracy, and refusal correctness;
- a run before every release, shown on the quality dashboard.

## 6. AI features

**Public**

| Feature | What it does | Model |
|---|---|---|
| Ask with page proof | Streamed answers; citations open the exact page; follow-up suggestions | Haiku |
| Compare landscapes | "How do Rajnagar and Vempalli budget for water?" gives a side-by-side table with citations | Sonnet |
| Solution matchmaker | Describe a problem and get matching Atlas programmes, with evidence and why they fit | Sonnet |
| Notes and summaries | "Make me a note on X" gives a short cited note card, downloadable as PDF | Haiku |
| Diagrams and charts | Flowcharts, comparison graphics and budget charts drawn as code (exact, on-brand, editable) | Haiku |
| Voice conversation | Talk to the Hub; it talks back and stops the moment you speak (see 6.1) | Haiku + Soniox |

### 6.0 The advisor tool: a cheap model that consults a strong one

The advisor tool (Anthropic beta, `advisor-tool-2026-03-01`) lets a cheap, fast model do the writing and consult a stronger model mid-answer only when it needs a plan. Each consultation is billed at the stronger model's rates; everything else runs at the cheap model's rates. The model choices for each task live in `lib/ai/models.ts` (an `advisor` field per task), so we can switch it on or off per task without touching code.

| Task | Writer (executor) | Advisor | Why |
|---|---|---|---|
| Ask: plain questions | Haiku 5.5 | none | Grounded look-ups don't need planning; a consultation would add delay and cost to every answer |
| Ask: agent mode (multi-step: search, compare, then chart) | Haiku 5.5 | Sonnet 5.5, at most 1 consultation | Haiku runs the tools cheaply; Sonnet plans the hard multi-step questions |
| Compare landscapes, solution matchmaker | Haiku 5.5 | Sonnet 5.5, at most 1–2 consultations | Likely Sonnet-level judgement at closer to Haiku cost. To be proven on the test set before switching. |
| Fact sheets (web research) | Sonnet 5.5 | Opus 5.5, at most 2 consultations | Better calls on source credibility and on what to leave out |
| Version diff, landscape brief | Haiku 5.5 | Sonnet 5.5, at most 1 consultation | Long documents read cheaply; Sonnet checks the structure |
| Parsing, chunk context, triage pre-screen | Haiku 5.5 | none | Bulk and mechanical; an advisor would only add cost |

**Rules**
- Every advisor is switched on only after the test set shows it improves quality enough to justify the extra cost.
- `max_uses` and `max_tokens` cap every consultation.
- The consultation's cost is logged in `ai_usage` like any other call.
- Sonnet 5.5 and Opus 5.5 advisors return their advice **encrypted**, so it can be passed back to the model but not read. Our logs will record that a consultation happened and what it cost, not what it said.

### 6.1 Voice with interruption

- **Hearing you:** the browser mic streams to Soniox `stt-rt-v6`. The site gives the browser a short-lived key, created per session; the real key never leaves the server.
- **Ending your turn:** Soniox's endpoint detection decides when you've finished speaking, then the question goes to Ask.
- **Replying:** the answer streams from Claude to Soniox `tts-rt-v2` and plays as it is generated.
- **Interrupting:** the moment Soniox hears new speech, playback stops, the Claude request is cancelled, the turn is saved as interrupted, and the Hub listens. The browser's echo cancellation and Soniox's agent-echo cancellation stop the Hub from "hearing itself".
- **Languages:**
  - Spoken: English, Hindi, Bengali, Telugu and Marathi.
  - **Odia: text only.** Soniox doesn't support it yet.
- **Cost:** about $0.82 per hour of conversation, plus Claude. It has its own daily cap (a `voice` budget pool).

**Editors and admin**

| Feature | What it does |
|---|---|
| Upload and done | As in section 4, with live progress and one-click confirmation of detected details |
| Version diff | What changed between versions: budgets, interventions, targets, with page references |
| Auto landscape brief | A cited 2-page brief per landscape, cached until the source documents change; PDF or DOCX |
| Better triage | One queue for candidates, org submissions and contributions. AI pre-screen score and reasons, duplicate detection against queue, Atlas and past dismissals, assignment, priority, due dates, snooze, comments, bulk accept or dismiss, an ageing view (oldest first, overdue in red), and a daily digest email to editors |
| Quality dashboard | AI spend per task and day, test-set scores over time, unanswered questions, model health |
| Daily health check | A cron calls each model with a tiny request; email if anything fails or reports retirement |

## 7. UI/UX

*From a read-only audit of the live site at desktop and mobile widths, 20 Nov 2026.*

**Keep**
- the cream and teal palette and hairline-grid panels;
- clickable citation chips and the staged "searching → reading N sources" status;
- clearly labelled "not in the library" answers;
- the Atlas list/map toggle on mobile;
- the skip link, focus styles and reduced-motion support;
- the shared currency control.

**Fix: speed and first impression**
1. The home map shows developer text ("RUN `NPM RUN GEO:DOWNLOAD`…") while loading. Replace it with a skeleton.
2. **Images are huge.** Partner logos are 4.6 MB and 6.3 MB for a 40 px chip; 512 px icons are shown at 20 px; `hero-still.png` is 2.2 MB; `public/images` totals 35 MB. Compress everything and use Next `<Image>`.
3. Three stacked fade animations hide above-the-fold content for 2–3 seconds. Keep one route fade and never fade the hero.
4. Fonts ship as `.ttf` (about 1.2 MB). Convert to `.woff2`.

**Fix: Ask, rebuilt for v2**
- The whole page becomes the conversation, with the composer pinned to the bottom (today it scrolls inside a 55% box).
- Add **Stop** and **New chat**; keep history across refreshes; add retry.
- Render markdown (lists, tables, bold), charts, diagrams and note cards inline.
- Show citations in a side panel (a drawer on mobile) with the page preview. Replace the raw "0.73" scores with plain relevance labels.
- Add 2–3 suggested follow-up questions after each answer.
- Add a voice button with a live "listening / speaking" state (section 6.1).
- Accessibility: a live region for new answers, a labelled input, Escape and outside-click handling for menus. Fix the scope chip covering the input on mobile.
- One AI entry point. Search's "Ask the library" heading competes with Ask the Hub; Search becomes plain search with an "Ask about this" hand-off.

**Fix: consistency**
- **Fonts:** DESIGN.md says Inter only, but the Fraunces serif appears in 22 files. Choose one heading font, or keep the serif for the wordmark only, and update DESIGN.md.
- **Corners and colours:** 11 different corner sizes become 3 tokens. Off-palette colours (#5C8C2E, #B85042, #929CC5, #C68C2E) become tokens.
- **Cards:** one card system across Organisations, Atlas and citations.
- **Maps:** the Organisations map (satellite) and the Atlas (flat SVG) look unrelated. Give them one visual language.
- **Header:** the full nav appears only from 1280 px wide, so most laptops get a hamburger menu. Lower the breakpoint and show the current page.
- **Accessibility:** the muted grey on cream is 3.95:1 and fails WCAG AA. Raise it to at least 4.5:1 and set an 11 px minimum for uppercase labels.
- **Small fixes:** remove the doubled page titles on /principles and /organizations, and the bare "—" for missing values on the Atlas.

## 8. Build stages

| # | Stage | Live site affected? |
|---|---|---|
| 0 | Step 1: Claude routing, cost caps, security fixes | No (done, on branch) |
| 1 | New CAT database: schema plus copy of app tables from a production snapshot | No |
| 2 | Ingestion pipeline + R2; run your new documents through it | No |
| 3 | Retrieval, Ask v2 with page proof, test set and first scores | No |
| 4 | Compare, matchmaker, notes, diagrams | No |
| 5 | Admin: upload, diff, briefs, triage, quality dashboard, health check | No |
| 6 | Voice | No |
| 7 | UI/UX refresh | No |
| 8 | Preview deploy in the CAT Vercel team on a preview URL, for you to test | No |
| 9 | **Cutover**, with your approval: point the domain at the new project; old project and database stay as instant rollback for 30 days | Yes, reversibly |

## 9. Running costs (estimate, at current traffic)

| Item | Monthly |
|---|---|
| Vercel Pro (per deploying seat) | $20 |
| Neon (free plan; likely enough) | $0 (worst case a few $) |
| Cloudflare R2 (under 10 GB) | $0 |
| Claude: Ask (around 1,000 questions), briefs, diffs, fact sheets | $5–15 |
| Voyage (within 200M free tokens) | $0 |
| Soniox voice (around 10 hours) | about $8 |
| **One-time:** parsing plus enrichment of the new documents | about $5–15 |

Hard daily caps make sure no month can run away.

## 10. Needed from you

1. New Anthropic API key in `.env.local`.
2. Your new documents (Drive link or folder), with the landscape for each if file names don't say.
3. The CAT Cloudflare account, for the R2 bucket.
4. Vercel Pro on the `agroecologyindia` team, before stage 8.
5. A Soniox key for CAT, before stage 6.
6. 30–50 real questions people ask (I can draft them from the documents for you to correct).
