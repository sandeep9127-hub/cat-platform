# Solution Fact Sheets — an automated, verifiable pipeline for the Solutions Atlas

*Companion to the feature-scope review. Goal: every solution in the Atlas gets a
consistent, cited fact sheet with a small framework graphic, a "Read more" link,
and a downloadable version — generated automatically, but never hallucinated.*

---

## The one principle that makes this safe

**Automation drafts. Sources ground. Humans verify.**

- No sentence appears on a fact sheet without a **citation to a fetched,
  authoritative source**.
- Nothing is **published** until a CAT editor approves it (one click).
- Fact sheets are **pre-generated once** per solution (and on source change),
  not generated per visitor — cheap, and it matches the 3 June "pre-generate, don't
  spend tokens live" decision.

These three rules are what turn "AI wrote a summary" into "a verified fact sheet."

---

## Why "a link to Google won't cut it" — and what we do instead

Open web search returns *anything*; it can't vouch for truth. We replace it with a
**curated, tiered source library** (which you already have as `source_registry`,
with trust tiers: authoritative / trusted / emerging):

1. **Seed the canonical source(s).** For each solution, the team (or a controlled
   crawler) registers the *official* URLs — programme site, government scheme page,
   funder portfolio, institutional report (ICAR/NABARD/state agri dept), CAT's own
   documents. The system **never invents a source**.
2. **Whitelisted discovery, not SERP.** To *find* new solutions, crawl a list of
   **trusted domains** (gov portals, funder sites, known networks) — not Google
   results. New finds land as *candidates* for a human to accept (this triage queue
   already exists).
3. **Every fact is traceable.** Generation only uses text fetched from those
   registered sources, and each fact keeps its source URL.
4. **Freshness.** Sources are re-checked on a schedule; a material change flags the
   fact sheet for re-review (freshness flags already exist).

Verification = (curated sources) × (citation-per-fact) × (human approval). Google
gives none of those.

---

## The fact-sheet framework (the consistent template)

Every solution renders the same fields, so they're comparable and graph-able:

| Field | Source of truth |
|---|---|
| Name / one-line | source |
| What it is (2–3 sentences) | source, grounded |
| Where it works (states/districts) | source → map |
| Scale (households / hectares / villages) | source → figures |
| Approach / practices | source |
| **Principle alignment** (the 13 HLPE/FAO principles) | mapped from the text |
| Outcomes & evidence (with figures) | source, cited |
| Implementer(s) | source |
| Funder(s) | source |
| Timeline / status | source |
| **Sources** (citations) | the registry |
| Last verified | system |

Fields with no evidence render **"Not stated in sources"** — never a guess.

---

## The pipeline (6 stages)

```
1. Register source(s)         → trusted URLs only (registry)
2. Fetch + convert + embed    → MarkItDown (PDF/DOCX/HTML→MD) → chunk → vectors
                                 (each chunk tagged with source URL + trust tier)
3. Extract → fact-sheet draft → schema-constrained generation: fill each template
                                 field ONLY from retrieved chunks, with citations
4. Framework graphic          → deterministic data-viz from the structured fields
                                 (where it works, scale, principle wheel) — not text
5. Human review               → draft lands in the admin Queue; editor approves/edits
6. Publish                    → Atlas fact-sheet page + "Read more" link
                                 + "Download fact sheet (PDF)" + freshness re-check
```

### Stage 3 in detail (the no-hallucination core)
We ask the model to return a **structured object** (the template above), where every
populated field must quote/cite a retrieved chunk; anything it can't support from the
chunks is set to "Not stated." This is the same retrieval-grounded, relevance-floored
approach as the existing chatbot — but with a **fixed output schema** instead of free
prose. No parametric/"from memory" facts are allowed in.

