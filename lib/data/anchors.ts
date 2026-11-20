/**
 * Anchor partner per CAT landscape — the lead organisation on the ground.
 * Logos live in /public/images/anchors. Mapping confirmed with the team
 * (Jun 11, 2026). `name` is the full org name where known; for GSS only the
 * abbreviation is used.
 */
export type Anchor = { name: string; short: string; logo: string };

export const ANCHORS: Record<string, Anchor> = {
  ahwa: {
    name: "Aga Khan Rural Support Programme",
    short: "AKRSP",
    logo: "/images/anchors/akrsp.webp",
  },
  "khatarshnong-laitkroh": {
    name: "North East Slow Food & Agrobiodiversity Society",
    short: "NESFAS",
    logo: "/images/anchors/nesfas.webp",
  },
  patharpratima: {
    name: "Development Research Communication and Services Centre",
    short: "DRCSC",
    logo: "/images/anchors/drcsc.webp",
  },
  patratu: {
    name: "GSS",
    short: "GSS",
    logo: "/images/anchors/gss.webp",
  },
  dharashiv: {
    name: "Swayam Shikshan Prayog",
    short: "SSP",
    logo: "/images/anchors/ssp.webp",
  },
  vempalli: {
    name: "Centre for Sustainable Agriculture",
    short: "CSA",
    logo: "/images/anchors/csa.webp",
  },
  chitrakonda: {
    name: "Watershed Support Services and Activities Network",
    short: "WASSAN",
    logo: "/images/anchors/wassan.webp",
  },
  rajnagar: {
    name: "Professional Assistance for Development Action",
    short: "PRADAN",
    logo: "/images/anchors/pradan.webp",
  },
  mau: {
    name: "Self-Reliant Initiatives through Joint Action",
    short: "SRIJAN",
    logo: "/images/anchors/srijan.webp",
  },
  dantewada: {
    name: "Nirmaan Organisation",
    short: "Nirmaan",
    logo: "/images/anchors/nirmaan.webp",
  },
  pangi: {
    name: "Revitalising Rainfed Agriculture Network",
    short: "RRAN",
    logo: "/images/anchors/rran.webp",
  },
};
