# CAT Hub — Feature Scope & Cost / Complexity Review

*Prepared for the team scope-finalisation meeting, Delhi, Saturday 6 June 2026.*
*Development is paused pending this review (per the 3 June tracker discussion).*

---

## 1. What the Hub is for

Three jobs, agreed in the 3 June review:

1. **Sector intelligence** — show CAT's ability to track and map the agroecology sector.
2. **Public repository** — a single place for publicly available agroecology information.
3. **Narrative tool** — demonstrate that agroecology is *not* fringe. Counter the "only 3% organic" story by mapping the real breadth of work already happening (implementers **and** funders).

Everything below is judged against those three jobs.

---

## 2. How to read this document

Each feature is rated on three axes, **Low / Medium / High**:

- **Upkeep** — ongoing human effort to keep it current (curation, moderation).
- **Run cost** — hosting / compute / LLM tokens it consumes.
- **Build** — effort to build or change it.

And given a **recommendation** reflecting the 3 June decisions: **Keep · Cut · Fold · Expand**.

---

## 3. Feature-by-feature

### Home / Hero
- **What:** Landing page — animated India hero, the three pillars, entry points.
- **Status:** Live.
- **Upkeep:** Low · **Run cost:** Low · **Build:** Done.
- **Recommendation:** **Keep.** Light edit once final scope is set (it currently advertises tabs we may cut).

### Principles (interactive wheel)
- **What:** Rotating, HLPE-grounded wheel of the agroecology principles; click to read each, grounded "read more" from the chatbot.
- **Status:** Live. Praised as a distinctive, engaging element.
- **Upkeep:** Low (static content) · **Run cost:** Low · **Build:** Done.
- **Recommendation:** **Keep.** Strong narrative asset, near-zero running cost.

### Landscapes (the CAT landscape index)
- **What:** The 11 CAT focus landscapes. Each has a profile, a KPI dashboard, a **budget explorer** (5.2 plan), a **document library**, and a **landscape-scoped "Ask"**.
- **Status:** Live (rich data for the 11). New landscapes can have **reports** added via the admin today; full new-landscape *creation* is in progress.
- **Upkeep:** Medium (data updates per landscape) · **Run cost:** Low–Medium (chat + budget queries) · **Build:** High (rich, multi-tab).
- **Recommendation:** **Keep + Expand.** This is a core pillar. Expansion to non-CAT programmes (below) plugs in here and in the Atlas.

### Solutions Atlas
- **What:** Map + list of programmes/solutions across India, linking out to original sources (drives traffic to partners).
- **Status:** Live. Ready for more data.
- **Upkeep:** Medium · **Run cost:** Low · **Build:** Done (additions are data, not code).
- **Recommendation:** **Keep + Expand + absorb Resources.** Per 3 June, **Resources should be folded in here** rather than living as a separate tab. Expand to AP Natural Farming, RYSS, CSA, and funder programmes (GISD, MacArthur, Rockefeller).

### Organizations Atlas
- **What:** Directory of ~330 organisations across ~2,520 work locations, with a clustered India map and public contact details. Built from the NCNF / Core Stack 2021 census.
- **Status:** Live. State names recently cleaned (40 → 28 canonical). Public-data-only — aligns with the 3 June "no solicitation" decision.
- **Upkeep:** Low–Medium · **Run cost:** Low · **Build:** Done.
- **Recommendation:** **Keep.** Already matches the agreed "publicly available data only" model. The public "suggest an edit / add" form should be **removed or hidden** (see Contribute, below); the data stays.

### Resources (standalone tab)
- **What:** A library of reports, briefs, datasets, toolkits.
- **Status:** Live.
- **Upkeep:** **High** (constant curation) · **Run cost:** Low · **Build:** Done.
- **Recommendation:** **Fold into Solutions Atlas** (3 June decision). Removes a maintenance-heavy standalone tab while keeping the content discoverable in context.

### News
- **What:** A dated editorial feed of sector news, linking out to sources.
- **Status:** Live (recently rebuilt as a clean dated list).
- **Upkeep:** **High** (needs near-continuous curation to not look stale) · **Run cost:** Low · **Build:** Done.
- **Recommendation:** **Cut** (3 June decision — "too abstract and maintenance-heavy"). Highest upkeep-to-value ratio on the site.

### Ask (the assistant / chatbot)
- **What:** Retrieval-grounded chatbot. Answers from ingested documents only (no hallucination), with **source filtering** (e.g., a single landscape or "all sources") and a relevance floor.
- **Status:** Live. Routing shortened for speed; on free API keys for now.
- **Upkeep:** Low · **Run cost:** **Medium–High and usage-driven** — this is the main variable cost. Every question spends chat tokens; embeddings are cheap and one-off.
- **Recommendation:** **Keep, but control cost.** Per 3 June: **pre-generate** report/PDF summaries from chunks instead of generating them live, and move to a paid API tier deliberately (not by surprise). Consider a simple per-day spend ceiling (already scaffolded).

### About / static pages (Editorial process, Funders, Privacy, Terms)
- **Upkeep:** Low · **Run cost:** Low · **Build:** Done.
- **Recommendation:** **Keep.** Trim to match final tab set.

