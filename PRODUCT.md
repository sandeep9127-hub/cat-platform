# PRODUCT.md — CAT Platform

> Authoritative product brief for the CAT Platform live system. Hand this to `$impeccable craft`, to engineers, to editors, to any contributor onboarding. Locked decisions are marked **Locked.** If a request mid-build conflicts with a locked decision, raise it before changing it. Open considerations are explicitly marked.

**Register:** brand-primary, product-secondary.
The public surface is brand register — design IS the product, an editorial publication. The admin surface is product register — design SERVES the editor's work. Both surfaces share one typographic system, one palette, one voice. They are not two products; they are the publication and its desk.

**Last updated:** 17 June 2026 (live-system sync). The structural plan below was authored 14 May 2026 through `$impeccable shape` discovery, on the foundation of the original CLAUDE.md brief (13 May 2026). This sync layers in what actually shipped.

---

## 0. Live system (June 2026 sync)

The plan in §1 to §19 still describes the editorial publication accurately. Since the original write-up, the platform shipped and grew a second pillar. Read this section first, then the plan.

**Live at:** `hub.agroecologyindia.org` (Cloudflare A-record; old `*.vercel.app` shows a "moved" page). Repo: `github.com/sandeep9127-hub/cat-platform`. Pre-launch the whole site sits behind a shared-password preview gate (`/preview`); the gate lifts at launch or via `PREVIEW_GATE=off`. Ship by `git push` to `main` (Vercel auto-deploys); never the `vercel` CLI.

**Two pillars now, one publication:**

1. **The editorial publication** (the original plan): curated Entries, Organisations, Themes, the AI ingestion loop, the admin desk, search, and the Ask/agent preview.
2. **The Landscapes dashboard** (new): CAT's own field landscapes, each with an Investment Plan. Per landscape: a Profile, a Budget ("where the money goes"), Insights (reach), a Climate valuation, and a scoped Ask. See the new surfaces block in §7.

**Stack reality (diverges from the §11 "locked" rows, noted with reasons):**

- **Database is Neon Postgres, not Supabase.** Same Postgres + pgvector contract; chosen for the serverless driver and branch databases. Auth and storage are handled separately (NextAuth + Vercel Blob) rather than Supabase's bundled services.
- **Embeddings are NVIDIA `nv-embedqa-e5-v5` (1024-dim), not Anthropic.** Retrieval-tuned and cost-effective for the RAG chunks behind landscape Ask and search.
- **The organizations explorer map uses Leaflet + markercluster (from unpkg), not the custom SVG.** The §11 "no Leaflet" rule still holds for the editorial atlas; the org explorer needed clustering over hundreds of work locations, so it carries a real tile map. Raise before extending Leaflet to other surfaces.
- **A live currency system** (INR / USD / EUR, live ECB rates via `/api/rates`) drives every money figure on landscape pages.
- **A canonical geography picker** backs location entry: type-ahead, typo-tolerant (pg_trgm) search over the full India tree (36 states, 693 districts, 6,940 blocks, 262,561 villages, LGD-coded). See §7 and DESIGN.md.

**Contractor confidentiality (locked):** the climate valuation is produced with an external contractor's model. That contractor's name must never appear on any user-facing surface or in shipped output. Refer to it only as "the modelled climate valuation".

**Editorial transparency (June 2026 decision):** the About page now states explicitly that entries are AI-generated, then human-reviewed before publishing. The standalone `/editorial-process` and `/style-guide` pages were removed and the editorial process folded into `/about#editorial-process`; `/editors` and `/funders` were also removed. This is a more explicit AI disclosure than the original §6 invariant ("AI authorship is never displayed as authorship"); the human-approval gate is unchanged, so a published `cat_authored` entry is still CAT-authored.

---

## 1. Product purpose

The **CAT Platform** is a public, curated dashboard of credible sustainable food-systems work in India. It is produced by the Consortium for Agroecological Transformations, but it covers credible national work, not only CAT's portfolio: government missions, NGO programmes, partner work, federations, market infrastructure, policy experiments, research-led interventions.

**Public tagline:** *"A dashboard for sustainable food systems."*

**The platform is:**

- A public reading surface for funders, programme designers, researchers, students, journalists, and policy actors.
- An AI-assisted editorial publication. CAT editors decide what gets published; an AI pipeline does the production work of drafting from sources.
- A defensible record of *what was attempted, what was achieved, what worked, and what did not work* — with limitations given equal visual weight to achievements.
- Outwardly link-driven. Funders never register. Every filter and search state is a shareable URL.

**The platform is not:**

- An internal project-management tool. CAT does not run its operations from here.
- A GIS platform. The map is an editorial illustration that happens to be data-accurate, never a survey-grade GIS surface.
- A CAT marketing site. CAT is the editor, not the subject.
- A national authority. It is CAT's contribution to the food-systems fraternity.
- A volume-driven directory. Curation is the bar; scale is not the win condition.

---

## 2. Users (priority order for v1 design decisions)

