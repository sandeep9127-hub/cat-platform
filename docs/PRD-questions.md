# CAT Platform — PRD as questions for the team

This is every decision baked into the v1 build, reverse-engineered as a question for the
team to answer. The "Current answer" is what we've already built; if the team disagrees,
that's the cue to revise before launch.

How to use this doc: walk the team through it in the order below. For each question, capture
either **Confirmed** or **Revise** + the new direction. Anything marked Revise becomes a
batch on the roadmap.

Last updated: 14 May 2026 · CAT Platform v1 build

---

## A. Positioning and audience

**A1. What is this Platform for?**
*Current answer:* A public, curated, editorial record of credible food-systems work in
India. Curated by CAT, not limited to CAT's portfolio.
*Sub-question:* Should the public copy say "food systems" or "agroecology" as the subject
matter? Right now public copy says food systems; "agroecology" is reserved for CAT's
organisational name only.

**A2. Who do we design for first, when choices conflict?**
*Current answer:* (1) Funders and their advisors, (2) NGO programme designers,
(3) researchers and journalists, (4) government and policy actors.
*Sub-question:* Is the casual web visitor explicitly NOT in this list? (Current answer:
correct, we are not SEO-bait.)

**A3. Is CAT the editor, the subject, or both?**
*Current answer:* CAT is the editor. CAT's own landscapes show up as entries among others,
not as the centre of gravity.

**A4. What is the editorial bar?**
*Current answer:* Treat every entry as if a funder, the originating organisation, and a
critical journalist will all read it.

**A5. Is "what did not work" required on every entry?**
*Current answer:* Yes. Required field, given equal visual weight, never demoted.

---

## B. Scope of v1

**B1. What ships in v1?**
*Current answer:* Phases 1–7 of PRODUCT.md §14, i.e. full launch-ready: public surface,
search, agent preview, ingestion pipeline, admin desk, contribution flow, polish.

**B2. What's the success signal?**
*Current answer:* All three of these matter equally: (a) a funder reads cold,
(b) partners self-submit, (c) it's the reference link in food-systems conversations.

**B3. What's the time pressure?**
*Current answer:* No deadline, build properly.

**B4. What is explicitly out of v1?**
*Current answer:* Multi-language UI · public API + downloads · programme-of-programmes
nesting · federated identity (Google/LinkedIn) · the full conversational agent
(v1 ships a preview only).

---

## C. Content strategy

**C1. Where does the launch content come from?**
*Current answer:* CAT-authored from internet sources via an automated ingestion pipeline,
reviewed and approved by CAT admins before any publication. Target: 20–30 entries at
launch (currently 5 seeded).

**C2. What does the ingestion crawler crawl?**
*Current answer:* Hybrid: a curated source registry (80–150 trusted URLs: state agri depts,
NABARD/IFAD project pages, partner annual reports, key research institutions) + a separate
weekly discovery agent that uses Claude with web search, allowlisted to .gov.in, .org,
and major news domains.

**C3. How deep does the AI write the entries?**
*Current answer:* Claude/Kimi drafts the five narrative blocks (Context, Attempted,
Achieved, Worked, Did not work) with inline citations to source passages. A CAT editor
sees the source ↔ draft side by side and edits before approval.

**C4. Where does AI stop?**
*Current answer:* AI never decides what publishes. AI never silently edits a published
entry. Every public entry has a human approval recorded in entry_revisions.

**C5. What's the freshness model when a source changes?**
*Current answer:* Flag, never auto-edit. A daily freshness sweep detects source-content
changes, marks the entry needs_update, surfaces a one-line diff in the admin queue. Public
prose only changes through editor approval.

---

## D. Reader-facing AI

**D1. Does AI surface to readers at all in v1?**
*Current answer:* Yes — a scoped /agent preview labelled as a v1 demo. 5-turn cap per
session, strictly scoped to the library, refuses off-topic questions politely.

