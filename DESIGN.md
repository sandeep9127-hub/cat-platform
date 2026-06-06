# DESIGN.md — Transformation Hub

The design system for the Transformation Hub, the public platform of the
**Consortium for Agroecological Transformations** (agroecologyindia.org). This
file encodes the brand decisions agreed against the parent-site brand spec, so
visual work stays consistent. Register: **brand** for the marketing surfaces
(landing, chrome), **product** for the tools (Atlas, admin, Ask).

## Relationship to the parent brand (agroecologyindia.org)

The Hub is a child surface of the Consortium. We align where it reinforces one
identity and deviate only where the Hub's job (a dense, source-verified atlas)
needs something the marketing site does not.

| Parent brand token | Decision on the Hub |
|---|---|
| Teal `#2e7573` (secondary / surface) | **Adopt exactly.** It is our `--teal`. Used for links, CTAs, eyebrows, accents. |
| Slate / indigo `#646d95` (tertiary) | Adopt as the secondary mark colour (the CAT "leaf"); used in the logo. |
| Pill radius `50px` | Adopt. CTAs are `rounded-full`. |
| Motion `200 / 300 / 500ms` | Adopt. Paired with `ease-out-expo`. |
| Tone: concise, confident, implementation-focused | Adopt verbatim. |
| Primary font **Afacad** | **Do not adopt.** The Hub is all-**Inter** (broadsheet consistency across data-dense surfaces). |
| Surface base `#000000` (pure black) | **Do not adopt.** The Hub is built on warm cream / near-black ink, never pure black or pure white. |

Cross-linking is intentional and reciprocal: the Hub links out to
agroecologyindia.org in the header, footer, and the home "approach" band.

## Colour

OKLCH-minded, every neutral tinted warm. Never `#000` / `#fff`.

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#faf9f5` | Base surface (warm cream) |
| `--cream` | `#f3f1ea` | Recessed / banded surface |
| `--ink` | `#16130d` | Primary text (near-black, warm) |
| `--ink-soft` | `#57544c` | Body / secondary text |
| `--muted` | `#807c72` | Eyebrows, meta, mono labels |
| `--line` | `#d7d4cc` | Hairlines, grid dividers |
| `--teal` | `#2e7573` | **CTA / link / accent** (parent brand teal) |
| `--deep-teal` | `#334b4a` | Solid CTA fill, headings-on-dark |
| `--amber` | `#f8ca7c` | Highlight / alert fill, amber-on-dark |
| `--amber-deep` | `#946616` | **Amber text on light surfaces** (eyebrow labels, hero highlight) |

**Strategy: restrained.** Tinted neutrals carry the page; teal is the single
working accent (CTA, links); amber is the one highlight/alert colour. The hero
headline highlights "food systems" in `--amber-deep` against ink — teal and
amber complement, never compete.

## Typography

- **All Inter.** `--font-inter` is loaded locally; `--font-fraunces` and
  `--font-jetbrains` are remapped to Inter. No serif revival.
- Headings: `font-semibold`, tight tracking (`-0.03em` to `-0.04em`), short
  measures (`max-w-[15ch]` on the hero).
- Body capped at 60–70ch. Hierarchy via scale + weight (≥1.25 ratio).
- Mono (`--font-jetbrains` → Inter) only for eyebrows / meta / counts, uppercase
  with `0.14em`–`0.18em` tracking.

## Layout & motion

- `max-w-page` = 1200px. Section rhythm via soft cream/paper **tonal bands**,
  not hard rules (the "spreadsheet rule" is reserved, used sparingly).
- Hairline-grid panels: `gap-px bg-line border border-line`.
- `hoverOnlyWhenSupported` gates all `hover:` behind real pointers.
- Motion eases out (`ease-out-expo`); press feedback `active:scale-[0.97–0.99]`.
  Never animate layout properties. No bounce, no elastic.

## Bans (house rules)

- No em dashes in copy. Commas, colons, periods, parentheses.
- No side-stripe (`border-left`) accents. Full borders, tints, or leading
  icons/numbers instead.
- No gradient text, no decorative glassmorphism, no pure black/white.
- Forms use the "soft register" (cream-fill rounded inputs, pill submit); data
  surfaces stay sharp. Keep the two distinct.

## Iconography

- Intervention categories and the 13 agroecology principles are represented by
  **icons**, not colour dots: lucide line icons for categories (`categoryIconFor`),
  the official principle PNGs for principles. Colour is carried by the icon, kept
  restrained.
