/**
 * Supporter organisations as shown on agroecologyindia.org.
 *
 * Each supporter rendered as a typographic monogram card until a real SVG
 * is dropped into public/images/supporters/{slug}.svg, at which point the
 * Supporters component will prefer the image.
 *
 * `tint` is an optional brand-adjacent hint colour used for the monogram
 * accent; kept restrained so the grid reads as a coherent wall.
 */

export type Supporter = {
  slug: string;
  name: string;
  /** Optional short label used on the card; defaults to name */
  short?: string;
  /** Two- or three-letter monogram shown above the wordmark */
  monogram: string;
  /** Brand-adjacent accent colour (OKLCH-equivalent hex) for the monogram */
  tint?: string;
  /** Optional secondary descriptor under the wordmark */
  category?: string;
};

export const SUPPORTERS: Supporter[] = [
  {
    slug: "ate-chandra-foundation",
    name: "ATE Chandra Foundation",
    short: "ATE Chandra",
    monogram: "ate",
    tint: "#C24A2E",
    category: "Foundation",
  },
  {
    slug: "bharat-agroecology-fund",
    name: "Bharat Agroecology Fund",
    short: "Bharat Agroecology Fund",
    monogram: "BAF",
    tint: "#C68C2E",
    category: "Fund",
  },
  {
    slug: "ciff",
    name: "Children's Investment Fund Foundation",
    short: "CIFF",
    monogram: "CIFF",
    tint: "#D62E5C",
    category: "Foundation",
  },
  {
    slug: "csa",
    name: "Centre for Sustainable Agriculture",
    short: "CSA",
    monogram: "CSA",
    tint: "#2E7573",
    category: "Practitioner",
  },
  {
    slug: "giz",
    name: "German Cooperation, implemented by GIZ",
    short: "GIZ",
    monogram: "GIZ",
    tint: "#334B4A",
    category: "Bilateral",
  },
  {
    slug: "india-climate-collaborative",
    name: "India Climate Collaborative",
    short: "India Climate Collaborative",
    monogram: "ICC",
    tint: "#2C7BD0",
    category: "Collaborative",
  },
  {
    slug: "ikea-foundation",
    name: "IKEA Foundation",
    short: "IKEA Foundation",
    monogram: "IKEA",
    tint: "#0058A3",
    category: "Foundation",
  },
  {
    slug: "earthon-foundation",
    name: "EarthON Foundation",
    short: "EarthON",
    monogram: "EON",
    tint: "#2E7573",
    category: "Foundation",
  },
  {
    slug: "rainmatter",
    name: "Rainmatter Foundation",
    short: "Rainmatter",
    monogram: "RM",
    tint: "#8C7A5C",
    category: "Foundation",
  },
  {
    slug: "rohini-nilekani-philanthropies",
    name: "Rohini Nilekani Philanthropies",
    short: "Rohini Nilekani Philanthropies",
    monogram: "RNP",
    tint: "#1A2625",
    category: "Philanthropy",
  },
  {
    slug: "rockefeller-foundation",
    name: "The Rockefeller Foundation",
    short: "The Rockefeller Foundation",
    monogram: "RF",
    tint: "#2C4544",
    category: "Foundation",
  },
  {
    slug: "shakti",
    name: "Shakti Sustainable Energy Foundation",
    short: "Shakti Foundation",
    monogram: "SS",
    tint: "#2EA37A",
    category: "Foundation",
  },
  {
    slug: "global-alliance-future-of-food",
    name: "Global Alliance for the Future of Food",
    short: "Global Alliance · Future of Food",
    monogram: "GA",
    tint: "#1C5BB8",
    category: "Alliance",
  },
  {
    slug: "climateworks",
    name: "Climateworks Foundation",
    short: "Climateworks",
    monogram: "CW",
    tint: "#5C8C2E",
    category: "Foundation",
  },
];