**D2. Which LLM powers what?**
*Current answer:*
- /agent preview + draft writer → Kimi K2.6 via NVIDIA's hosted API (free tier).
- Discovery agent → Anthropic Claude (only one with the web_search tool).
*Sub-question:* If NVIDIA latency stays at 60–180s/turn, do we pay for faster Anthropic
calls on /agent, or accept the slow free-tier latency for v1 demo?

**D3. Does the search surface get a semantic synthesis paragraph?**
*Current answer:* Deferred. v1 ships full-text search (Postgres FTS). The pgvector
infrastructure is in the schema and ready to wire; semantic synthesis added when the
library crosses ~80 entries.

**D4. Cost ceiling on the agent?**
*Current answer:* Daily turn ceiling, default 500 turns/day. Kimi is effectively free;
Anthropic discovery runs are tracked per-run. Daily USD ceiling AGENT_DAILY_USD_CEILING=5
remains for Anthropic-fallback safety.

---

## E. Endorsement tiers and provenance

**E1. Are there tiers of CAT endorsement?**
*Current answer:* Three tiers, locked vocabulary:
- **CAT Authored** — CAT researched and wrote it. CAT vouches for the prose.
- **CAT Endorsed** — Self-submitted by the lead organisation, reviewed and endorsed by CAT.
- **CAT Listed** — Programme exists, CAT does not vouch for the description.

**E2. Are these tiers visible to readers?**
*Current answer:* Yes. Badge on every entry card + hover tooltip + editorial legend
under the stat strip on the landing.

**E3. Versioning on the public surface?**
*Current answer:* Public sees latest version + last_reviewed_at date. Stale (>6 months)
goes red. Full revision history is admin-only.

---

## F. Conceptual model from CAT's actual work

**F1. How does CAT's landscape-based approach show up?**
*Current answer:* Landscapes are first-class entities. The 11 focus landscapes (Ahwa,
Chitrakonda, Dantewada, Dharashiv, Khatarshnong Laitkroh, Mau, Pangi, Patharpratima,
Patratu, Rajnagar, Vempalli) each get an index card on /landscapes and a detail page with
LIP status, context, levers callout, and related programmes in the parent state.

**F2. Three Levers (Policy / Markets / Finance) — visible?**
*Current answer:* Yes. Dedicated section on /about and a sidebar callout on every
landscape detail.

**F3. Time horizon language?**
*Current answer:* Adopt CAT's stated "minimum seven years per landscape" framing on
/about and /editorial-process. Drives the publication's pace: programmes are added when
defensible, not on a release schedule.

**F4. Is this Platform the "Bharat Agroecology Tracker" / "Landscape Dashboard"
referenced on agroecologyindia.org?**
*Open question — needs the team's call.* Three options:
- (a) Yes, this IS that tracker. Rename or cross-link.
- (b) No, this is a sibling. Reference and federate.
- (c) Unclear yet, decide at month 3.

---

## G. India map

**G1. How is India represented?**
*Current answer:* Illustrative editorial map, not a survey-grade GIS. Custom SVG built
from real Datameet/jbrobst admin-1 GeoJSON, simplified via Mapshaper, projected with
d3-geo Mercator.

**G2. What goes on the map?**
*Current answer:* Programme dots projected from each entry's primary geography lat/lng.
Halo size encodes scale_band (pilot → national). Colour encodes provenance (teal =
self-submitted, amber = CAT-sourced).

**G3. Overlay layers?**
*Current answer:* Schema supports landscape polygons + river basins + agro-climatic zones
as toggleable layers. v1 ships the 11 landscapes as approximate polygons; rich overlays
are v2.

**G4. Map interactions?**
*Current answer:* Hover/click a state to filter the entry list; click a dot to open the
entry; tooltip with title + scale + provenance on dot hover. Filter chip above the entry
list synced both ways. Mobile collapses to horizontal state chips (deferred — currently
shows the same SVG at smaller scale).