1. **Funders and their advisors.** Quick-glance, link-driven, never register. Senior readers who arrived from a meeting and want to know if a programme is real. Will spend 3–8 minutes on a single entry. Will share URLs in slack/email.
2. **NGOs and programme designers.** Use the platform for cross-learning. Will read deeply, will care about "what did not work" more than headlines.
3. **Researchers, students, journalists.** Will follow citations and resources. Will need shareable, citable URLs and downloadable references.
4. **Government and policy actors.** Light usage, occasional deep dive when a state mission overlaps with their brief.
5. **CAT editors (admin users).** Internal. Live in the admin desk. Move AI drafts and discovery candidates through to publication. Keyboard-first power users.
6. **Contributing organisations (light auth).** Self-submit entries via magic-link email login. Will use the platform 2–4 times a year, not daily.

**A user the platform deliberately does not optimise for:** the casual web visitor browsing for "trending AI in agriculture" content. The platform is not SEO-bait, not engagement-driven, not feed-shaped.

---

## 3. Voice and tone

Carries from the original brief verbatim. Locked.

- **Plain, declarative, no marketing puff.** Read the existing static mockup to internalise the voice.
- **No em dashes anywhere.** Code, copy, comments, commits. Use commas, full stops, parentheses, colons.
- **No marketing vocabulary.** No "leverage", "stakeholder", "ecosystem", "transformative", "synergy", "unlock", "empower".
- **Direct.** Short sentences. Voice over jargon.
- **Honest.** The "what did not work" field is a feature, not a footnote. Limitations sit beside achievements at equal visual weight.
- **The word "agroecology" never appears on the public surface.** Fine in internal docs, schema, and admin tooling.

**Voice examples (carry forward):**

- ✅ "Find the work that is actually changing how India grows, eats, and sustains."
- ❌ "Discover transformative initiatives reshaping Indian food systems."
- ✅ "Soil regeneration timelines were over-promised. The team now thinks four years is too short for a defensible carbon claim."
- ❌ "We encountered some challenges around our soil regeneration KPIs."

**Editorial bar:** treat every entry as if a funder, the originating organisation, and a critical journalist will all read it. Treat the AI drafts the same way; if the prose would embarrass the editor in front of any of those three readers, it does not publish.

---

## 4. Brand anchors

- **Aesthetic family:** editorial publication. *The Atlantic* feature article meets *Our World in Data* meets *Stripe Press*. Restrained, considered, warm.
- **Hand-feel:** the platform should feel curated by humans even where the production is AI-assisted. Typographic hierarchy and generous whitespace, never SaaS-card-grids.
- **Material reference:** good newsprint and fine matte paper, not glass and neon.
- **Anti-aesthetic (reflex-reject):** SaaS dashboards, observability dark themes, navy-and-gold finance, Notion/Linear admin chrome, AI-chat-bubble layouts, gradient hero text, glassmorphism, identical card grids, hero-metric templates.

### Colour palette (locked, CSS variables)

```css
--deep-teal:#2C4544;   /* primary dark, brand */
--teal:#2E7573;        /* primary mid, links, headings */
--teal-soft:#4A8B89;   /* hover states */
--amber:#F8CA7C;       /* accent, brand mark, highlights */
--amber-deep:#D9A655;  /* amber on light, stat values */
--cream:#F8F4ED;       /* surface cream, admin base */
--paper:#FBF8F2;       /* page background, public base */
--ink:#1A2625;         /* primary text */
--ink-soft:#3D4E4D;    /* body text */
--muted:#6B7B7A;       /* secondary text, meta */
--line:#DDE0DA;        /* borders */
--line-soft:#E8E5DD;   /* subtle borders */
--red-alert:#B85042;   /* freshness warnings, "what did not work" tint */
```

**Colour strategy:** Restrained on both surfaces.

- Paper / cream is the dominant surface, ~75% of any view.
- Teal carries identity (links, headings, brand mark, map fills, primary actions).
- Amber stays ≤10%: the brand mark glyph, the CAT-Authored badge, accent rules, the admin "needs decision" flag.
- Red-alert reserved for two narrow uses: a freshness signal on dates older than 6 months, and the background tint of the "what did not work" callout.
- No second accent enters the system. No purple, no green-success, no SaaS-pink.

### Typography (locked)

```
--serif:'Fraunces', Georgia, serif;
--sans:'Inter', system-ui, sans-serif;
--mono:'JetBrains Mono', ui-monospace, monospace;
```

- **Fraunces** (variable, 400–700) — page titles, entry titles, organisation names, theme names, hero copy, italic ledes. Fraunces *italic* is the editorial signature.
- **Inter** (400–700) — body, navigation, forms, buttons.
- **JetBrains Mono** (400–600, uppercase, letter-spacing 0.10–0.18em) — meta, breadcrumbs, badges, eyebrows, numeric data.

Scale ratio between hierarchy steps ≥ 1.25. Line length capped 65–75ch for body. Same scale across public and admin so the editor lives in one type system.

### Theme

**Light, paper-toned, on both surfaces.** Scene sentences below force the answer:

- *Public:* "A program officer at a foundation in Delhi reads three entries on a 14-inch laptop in a sunlit office at 11am between meetings, scanning for whether the work is real." → light.
- *Admin:* "A CAT editor at home at 9pm pulls one AI draft from the queue, compares it line-by-line against the source PDF in a split view, and decides whether the prose is honest enough to publish." → light (the editor needs to compare prose accurately; high-contrast type on paper-tone is the right choice; the lineage is Substack composer and NYT internal CMS, not observability dark).

