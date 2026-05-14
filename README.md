# CAT Platform

A curated, editorial dashboard of credible food-systems work in India. Built per [PRODUCT.md](./PRODUCT.md).

## What's in this scaffold (Phase 1 + 2 foundation)

Public read-only surface, real Next.js 15 App Router app:

- Landing with hero, atlas (India map + entry list with state filter), stat strip, theme grid, featured entry.
- Entry detail with four narrative blocks at equal weight and a red-tinted "what did not work" callout.
- Theme detail with editorial intro and entry reading list.
- Organisation detail with `roles_held` aggregation computed at query time.
- Full Drizzle schema covering every entity in PRODUCT.md §9, including the ingestion pipeline (source registry, ingestion runs, discovery candidates, draft entries, freshness flags, entry revisions, agent conversations, vector store).
- Seed script with 8 themes, 30 state geographies, 10 organisations, 5 launch entries.
- d3-geo–projected India map that loads real Datameet admin-1 boundaries; dots are projected from real lat/lng.

Not yet built (next phases per PRODUCT.md §14):

- /search · /agent preview · /contribute · /admin desk · ingestion pipeline · auth · public agent.

## Stack

Next.js 15 · React 19 · TypeScript strict · Tailwind v3 · Drizzle ORM · Postgres (Supabase) · Auth.js magic-link · d3-geo · Anthropic Claude API · Resend.

## Setup

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# fill in DATABASE_URL, AUTH_SECRET, AUTH_URL, RESEND_API_KEY, ANTHROPIC_API_KEY

# 3. Provision the database (Supabase or local Postgres)
npm run db:generate         # generate SQL migration from schema
npm run db:migrate          # apply migrations

# 4. Seed
npm run db:seed             # 8 themes, 30 states, 10 orgs, 5 entries, 5 sources

# 5. Download India admin-1 GeoJSON for the atlas map
npm run geo:download        # writes public/geo/india-states.json
# Optional: simplify with Mapshaper to ~5% retention
# mapshaper public/geo/india-states.json -simplify 5% -o force public/geo/india-states.json

# 6. Run
npm run dev                 # http://localhost:3000
```

## Project structure

```
app/
  (public)/
    page.tsx                  # landing
    entry/[slug]/page.tsx     # entry detail with narrative blocks
    theme/[slug]/page.tsx     # theme detail
    organisation/[slug]/page.tsx
  api/                        # route handlers (next phases)
  admin/                      # editorial desk (next phases)
  layout.tsx                  # root, fonts, brand bar + footer
  globals.css                 # tokens + base type + map styles

components/
  layout/   BrandBar.tsx, Footer.tsx
  map/      IndiaMap.tsx, projection.ts
  entries/  EntryListItem.tsx, AtlasSection.tsx
  ui/       ThemeChip.tsx, EndorsementBadge.tsx, StatStrip.tsx, SectionHead.tsx

lib/
  db/       schema.ts, index.ts, queries.ts, seed-data.ts
  ai/       (Anthropic Claude wrappers — next phases)
  seo/      (open graph helpers — next phases)

scripts/
  migrate.ts                  # apply Drizzle migrations
  seed.ts                     # seed themes, geos, orgs, entries, sources
  download-geojson.mjs        # fetch Datameet admin-1 boundaries

drizzle/migrations/           # generated SQL migrations

public/
  geo/                        # india-states.json (downloaded, gitignored)
  images/
```

## Design system (locked, see PRODUCT.md §4)

Tokens live in `app/globals.css` and are exposed to Tailwind through `tailwind.config.ts`.

- **Palette**: paper / cream surface, deep-teal + teal for identity, amber ≤10% as the only accent, red-alert reserved for staleness and "what did not work".
- **Type**: Fraunces serif for headings + italic editorial signature · Inter sans for body and UI · JetBrains Mono uppercase for meta and badges.
- **No em dashes anywhere.** Locked across code, copy, comments.

## Standing rules (carry from PRODUCT.md §5)

1. Curated, not crowdsourced.
2. Programme-level, never activity-level.
3. "What did not work" is required design infrastructure.
4. AI scales production, never editorial judgement.
5. Funders never register.
6. The map is not GIS.
7. Honest provenance.
8. One visual language, two surfaces (public + admin).
9. Plain language, no marketing words.
10. Schema discipline.

## Reference

- [PRODUCT.md](./PRODUCT.md) — full product brief
- [DESIGN.md](./DESIGN.md) — design system tokens and component inventory (to be finalised after first build iteration)
- Static landing prototype: `../cat-landing.html` — the visual contract for this Next.js port