### Stage 4 — the "graph / framework"
A small, auto-generated visual per solution, built **only from the extracted numbers/
fields** (so it can't hallucinate):
- a mini India map of where it works,
- a scale read-out (households / hectares),
- a **principle-alignment wheel** showing which of the 13 principles it touches.

---

## What we reuse vs. what's new

**Already built (reuse):**
- `source_registry` + trust tiers + discovery candidates + freshness flags + the
  **draft-entry review Queue** in the admin.
- The grounded, no-hallucination RAG (embeddings + relevance floor).
- The **downloadable brief generators** (the APCNF/Odisha "Read more" PDFs/DOCX).
- The admin approval workflow + audit log.

**New to build (the ~30%):**
1. The **fact-sheet schema** + the schema-constrained extraction prompt (cited, with
   "Not stated" fallbacks).
2. The **framework graphic** component (map + scale + principle wheel from fields).
3. A **fact-sheet PDF/DOCX template** (extend the existing brief generators).
4. Atlas integration: a fact-sheet panel on each solution + "Read more" + "Download."
5. The **whitelisted-domain fetch** for verified sourcing (replacing any web-search
   notion) + MarkItDown conversion.

---

## Phasing (so we prove safety before scaling)

- **Phase A — Prove it.** Schema + grounded extraction over *already-ingested*
  sources → draft fact sheets appear in the admin Queue for approval. Validates the
  no-hallucination guarantee and the human gate. *(Small build.)*
- **Phase B — Make it shippable.** Framework graphic + PDF/DOCX download + the Atlas
  fact-sheet page. *(Reuses brief generators.)*
- **Phase C — Automate sourcing.** Whitelisted-domain crawl → candidates → approval,
  + MarkItDown for PDFs, + scheduled freshness re-checks. *(The "robust data" engine.)*

Each phase is independently useful; we can stop after A/B if the team wants to keep a
human firmly in the loop and skip auto-discovery.

---

## Cost (deliberately low)

- **Embedding** a source: cheap, once per document.
- **Generating** a fact sheet: one bounded LLM pass per solution, **pre-generated**
  (not per visitor) — re-run only when a source changes.
- **Serving + downloading:** static, near-zero.
- This is materially cheaper than live chat, and it's the model the team already
  endorsed on 3 June.

---

## The guarantees, stated plainly (for the team)

1. **Grounded** — facts come only from fetched, registered sources.
2. **Cited** — every fact links to where it came from; "Read more" goes to the source.
3. **Honest gaps** — unknown fields say "Not stated," never a guess.
4. **Human-approved** — nothing publishes without an editor's click.
5. **Fresh** — sources are re-checked; changes trigger re-review.
6. **Downloadable** — a clean PDF/DOCX per solution, like the landscape briefs.

This is how the Solutions Atlas becomes the robust, trustworthy repository that
absorbs Resources — comparable fact sheets, real citations, no hallucination, and a
download for every solution.

---

## Getting curation to ≈ zero (auto-publish, not auto-review)

Honest framing: an LLM cannot *guarantee* zero hallucination, so "no review ever" is
not a promise anyone should make. What we **can** do is engineer the system so the
expected human effort is ≈ zero — the editor becomes an occasional exception-handler
(delete/edit), not a per-item reviewer. Four mechanisms stack to get there:

1. **Extractive, not generative.** For risky facts (numbers, places, names, funders),
   we **pull the verbatim span** from the source and cite it — we don't paraphrase.
   A quoted, cited figure can't be hallucinated.
2. **Automated entailment check.** Every drafted fact is run through a **second,
   independent verifier pass** that asks: "is this claim fully supported by the cited
   chunk?" If not entailed → the fact is **dropped** (renders as "Not stated"), not
   published. (Optionally two different models must agree.)
3. **Numeric / name exact-match.** Any number or proper noun in a fact must appear
   **literally** in the cited source text, or it's dropped. This kills the main
   hallucination vector (invented statistics).
4. **Confidence gate → auto-publish vs. thin queue.**
   - A fact passes if: extractive **and** entailed **and** (numbers match) **and**
     source is tier-1/2.
   - A **fact sheet auto-publishes** if its facts pass and coverage is adequate.
   - Only **exceptions** — low coverage, a source conflict, or a tier-3-only claim —
     route to a small review queue. Everything else goes live untouched.

So the **default is auto-publish**; review is the rare path, and deletion/editing is
always available after the fact. Net: near-zero curation, with safety that degrades
gracefully instead of failing silently.

> What we explicitly do **not** do: publish a paraphrase no source supports; invent a
> figure; publish from an unverified/tier-3 source without a flag. Those are blocked
> by construction, not by a reviewer's vigilance.

---

## The data-sourcing engine — how, how often, with what

A fact sheet is only as good as its data. This is the engine that feeds it, and most
of the skeleton already exists in the codebase (the `/api/cron/*` routes:
`registry-crawl`, `discovery`, `draft-writer`, `freshness-sweep`, plus
`source_registry` with `crawl_frequency_days`, `last_content_hash`, and trust tiers).

### Where the data comes from (tiered, never open-web)
- **Tier 1 — authoritative:** government scheme portals (PKVY, NMNF, APCNF/RySS,
  state agriculture departments), **data.gov.in** open-data APIs, ICAR, NABARD,
  MoA&FW, FAO/CGIAR.
- **Tier 2 — trusted:** funder portfolios (GIZ, MacArthur, Rockefeller, Azim Premji,
  Tata Trusts), established networks (NCNF), CAT's own documents.
- **Tier 3 — emerging:** newer org sites — ingested but **never auto-published**
  without a flag.

The team registers the canonical URL(s) per solution. The system never sources from
"whatever Google returns."

### The tools (each job, what runs it)
| Job | Tool | What it does |
|---|---|---|
| **Schedule** | **Vercel Cron** (free; `CRON_SECRET` already set) | fires the jobs below |
| **Discover new** | **whitelisted-domain search** (Brave/Bing API with `site:` limited to registry domains) + **sitemap / RSS** parsing | finds new pages *within trusted sources* → candidates |
| **Fetch** | `fetch` + **Readability** (HTML) / **MarkItDown** (PDF, DOCX, PPTX) | gets clean text/Markdown |
| **Change-detect** | **SHA-256 content hash** (`last_content_hash`) | re-process only if the page actually changed (saves cost) |
| **Extract** | grounded **schema** LLM pass | fills the fact-sheet fields, cited |
| **Verify** | entailment pass + numeric exact-match | drops unsupported facts |
| **Store** | Neon + pgvector + structured fields | the fact sheet + its evidence |

### The frequency (per-source, change-gated)
Cadence is set **per source** (`crawl_frequency_days`) by trust + volatility, and
every fetch is **hash-gated** — if nothing changed, nothing re-runs:

| Source type | Re-crawl cadence |
|---|---|
| Govt scheme / portal | every **30 days** |
| Active programme sites | every **7 days** |
| Funder portfolios | every **30 days** |
| Research / institutional | every **60–90 days** |
| **New source added** | **immediately** (event-driven) |
| **Freshness sweep** (light scan for material change) | **weekly** |

A change in a source → the affected fact sheet is re-extracted, re-verified, and
(if it still passes the gate) re-published automatically; if a change introduces a
conflict, *that one* sheet flags for review. So the corpus stays current without a
standing curation effort.

### How it runs end-to-end (one diagram)
```
Vercel Cron (daily)
  ├─ registry-crawl   → for each due source: fetch → hash → changed? → MarkItDown → embed
  ├─ discovery        → whitelisted-domain search/sitemaps → new candidates
  ├─ draft-writer     → schema-extract + verify → fact sheet → CONFIDENCE GATE
  │                       ├─ pass  → auto-publish to Atlas (+ PDF)
  │                       └─ fail  → thin review queue
  └─ freshness-sweep  → detect material source changes → re-extract / flag
```

### Cost of the engine
- Crawling + hashing: negligible.
- Extraction/verification: a couple of bounded LLM passes **per changed source**, not
  per visitor, not per day — change-gating means most cycles do nothing.
- One search-API subscription (Brave is cheap/free tier) for whitelisted discovery.
- Comfortably within a small monthly budget; scales with *how much real change* there
  is in the sector, not with traffic.

### What I'd need to turn this on
1. The **list of trusted source domains** (Tier 1/2) to expand the existing allowlist.
2. Green-light for **MarkItDown** + storage (shared with the document-upload upgrade).

> **No separate search key needed.** See the next section — discovery already runs
> on Anthropic's server-side web-search tool, which has no India restriction.

---

## Correction: the search engine is already built (no SearXNG, no Brave)

The codebase already contains the sourcing engine, and it does **not** depend on a
browser/search API key:

- **`/api/cron/discovery`** uses **Anthropic's `web_search` tool**, `allowed_domains`
  restricted to trusted sources (`gov.in`, `nic.in`, `icar.org.in`, `wassan.org`,
  `nabard.org`, `ifad.org`, `icrisat.org`, Down To Earth, The Hindu, Scroll, Indian
  Express, The Wire). It runs **server-side through the Anthropic API**, so there is
  **no India restriction and no extra key/host** (no SearXNG, no Brave). It writes
  structured candidates (title, summary, theme, state, lead org, source URLs,
  confidence) into `discovery_candidates`.
- **`/api/cron/draft-writer`** already does grounded, cited extraction: it fetches the
  candidate's source URLs, strips them, and extracts a structured object where **every
  claim must be defensible from `source_passages`**, refusing if sources don't support
  it. This is the fact-sheet draft, minus the auto-publish gate.
- **`/api/cron/registry-crawl`** + **`/api/cron/freshness-sweep`** + `vercel.json`
  crons already schedule crawl (Mon), discovery (Wed), and freshness (daily).

**So the engine exists.** What remains to deliver the goals in this document:
1. **Confidence-gate auto-publish** on top of draft-writer (extractive + verify +
   numeric match) so the confident majority publishes without human triage.
2. **A decoupled `solution_factsheets` table** the **Solutions Atlas merges in**, so
   new discoveries **auto-pin to the map + list** without touching the heavy
   `entries`/`geographies` model.
3. **A printable fact-sheet page** (framework fields + graphic + Read more +
   print / Save-as-PDF), reusing the brief generators.
4. **Expand `allowed_domains`** to the funder/programme sites and **run** the engine.

These are tracked as the next build bricks.