---

## 5. Strategic principles

Standing rules for every contributor, every session, every decision.

1. **Curated, not crowdsourced.** Volume is not the win condition. Honest, defensible programme entries are.
2. **Programme level, not activity level.** If it has a name, a defined geography, a documented start, and an identifiable lead organisation, it is an Entry. A line item inside one of those is not. Locked.
3. **"What did not work" is required design infrastructure.** It is the platform's differentiator. Never demoted, never collapsed, never optional in the public read.
4. **AI scales production, never editorial judgement.** Claude drafts; CAT editors decide what publishes. Nothing reaches the public surface without a human approval.
5. **Funders never register.** Auth is for contributors and editors only. Every public view is reachable by URL.
6. **The map is not GIS.** If a feature request would turn it into one, raise it. Locked.
7. **Honest provenance.** Every entry shows its source(s), its endorsement tier, and its last-reviewed date. No silent edits to public-facing prose.
8. **One visual language, two surfaces.** Admin and public share fonts, palette, and typographic scale. The admin desk is the editor's working face of the publication, not a separate tool.
9. **Plain language.** Both copy and code. No marketing words, no em dashes, no clever abstractions where a direct word works.
10. **Schema discipline.** Schema sprawl is the most common way these platforms die. New entities or fields raised before added.

---

## 6. The editorial workflow (the human-AI loop)

This is the load-bearing innovation of the platform. It is documented in detail because it is novel and because the platform's editorial defensibility lives or dies here.

```
  ┌──────────────── INGESTION ────────────────┐
  │                                            │
  │  (A) SOURCE REGISTRY                       │
  │      ~80-150 curated source URLs           │
  │      (state ag dept sites, NABARD/IFAD     │
  │       project pages, partner annual        │
  │       reports, key research institutions). │
  │      Weekly crawl. Hash + diff.            │
  │                                            │
  │  (B) DISCOVERY AGENT                       │
  │      Weekly. Claude + Anthropic web        │
  │      search tool, allowlisted to .gov.in,  │
  │      .org, major news domains. Proposes    │
  │      candidate new programmes by theme     │
  │      and state. Lands in admin            │
  │      "discovery candidate" queue.          │
  │                                            │
  │  (C) DRAFT WRITER                          │
  │      For new candidates or registry        │
  │      diffs: Claude reads the source        │
  │      (HTML, PDF via file-upload), extracts │
  │      structured fields, drafts the five    │
  │      narrative blocks WITH inline          │
  │      citations anchored to source          │
  │      passages.                             │
  │                                            │
  │  (D) FRESHNESS SWEEP                       │
  │      Daily. Flags published entries        │
  │      whose source has changed. Sets        │
  │      editorial_status = 'needs_update'.    │
  │      Generates a diff summary. NEVER       │
  │      edits public prose silently.          │
  └────────────────────────────────────────────┘
                       │
                       ▼
  ┌──────────── ADMIN DESK (CAT editor) ───────┐
  │                                             │
  │  Three queues:                              │
  │    1. AI drafts (from C)                    │
  │    2. Discovery candidates (from B)         │
  │    3. Freshness flags (from D)              │
  │    + a fourth: contributor submissions      │
  │      (from public /contribute form)         │
  │                                             │
  │  Review screen: source ↔ draft ↔ fields.    │
  │  Editor edits inline, approves, returns     │
  │  for edits, or rejects. Citation anchors    │
  │  light up the matching sentence when a      │
  │  source passage is selected.                │
  │                                             │
  │  Keyboard-first: j/k navigate, Enter open,  │
  │  a approve, r return, s save.               │
  └─────────────────────────────────────────────┘
                       │
                       ▼
  ┌──────────────── PUBLIC SURFACE ─────────────┐
  │  Only approved entries appear here.         │
  │  Every entry shows endorsement tier and     │
  │  last-reviewed date. Stale (>6mo) dates     │
  │  go red. Full revision history is admin-    │
  │  only; public shows latest + last-reviewed. │
  └─────────────────────────────────────────────┘
```

**CAT endorsement tiers** (carry forward, locked):

- `cat_authored` — CAT researched and wrote (now: CAT-edited an AI draft built from public sources). Displayed prominently.
- `cat_endorsed` — Self-submitted by the lead organisation, reviewed and endorsed by CAT.
- `cat_listed` — Present on the platform but CAT does not vouch for the description, only that the programme exists.

A platform-wide invariant: **AI authorship is never displayed as authorship.** A `cat_authored` entry on the public surface is a CAT-authored entry because a CAT editor approved every sentence. The AI's role is production assistance, not byline.

---

## 7. Surfaces (the full v1 build)

### Public surfaces