---

## H. Editorial process and admin

**H1. Where do CAT editors live in this system?**
*Current answer:* `/admin/*`, gated by magic-link auth + a `role = "editor"` flag on the
user. Currently in dev this is gated by `ADMIN_BYPASS=1`; production needs the role check
wired (Part 1 of the to-do).

**H2. What do editors see?**
*Current answer:* Four queues: AI drafts · Discovery candidates · Freshness flags ·
Contributor submissions. Plus a side-by-side review screen (source ↔ draft ↔ structured
fields).

**H3. Keyboard-first editor?**
*Current answer:* `j`/`k` navigate, `Enter` opens, `a` approve, `r` return, `s` save.
The editor should rarely touch the trackpad.

**H4. Does an entry ever get edited silently after publication?**
*Current answer:* No. Every change to a published entry creates an EntryRevision row.
The public surface shows the latest version + a last-reviewed date.

---

## I. Voice, copy, and brand

**I1. What are the standing copy rules?**
*Current answer:*
- No em dashes anywhere (use commas, full stops, colons, parentheses).
- No marketing words: "leverage", "stakeholder", "ecosystem", "transformative", "synergy".
- "agroecology" never appears in user-facing copy as a topic, even though it's in CAT's
  organisational name (which we display in the brand bar).
- Programme level, never activity level.
- Plain, declarative, short sentences.

**I2. What's the design lineage?**
*Current answer:* Editorial publication, not SaaS. References: *The Atlantic* feature
articles, *Our World in Data*, *Stripe Press*. Not the AEI single-font Afacad campaign
style.

**I3. Typography?**
*Current answer:* Fraunces (serif, headings + italic ledes) + Inter (sans, body + UI) +
JetBrains Mono (uppercase meta, badges, eyebrows, numeric data). Three-font editorial
system.

**I4. Palette?**
*Current answer:* Full official CAT palette per the HEX PDF: deep-teal #334B4A · teal
#2E7573 · periwinkle #929CC5 / #5E6990 · accents amber #F8CA7C / peach #F8A07B / rose
#C68F95 · paper #FBF8F2 surface. No purple-on-white, no gradient text.

**I5. Light or dark mode?**
*Current answer:* Light only. Locked by the scene sentence (funder reading at 11am, CAT
editor reading at 9pm — both want high-contrast paper-tone for prose comparison).

**I6. Animation philosophy?**
*Current answer:* CSS-only motion. Staggered reveals on first paint, slow dot pulse on
the map, hover micro-interactions, prefers-reduced-motion honoured.

---

## J. Three architectural questions (parked, need a decision before public launch)

These are the open questions from the impeccable critique. The Platform works without
deciding them, but they shape the landing IA.

**J1. Lead-with-one-entry vs. lead-with-the-list?**
*Current answer:* Lead with the list + atlas (current). Alternative: lead with a single
hero entry of the edition, atlas demoted.

**J2. Atlas centre-of-gravity or supporting view?**
*Current answer:* Co-equal with the entry list on the landing. Alternative: demote to
/map, recover the landing column for editorial copy.

**J3. "What did not work" — fifth narrative block or first?**
*Current answer:* Fifth (after Worked). Alternative: first — lead each entry with the
honest limitation as a brand signal.

---

## K. Tech stack (locked, but worth confirming the team understands the why)

