/**
 * The Hub palette for JavaScript and SVG use (chart fills, inline styles,
 * category colours). These mirror the CSS custom properties in
 * app/globals.css one for one, so a colour is defined once in each world.
 * Prefer the CSS token (Tailwind class or var(--name)) in markup; reach for
 * this module only where a raw hex string is needed (e.g. `${hex}1a` alpha).
 * Never hard-code a hex in a component: add it here and to globals.css.
 */
export const palette = {
  teal: "#2e7573", // --teal: CTA, links, the single working accent
  deepTeal: "#334b4a", // --deep-teal
  tealSoft: "#95b1af", // --teal-soft
  periwinkleDeep: "#5e6990", // --periwinkle-deep: secondary mark colour
  periwinkleText: "#5c6796", // --periwinkle-text: periwinkle readable as text
  periwinkle: "#929cc5", // --periwinkle: fills only, too light for text
  amber: "#f8ca7c", // --amber: highlight fill, amber on dark
  amberDeep: "#8a5f14", // --amber-deep: amber text on light surfaces
  ochre: "#c68c2e", // --ochre: warm data fill (livestock, grants, community)
  leaf: "#5c8c2e", // --leaf: green data fill (forestry, seeds)
  redAlert: "#b85042", // --red-alert: errors, debt, "what did not work"
} as const;

export type PaletteKey = keyof typeof palette;