| Route | Purpose | Notes |
|---|---|---|
| `/` | Landing: hero, atlas, featured entry, themes, news strip | Already prototyped in the static mockup, carries forward |
| `/entry/[slug]` | Entry detail: four narrative blocks, metrics, resources, related | Magazine column ~62ch. "What did not work" in red-tinted callout. |
| `/organisation/[slug]` | Org detail: description, roles_held aggregation, related entries | `roles_held` computed at query time from `entry_organisations`, never stored |
| `/theme/[slug]` | Theme detail: editorial intro, featured entries, reading list, resources | Eight locked themes; see §10 |
| `/resources` | Filterable resource library | Full surface. Type, language, year, theme, geography filters. URL state. |
| `/news` | Dated feed of partner news, CAT-curated | Full surface. Source links external, no long passages hosted. |
| `/map` | Atlas-only deep view | Same map component as landing but full-bleed, with toggleable landscape + river basin overlays |
| `/search` | Semantic search + traditional filters | pgvector retrieval; one-paragraph synthesis paragraph above 3-5 ranked entries with citation superscripts |
| `/agent` | **Public agent preview (v1 demo)** | Single-conversation demo of the conversational agent. Tool-use against the structured schema. Heavily rate-limited, clearly labelled "Preview". See §8. |
| `/contribute` | Submission forms for Entry, Resource, News | Magic-link auth required. Multi-step form with autosave. |
| `/about`, `/editorial-process`, `/style-guide` | Editorial transparency pages | Plain copy. The editorial-process page explains the AI loop publicly. |
| `/principles`, `/funders` | The 13 agroecology principles; the funders pitch | Principles use the official PNG icons. |

### Landscape surfaces (new pillar, live June 2026)

CAT's own field landscapes, each backed by a Landscape Investment Plan (LIP). Eleven landscapes exist; three are published with full budget data (Patratu, Mau, Dharashiv), one carries a climate valuation (Patratu), the rest are profile-only and read "in preparation" on the data tabs.

| Route | Purpose | Notes |
|---|---|---|
| `/landscapes` | The cover wall: all eleven landscapes as illustrated covers | Click through to a profile. |
| `/landscape/[slug]` | Profile: hero, "at a glance" facts, context, challenges, transformational priorities, interventions | Tab bar: **Profile · Budget · Insights · Climate · Ask**. A currency toggle sits top-right and drives every figure below it. |
| `/landscape/[slug]/budget` | "Where the money goes": total plan size, who-pays split, delivery packages | Figures from `landscape_budget_lines`; reconcile to the LIP. |
| `/landscape/[slug]/insights` | Reach: households, hectares, intervention counts | |
| `/landscape/[slug]/climate` | The modelled climate valuation | Headline value, investment-to-return ratio, three tracks (resilience / adaptation / carbon) counted once, a disclosed co-benefit pool kept out of the headline, all-tracks GHG with a creditable-vs-shadow marketability split, and three funder-lens views with evidence tiers T1/T2/T3. Modelled value, not a cash return. |
| `/landscape/[slug]/library` | Source documents for the landscape | |
| `/landscape/[slug]/ask` | Per-landscape Ask | Redirects to `/agent?scope=[slug]`; RAG over the LIP narrative chunks. |

**Climate valuation method (locked framing):** every intervention is assigned the single climate track it primarily serves, so the headline never double-counts. Value it generates in its other tracks is disclosed as a co-benefit pool, explicitly excluded from the headline. Carbon is priced at benchmark rates; tonnage shown is the full all-tracks footprint, of which only the registry-pathway slice is creditable today. Every figure carries an evidence grade. The contractor behind the model is never named (see §0).

**Geography (locked):** locations are chosen from the canonical tree via the type-ahead picker, never free-typed. Stored as a geography id (FK), which is what keeps tagging uniform and kills spelling, wrong-village, and mis-tag errors. Authoritative source is the LGD (Local Government Directory) hierarchy with stable codes.

### Admin surfaces (`/admin/*`, magic-link + `editor` role required)

| Route | Purpose |
|---|---|
| `/admin` | Queue overview: counts by queue type, recent activity, freshness alerts |
| `/admin/review/[id]` | Split-view review screen: source ↔ draft ↔ structured fields |
| `/admin/drafts` | AI-drafted entries awaiting review |
| `/admin/discovery` | Discovery candidates awaiting triage |
| `/admin/freshness` | Entries flagged by freshness sweep |
| `/admin/submissions` | Contributor-submitted entries |
| `/admin/sources` | Source registry CRUD: add URLs, set crawl frequency, tier, last-fetched |
| `/admin/runs` | Ingestion run history: status, durations, errors, diff summaries |
| `/admin/organisations`, `/admin/geographies`, `/admin/themes` | Controlled-vocabulary management |
| `/admin/users` | Editor and contributor management |

---

## 8. The public agent preview (v1 demo)

**New for v1, per shape decision.** A scoped preview of the conversational agent that will mature in v2. Ships on `/agent`, clearly labelled.

**Scope of the v1 preview:**