| Choice | Why |
|---|---|
| Next.js 15 App Router | SSR for SEO on entries, fast editorial content, one repo for frontend + API |
| TypeScript strict | Schema-heavy product |
| Tailwind v3 + CSS variables | Brand tokens as variables |
| Drizzle ORM + Postgres | Type-safe schema-as-code, relational schema (not document) |
| Supabase managed Postgres | India region available (ap-south-1), free tier sufficient, easy migration path |
| Custom Postgres schema `cat` | Isolated from the existing gymsahayak schema sharing the same project, dedicated cat_user role |
| `pg` (node-postgres) | Handles IPv6 (Supabase free-tier direct endpoint is v6-only) |
| Auth.js + magic-link via Resend | No passwords, industry standard, role flag on user |
| Postgres full-text search + pgvector | No Elasticsearch, no Algolia |
| Anthropic Claude API | Discovery agent (needs web_search tool) |
| Kimi K2.6 via NVIDIA | Agent + drafter (free tier, OpenAI-compatible) |
| d3-geo + Datameet GeoJSON | Custom SVG map, not Leaflet/Mapbox |
| Resend | Magic-link + editorial notifications |
| Vercel + cron | Single-platform hosting, scheduled jobs included |
| `@react-pdf/renderer` | Funder PDF briefs (deferred v2) |
| No Redux/Zustand | URL state + React Server Components |
| No separate API service | Route Handlers in the same Next.js app |
| No Mixpanel/Amplitude | Lean analytics (Plausible or Vercel Analytics) |
| No shadcn defaults | Hand-built editorial components; shadcn only for form primitives + a11y |

---

## L. Cost and operations

**L1. AI cost ceiling?**
*Current answer:* Daily USD ceiling default 5 USD for paid LLM (Anthropic). Per-run
cost recorded on IngestionRun for visibility. Kimi is free tier.

**L2. Crawl politeness?**
*Current answer:* Descriptive User-Agent, 1 request per source per minute, robots.txt not
implemented in v1 because we operate from a curated allowlist of sources that already
consented to be crawled.

**L3. Backups?**
*Current answer:* Supabase automatic daily snapshots; off-platform weekly export to S3 is
in Part 2 (Full production).

**L4. Source removal policy?**
*Current answer:* If a source 404s or rate-limits us, auto-deactivate after 3 misses + an
admin email. (Auto-deactivate not yet implemented; tracked in Part 2.)

---

## M. Accessibility, performance, and platform

**M1. Accessibility target?**
*Current answer:* WCAG AA minimum, strive for AAA on body-text contrast. Keyboard
navigable everywhere. Screen-reader labels on the map. Reduced-motion honoured.

**M2. Performance target?**
*Current answer:* Lighthouse Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95,
SEO ≥ 95 on the landing + a typical entry page.

**M3. Browser support?**
*Current answer:* Chrome, Safari, Firefox, Edge — desktop. iOS Safari, Android Chrome —
mobile. iPad Safari, Android tablet. No IE.

**M4. Hosting region?**
*Current answer:* Vercel edge (global). Postgres in ap-south-1 (Mumbai) for India
latency.

---

## N. Open questions to bring back to the team

These don't have current answers yet. Decide together.

1. **Domain name.** `cat-platform.org`? `dashboard.agroecologyindia.org` (subdomain)?
   Something shorter?
2. **Repository visibility.** Currently private GitHub. When does it become public?
   Or never?
3. **Editorial advisory board** vs. just CAT editors as reviewers.
4. **Named editors on entries** vs. anonymous house style.
5. **Photography direction.** Stock vs. commissioned vs. partner-provided. What's on-brand?
6. **Integration with the existing agroecologyindia.org WordPress site.** Two separate
   sites? Embed widgets? Full replacement?
7. **Indian regional languages.** Beyond Hindi, which?
8. **Funder PDF briefs.** When does this ship? (Currently Part 2.)
9. **The 3 architectural questions in J above.**

---

## How to capture answers

When the team walks through this in a meeting:

- For each numbered question, mark **Confirmed**, **Revise**, or **Discuss further**.
- Revised items go into the to-do list (`docs/TODO-mvp-and-production.md`) as a new batch.
- Open questions in N get owners + due dates.

This document is intentionally exhaustive. The point is that the team should disagree
with at least 3-5 items here, because that disagreement is where the strongest signal
lives about what v1 should actually be.

— Sandeep + Claude · 14 May 2026
