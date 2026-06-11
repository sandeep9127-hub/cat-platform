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
    logo: "/images/anchors/akrsp.png",
  },
  "khatarshnong-laitkroh": {
    name: "North East Slow Food & Agrobiodiversity Society",
    short: "NESFAS",
    logo: "/images/anchors/nesfas.png",
  },
  patharpratima: {
    name: "Development Research Communication and Services Centre",
    short: "DRCSC",
    logo: "/images/anchors/drcsc.png",
  },
  patratu: {
    name: "GSS",
    short: "GSS",
    logo: "/images/anchors/gss.png",
  },
  dharashiv: {
    name: "Swayam Shikshan Prayog",
    short: "SSP",
    logo: "/images/anchors/ssp.png",
  },
  vempalli: {
    name: "Centre for Sustainable Agriculture",
    short: "CSA",
    logo: "/images/anchors/csa.png",
  },
  chitrakonda: {
    name: "Watershed Support Services and Activities Network",
    short: "WASSAN",
    logo: "/images/anchors/wassan.png",
  },
  rajnagar: {
    name: "Professional Assistance for Development Action",
    short: "PRADAN",
    logo: "/images/anchors/pradan.png",
  },
  mau: {
    name: "Self-Reliant Initiatives through Joint Action",
    short: "SRIJAN",
    logo: "/images/anchors/srijan.jpeg",
  },
  dantewada: {
    name: "Nirmaan Organisation",
    short: "Nirmaan",
    logo: "/images/anchors/nirmaan.png",
  },
  pangi: {
    name: "Revitalising Rainfed Agriculture Network",
    short: "RRAN",
    logo: "/images/anchors/rran.png",
  },
};