- Single-turn or short multi-turn conversation. Hard cap: 5 turns per session.
- Tool-use against the structured schema (query entries by theme, state, scale, organisation, year range; retrieve resources; list news).
- Citations rendered as Fraunces-numeral superscripts that link to the entry card inline.
- Three suggested starter prompts on first load, written in the platform voice (example: *"What's actually working on water in semi-arid India?"*).
- Rate-limited per IP and per session. Cost-capped per day via a hard ceiling configured in env.
- Visible "Preview" badge in the surface; one-line copy: *"The full agent ships in v2. This is a demo working with the current library of {N} entries."*
- Refusal copy designed: *"Not enough in the library yet to answer that with confidence."* Refusal is a designed state, not an edge case.
- **No off-topic answers.** System prompt scopes the agent strictly to the CAT Platform library. If asked about anything else, it returns the refusal copy plus three relevant entry suggestions.
- Conversation export to PDF deferred to v2.

**What this preview is for:**

- Demonstrates the platform's v2 direction to funders and partners.
- Generates real usage data on retrieval quality before the full agent build.
- Forces the schema, citation anchors, and refusal copy to be production-ready early.

---

## 9. Schema (canonical reference)

The full schema from the original brief is preserved verbatim and extended below. Treat as authoritative.

### Existing entities (carry forward unchanged)

`Entry`, `Organisation`, `Theme`, `Geography`, `Person`, `Resource`, `News Item`, `Submission` — fields, types, and join tables exactly as in the original brief (§3.2, §3.3). Computed fields (`Organisation.roles_held`, `Theme.entry_count`, `Geography.entry_count`, `Entry.duration`) are computed at query time, never stored.

### New entities (added for the live system)

```typescript
type SourceRegistry = {
  id: string;
  url: string;
  source_type: 'gov_site' | 'ngo_site' | 'research_inst' | 'foundation' | 'news_outlet' | 'partner_report' | 'other';
  trust_tier: 'tier_1_authoritative' | 'tier_2_trusted' | 'tier_3_emerging';
  crawl_frequency_days: number;          // typical 7 or 14
  last_fetched_at: Date | null;
  last_content_hash: string | null;
  is_active: boolean;
  added_by_user_id: string;
  notes: string | null;
};

type IngestionRun = {
  id: string;
  run_type: 'registry_crawl' | 'discovery_agent' | 'draft_writer' | 'freshness_sweep';
  started_at: Date;
  completed_at: Date | null;
  status: 'running' | 'succeeded' | 'failed' | 'partial';
  items_processed: number;
  items_yielded: number;                  // candidates / drafts / flags created
  cost_usd: number | null;                // tracks Anthropic spend per run
  error_log: string | null;
  triggered_by: 'cron' | 'manual';
};

type DiscoveryCandidate = {
  id: string;
  proposed_title: string;
  proposed_summary: string;                // 60-120 words from Claude
  proposed_themes: string[];               // theme slugs
  proposed_geography_name: string;
  proposed_state_code: string;
  proposed_lead_organisation_name: string;
  source_urls: string[];
  confidence_score: number;                // 0-1, from Claude self-rating
  status: 'pending_triage' | 'promoted_to_draft' | 'dismissed' | 'duplicate_of_entry';
  duplicate_of_entry_id: string | null;
  discovered_in_run_id: string;
  triaged_by_user_id: string | null;
  triaged_at: Date | null;
  dismissal_reason: string | null;
};

type DraftEntry = {
  id: string;
  // Mirrors Entry fields above, plus:
  source_passages: { source_url: string; passage: string; position_anchor: string }[];
  citation_map: { sentence_id: string; passage_ids: string[] }[];  // per-sentence provenance
  drafted_by_run_id: string;
  draft_confidence: number;                 // Claude self-rating, 0-1
  editor_notes: string | null;
  approved_for_publication_at: Date | null;
  approved_by_user_id: string | null;
  // On approval, this draft is materialised into an Entry row.
};

type FreshnessFlag = {
  id: string;
  entry_id: string;
  detected_in_run_id: string;
  detected_at: Date;
  source_url: string;
  diff_summary: string;                     // Claude-generated, 1-3 sentences
  status: 'pending_review' | 'redrafted' | 'dismissed_no_change_warranted';
  reviewed_by_user_id: string | null;
};

type EntryRevision = {
  id: string;
  entry_id: string;
  revised_at: Date;
  revised_by_user_id: string;
  fields_changed: string[];                 // array of Entry field names
  before_snapshot: Record<string, unknown>;
  after_snapshot: Record<string, unknown>;
  trigger: 'manual_edit' | 'freshness_redraft' | 'submission_approval';
};

type AgentConversation = {
  id: string;
  session_token: string;                    // anonymous IP + UA hash
  started_at: Date;
  turn_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  cost_usd: number;
  was_refused: boolean;
  refusal_reason: string | null;
  cited_entry_ids: string[];                // for retrieval quality eval
};

type AgentTurn = {
  id: string;
  conversation_id: string;
  turn_index: number;
  user_message: string;
  assistant_message: string;
  tool_calls: { tool: string; args: unknown; result: unknown }[];
  cited_entry_ids: string[];
};

// Vector store on entry narratives
type EntryEmbedding = {
  entry_id: string;
  chunk_index: number;                      // narrative split into ~500-token chunks
  chunk_text: string;
  chunk_kind: 'context' | 'attempted' | 'achieved' | 'worked' | 'did_not_work' | 'tagline';
  embedding: number[];                      // pgvector(1536) or matching model dim
  generated_at: Date;
};
```