### Contribute (public submission)
- **What:** A public form inviting partners to submit/update entries; submissions land in an admin review queue.
- **Status:** Built (form + review console).
- **Upkeep:** **High** (every submission = manual review) · **Run cost:** Low · **Build:** Done.
- **Recommendation:** **Cut the public-facing solicitation** (3 June — avoid the manual-review burden; use only publicly available data). **Keep the underlying review/editorial backend** — it's still used for *ingested* data, and the team explicitly praised the editorial controls.

### Admin desk / backend (the part the team praised)
- **What:** Login-gated CAT desk: **Queues** (drafts, discovery candidates, freshness flags), **Submissions** review, **Landscapes** (upload a report → it's embedded into the assistant), **Sources** registry, **Runs**, **Audit log**. Auth.js magic-link login; role-gated.
- **Status:** Live. This is the "comprehensive backend with editorial controls + data ingestion + admin dashboard" called out positively on 3 June.
- **Upkeep:** Low · **Run cost:** Low · **Build:** High (already done).
- **Recommendation:** **Keep + invest.** This is what makes the Hub hand-off-able to the team without a developer. Document upload needs a PDF + large-file upgrade (see §4).

---

## 4. Cross-cutting costs & decisions

### Hosting
- **Today:** Vercel (frontend + serverless) + **Neon Postgres with pgvector** (database). Both on free/hobby tiers.
- **Scales with:** database size, function compute (mainly ingestion + chat), and bandwidth.
- **Upgrade triggers:** as the directory + embeddings grow and traffic rises, move Neon and Vercel to paid tiers. Rough order of magnitude: tens of dollars/month at first, not hundreds. A heavier "robust hosting (VPS/managed cloud)" is only needed if we self-host the LLM or store very large media.

### LLM cost (the real variable)
- **Embeddings** (indexing documents): cheap, paid once per document.
- **Chat** (answering questions): paid per question — the cost that grows with usage.
- **Decision (3 June):** pre-generate summaries/PDF text from chunks so common outputs don't re-spend tokens; keep live chat for genuine Q&A; set a spend ceiling. AI development is currently ~₹10k/month from personal funds — this needs a proper subscription/budget line (Claude Pro $25/seat noted for specialised work).

### Document upload (open item)
- Current admin upload handles `.docx` up to ~4 MB. Real reports are PDF and up to ~30 MB.
- **Proposed solution:** direct-to-storage upload (removes the size limit) + **Microsoft MarkItDown** to convert PDF/DOCX/PPTX → clean Markdown before embedding. Low cost; one small decision to enable storage.

### Data pipeline / scope expansion
- Moving beyond CAT's 11 landscapes to the whole sector (AP NF, RYSS, CSA, funders) is **mostly a data exercise**, not new code — it flows into the existing Atlas + Landscapes. Needs the source data (e.g., Minhaj's ~2,604-point file) and a light editorial pass.

### Subdomain & integration (from 2 June)
- Stand up at **cathub.agroecologyindia.org** and link from the main agroecologyindia.org menu.

---

## 5. Proposed scope for the 6 June meeting

| Feature | 3 June decision | Effect |
|---|---|---|
| Home / Hero | Keep | Light edit |
| Principles | Keep | — |
| Landscapes | Keep + Expand | Add non-CAT programmes |
| Solutions Atlas | Keep + Expand | Absorb Resources; add sector + funders |
| Organizations Atlas | Keep | Hide public add/edit form |
| **Resources (tab)** | **Fold into Atlas** | Remove standalone tab |
| **News** | **Cut** | Remove tab |
| Ask (chatbot) | Keep, cost-controlled | Pre-generate summaries; paid tier + ceiling |
| **Contribute (public)** | **Cut public form** | Keep review backend |
| Admin / backend | Keep + invest | Add PDF + large-file upload |

**Net effect:** a *lighter, cheaper-to-run, lower-maintenance* public site (two tabs removed, one folded), a *broader* data story (whole sector + funders), and the *praised editorial backend* kept and strengthened.

---

## 6. Open decisions for the team

1. **Final tab list** — confirm: Home · Principles · Landscapes · Solutions Atlas (incl. Resources) · Organizations Atlas · Ask · About. (News and standalone Resources removed; public Contribute removed.)
2. **Expansion data** — who supplies the non-CAT programme + funder data, and to what depth (implementer + funder fields)?
3. **AI budget** — agree a monthly LLM ceiling and who owns the subscription, so it's off personal funds.
4. **Hosting** — stay on Vercel + Neon paid tiers (simplest), or invest in VPS/managed cloud (only if self-hosting the model)?
5. **Subdomain & launch** — confirm `cathub.agroecologyindia.org` and the menu link for the demo.
6. **Document upload** — green-light the storage + MarkItDown upgrade so the team can add big PDF reports themselves.

---

*Current build status (for reference): the public site and the login-gated admin backend — auth, submission review, and in-browser landscape-report ingestion into the assistant — are live. Pending: full new-landscape creation, and the PDF/large-file upload upgrade.*