### Extensions to existing entities

```typescript
// Entry gets:
last_reviewed_at: Date;                      // distinct from last_updated; drives freshness UI
needs_update_reason: string | null;          // populated by freshness sweep
ai_draft_source_id: string | null;           // FK to DraftEntry it was approved from, if any

// User (Auth.js) gets:
role: 'reader' | 'contributor' | 'editor' | 'admin';
// reader = magic-link only, no posting (rare; kept for future)
// contributor = submit entries, resources, news
// editor = full admin desk access
// admin = editor + user management + source registry CRUD
```

### Computed fields (still never stored)

`Organisation.roles_held`, `Theme.entry_count`, `Geography.entry_count`, `Entry.duration`, plus:

- `Entry.is_stale` — boolean, true if `last_reviewed_at` > 6 months ago.
- `SourceRegistry.is_due_for_crawl` — boolean, true if `last_fetched_at + crawl_frequency_days` < now.

---

## 10. Controlled vocabularies (locked)

All eight themes, seven scale bands, six organisation roles, three CAT endorsement tiers, and the 28 states + 8 UTs list carry forward verbatim from the original brief. Reproduced here for completeness:

### Themes (8)

| Slug | Name | Colour |
|---|---|---|
| `soil-land` | Soil & Land | `#8B6F47` |
| `water` | Water | `#3A7CA5` |
| `seeds-biodiversity` | Seeds & Biodiversity | `#A87C4F` |
| `climate-resilience` | Climate Resilience | `#C76A4A` |
| `women-collectives` | Women & Collectives | `#7B6391` |
| `markets-value-chains` | Markets & Value Chains | `#5F8B7A` |
| `policy-governance` | Policy & Governance | `#4A4A4A` |
| `knowledge-capacity` | Knowledge & Capacity | `#9C7B3F` |

### Scale bands (7)

`pilot` · `block` · `district` · `multi_district` · `state` · `multi_state` · `national`

### Organisation roles (6)

`lead_implementer` · `supporting_implementer` · `funder` · `knowledge_partner` · `government_counterpart` · `research_collaborator`

### CAT endorsement tiers (3)

`cat_authored` · `cat_endorsed` · `cat_listed`

### States

Standard 28 + 8 UTs. ISO-style 2-letter codes (JH, OD, MH, UP, etc.). North-eastern states grouped visually on the map but distinct in schema.

---

## 11. Technical stack (locked)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15+ App Router** | SSR for SEO on entries, fast editorial content, one repo for frontend + API |
| Language | **TypeScript, strict** | Schema-heavy product |
| Styling | **Tailwind v3** + custom CSS variables | Brand tokens as variables |
| Components | Hand-built; **shadcn/ui** only for form primitives + a11y wrappers | Editorial, not SaaS-default |
| Database | ~~Postgres via Supabase~~ → **Neon Postgres** (June 2026) | Same Postgres + pgvector contract; chosen for the serverless driver and branch databases. Auth via NextAuth, storage via Vercel Blob. |
| ORM | **Drizzle** | Type-safe, schema-as-code |
| Auth | **Auth.js, magic-link via Resend** | No passwords. Standard. Role flag on user. |
| Search (lexical) | **Postgres full-text** | No Elasticsearch, no Algolia |
| Search (semantic) | **pgvector** + ~~Anthropic~~ **NVIDIA `nv-embedqa-e5-v5`** embeddings (1024-dim, June 2026) | Powers `/search` synthesis, `/agent` retrieval, and the per-landscape Ask over LIP chunks. Also enables `pg_trgm` fuzzy geography search. |
| AI layer | **Anthropic Claude API via Vercel AI SDK** | Discovery agent, draft writer, freshness diff summaries, public agent preview |
| Web search (discovery agent) | **Anthropic web search tool** | Allowlisted domains. Locked. |
| PDF ingestion | **Claude file-upload at draft time** | Cost-effective; revisit a separate parser only if citation accuracy proves insufficient on the first 25 entries |
| Map | Editorial atlas: **custom SVG** from Datameet/OCHA GeoJSON → Mapshaper 5% → d3-geo Mercator → SVGOMG, plus overlay GeoJSON for landscapes and river basins. **Organizations explorer (June 2026): Leaflet + markercluster** (from unpkg) for clustering hundreds of work-location markers. The "no Leaflet" rule still holds for the editorial atlas; raise before extending Leaflet elsewhere. |
| Hosting | **Vercel** (frontend + cron + edge functions) | Single platform; cron for ingestion |
| Image storage | **Supabase Storage** | Consolidated with DB provider; cheaper than R2 + DB elsewhere |
| Email | **Resend** | Magic-link, submission acknowledgements, revision notifications |
| Observability | **Vercel Analytics + Sentry (errors only)** | Lean. No Mixpanel, no Amplitude. |
| Cost guardrails | Per-run cost capture in `IngestionRun.cost_usd`; daily ceiling for `/agent` configured in env | Anthropic spend stays visible and bounded |

**Not used:** Redux/Zustand (RSC + URL state), separate API service (Route Handlers), Leaflet/Mapbox (custom SVG), Algolia/Elasticsearch (Postgres FTS + pgvector), Mixpanel/Amplitude (analytics is paper-thin in v1), shadcn Card/Dialog/Carousel defaults (build editorial components from scratch).

---

## 12. Auth model (locked, global-standard simple)

- **Auth.js magic-link** for everyone. One mechanism, one mental model.
- **User.role** field: `reader` | `contributor` | `editor` | `admin`.
- Contributors get access to `/contribute/*`.
- Editors get access to `/admin/*`.
- Admins additionally manage source registry and user roles.
- No password. No 2FA in v1 (industry-standard for editorial CMSes at this scale; revisit if a partner org requires it).
- Magic-link emails styled in the platform voice — they are not generic SaaS templates.

---

## 13. Versioning and provenance (locked, public/admin split)

- **Public entry detail shows:** latest version only, `published_date`, `last_reviewed_at` in mono meta. Stale (>6 months) goes red. If `editorial_status = needs_update`, a subtle amber line above the entry: *"Source updated {date}, under editorial review."* — the entry remains readable.
- **Admin shows:** full `EntryRevision` history per entry, including AI-draft origin, every editor edit, every freshness-driven redraft. Diffs viewable.
- **No silent edits** to published prose. Every change to a published entry creates a new `EntryRevision` row.

---

## 14. Build sequence (extended from the original §7)

Strict order. Each phase depends on the previous being clean.

### Phase 1 — Foundation (target: 2 weeks)

- Next.js + TS + Tailwind + Drizzle + Supabase Postgres scaffold.
- Full schema in Drizzle migrations including the new entities (sources, ingestion runs, discovery candidates, draft entries, freshness flags, entry revisions, agent conversations, embeddings).
- Design system tokens, font loading, base typographic classes.
- Top nav, brand bar, layout shell.
- Auth.js magic-link via Resend, role flag on user, route guards.
- Seed: 5 fake Entries, 8 Themes (locked list), 10 Organisations, 30 Geographies, 5 source registry rows.

### Phase 2 — Public read-only (target: 2 weeks)

- Landing (hero, atlas, featured, themes, news strip).
- **India map** built per §6 of the original brief, including real GeoJSON + landscape and river-basin overlays.
- Entry detail with all four narrative blocks at equal weight, "what did not work" red callout, last-reviewed date with stale signal.
- Organisation detail with `roles_held` aggregation.
- Theme detail.
- `/resources` and `/news` index pages.
- `/about`, `/editorial-process`, `/style-guide` static pages.
- URL state for all filters.

### Phase 3 — Search and the AI surfaces (target: 2 weeks)

- Postgres full-text search across Entry titles, taglines, narratives.
- Filter UI: state, theme chips, scale band, year range. Combined with search via URL state.
- pgvector embeddings pipeline: on entry publish/update, generate chunk embeddings.
- `/search` synthesis paragraph: retrieve top-5 chunks, Claude generates 2-sentence synthesis with citation superscripts.
- `/agent` preview: tool-use against the schema, three starter prompts, 5-turn cap, rate limits, refusal copy, cost ceiling.

### Phase 4 — Ingestion pipeline (target: 2 weeks)

- Source registry CRUD in admin.
- Registry crawler cron job (weekly): fetch, hash, diff, mark `IngestionRun`.
- Discovery agent cron job (weekly): Claude + Anthropic web search, allowlisted domains, yields `DiscoveryCandidate` rows.
- Draft writer: triggered by registry diffs and promoted discovery candidates; Claude reads source (HTML + PDF), drafts all five narrative blocks with citation anchors, yields `DraftEntry`.
- Freshness sweep cron job (daily): re-fetch sources of published entries, mark `FreshnessFlag` on detected change.
- Cost capture per run.

### Phase 5 — Admin desk (target: 2 weeks)

- `/admin` queue overview.
- Side-by-side review screen for drafts (source ↔ draft ↔ fields), with citation-anchor sync.
- Triage screen for discovery candidates.
- Freshness flag review screen.
- Contributor submission review screen.
- Source registry management UI.
- Ingestion run history view.
- Keyboard shortcuts (j, k, Enter, a, r, s).

### Phase 6 — Contribution workflow (target: 1 week)

- `/contribute/entry`, `/contribute/resource`, `/contribute/news` forms.
- Multi-step with autosave.
- Submission email acknowledgements via Resend.
- Editorial revision-requested flow with inline notes.

### Phase 7 — Polish, accessibility, launch (target: 1 week)

- Funder report builder v1 (PDF brief from filters via `@react-pdf/renderer`).
- Performance pass (bundle analysis, image optimisation, RSC review).
- Accessibility pass (keyboard nav, screen reader labels, AA contrast, focus rings).
- Seed real launch content: 25 entries via the ingestion pipeline + CAT editorial review.
- Editorial-process page finalised; transparency about the AI loop.
- Cost dashboards live in admin.
- Launch.

### Phase 8 — Post-launch v2 (deferred, scoped here for clarity)

- Full conversational agent (multi-turn, exportable, follow-up suggestions, chart rendering inline).
- Funder portfolio gap analysis in the agent.
- Multi-language UI (Hindi, regional).
- Public API and data downloads.
- Federated identity for contributors.
- Programme-of-programmes nesting if needed.

### Phase 9: Landscapes pillar, climate, geography (shipped, June 2026)

Realised after the editorial launch. The numbering follows §8 because it post-dates it; the work is live, not deferred.

- **Landscapes pillar:** the cover wall and per-landscape Profile / Budget / Insights / Climate / Ask, fed by the Landscape Investment Plans. Budget + RAG ingested from the LIP workbook and narrative via `scripts/ingest-landscape.mjs` (handles both the legacy "5.2" and the newer "Landscape Clean" workbook layouts). Three landscapes published (Patratu, Mau, Dharashiv).
- **Currency system:** INR / USD / EUR with live ECB rates (`/api/rates`), one control top-right of each landscape page driving every figure, persisted across tabs.
- **Climate valuation:** the modelled three-track valuation with the investment-to-return ratio, interactive track focus, co-benefit disclosure, carbon marketability split, and funder-lens accordion. Ingested by `scripts/ingest-climate.mjs`; aggregates read from the workbook's cached headline block. Contractor name never surfaced.
- **Canonical geography:** `cat.geographies` extended with `lgd_code` / `source` / `verified` and a `pg_trgm` trigram index; the full India tree loaded (36 states, 693 districts, 6,940 blocks, 262,561 villages) via `scripts/geo-import-full.mjs`; `/api/geo/search` (fuzzy, full-path) and `/api/geo/children` (cascade); the `GeographyPicker` type-ahead component, piloted on the organization-submission location editor.
- **QA:** a manual testing script for the team lives at `TESTING.md`.

---

## 15. Cost and operational notes

- **AI spend** is the largest variable cost. Captured per `IngestionRun` and per `AgentConversation`. Visible to admins. Daily ceilings configured in env.
- **Crawl politeness:** registry crawler respects robots.txt, sets a descriptive User-Agent ("CATPlatform/1.0 editorial-ingestion contact: editors@cat.org.in"), rate-limits to 1 request per source per minute.
- **Source removal:** if a source 404s or rate-limits us, the registry row is auto-deactivated and an admin is notified.
- **Data export:** every entry, organisation, theme is exportable as JSON (admin-only in v1, public in v2 per §14 Phase 8).
- **Backups:** Supabase automatic daily snapshots; weekly off-platform export to S3-compatible storage retained 90 days.

---

## 16. Accessibility (locked)

- WCAG AA minimum, strive for AAA on body text contrast.
- Keyboard-navigable everywhere. The admin desk is explicitly keyboard-first.
- Screen reader labels on the India map: every state path has an accessible name; dots have `<title>` elements with programme + state + scale; the map has a parallel `<nav>` of state links for assistive tech that does not interact well with SVG.
- All interactive elements ≥ 44×44px touch target on mobile.
- Reduce-motion honoured: the map's staggered dot reveal collapses to a single fade for users who prefer reduced motion.

---

## 17. Anti-references (the AI slop test)

Match-and-refuse. If a screen could be guessed from the category alone, it has failed.

- **Public surface must not look like:** a SaaS dashboard, an observability tool, a Notion page, a Medium article, a generic Tailwind starter, an AI-chat product, a fintech landing page.
- **Admin must not look like:** Jira, Linear, Notion, a generic CRM, a Zendesk queue, a moderation tool.
- **The map must not look like:** Google Maps, Mapbox default styling, a public-health-dashboard chloropleth, a covid tracker.
- **The agent surface must not look like:** ChatGPT, Claude.ai, Perplexity, a chatbot widget pinned to the corner.

---

## 18. Source files in this workspace

| File | Purpose |
|---|---|
| `PRODUCT.md` | This file. Hand to `$impeccable craft` and to any contributor onboarding. |
| `DESIGN.md` | The design system: tokens, typography, motion, bans, and the component inventory (landscape, climate, geography, currency). |
| `TESTING.md` | Manual QA script for the team, plus the latest automated smoke-test results. |
| `/mockup/cat_platform_mockup.html` | Original visual reference (carry forward as input). |
| `/cat-landing.html` | Static landing prototype produced in `$impeccable` session 2026-05-13. Carries forward as the public-surface visual baseline. |
| `/docs/CAT_Dashboard_PRD_v1.docx` | Original PRD: background context, audience reasoning, agreed principles. |
| `/docs/CAT_Dashboard_Design_Features.pptx` | Original feature deck. |

**When in doubt:** the mockup is the visual truth, this file is the structural truth, the original PRD is the rationale.

---

## 19. How to update this file

When a major piece of work completes, append to §14 (build sequence) with what was done and date.

When a structural decision changes after a real argument, update the relevant section and note the change with a one-line reason. Do not silently change locked decisions.

If the schema is missing something the product needs, raise it before adding fields. Schema sprawl is the most common way these platforms die.

---

*Plan authored 14 May 2026 by Sandeep Nayak through `$impeccable shape` (Round 1 to 3 discovery) on the foundation of the original CLAUDE.md (13 May 2026). Live-system sync 17 June 2026 (§0, Landscape surfaces in §7, stack notes in §11, Phase 9 in §14).*
