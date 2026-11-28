import Link from "next/link";
import { format } from "d3";
import type { LandscapeSummary } from "@/lib/dashboards/landscapes-phase1/sheet";
import "./dashboard.css";

/**
 * One landscape's Phase 1 budget, in the investment dashboard's design, for the
 * public Hub: its own figures only (no other landscapes, no comparisons, no
 * line-level lists). Figures and formatting are the dashboard's Landscape
 * profile ones, so the two always agree.
 */
const A = "/dashboards/lp1/";
const DASH = "/dashboards/landscapes-phase-1";

const fmtCrore = (v: number | null | undefined) => (v == null ? "—" : "Rs " + format(".1f")(v / 1e7) + " crore");
const fmtCr = (v: number | null | undefined) => (v == null ? "—" : format(Math.abs(v / 1e7) < 10 ? ".2f" : ".1f")(v / 1e7));
const fmtPct = (v: number | null | undefined) => (v == null ? "—" : format(".1f")(v) + "%");
const fmtRs = (v: number | null | undefined) => (v == null ? "—" : "Rs " + Math.round(v).toLocaleString("en-IN"));

/* Series colours (light theme): teal, terracotta, indigo, ochre. */
const C = ["var(--ld-c0)", "var(--ld-c1)", "var(--ld-c2)", "var(--ld-c3)"];

const THREADS: { cat: string; name: string; ill: string; wash: string; alt: string }[] = [
  { cat: "Agriculture, Horticulture & Agroforestry", name: "Agriculture, horticulture and agroforestry", ill: "tile-agriculture.webp", wash: "wash-mint.webp", alt: "A farmer with a wooden plough" },
  { cat: "Livestock Management", name: "Livestock", ill: "tile-livestock.webp", wash: "wash-sage.webp", alt: "An older man with his goats" },
  { cat: "Nutrition", name: "Nutrition", ill: "tile-nutrition.webp", wash: "wash-sand.webp", alt: "A full thali of local food" },
  { cat: "Energy", name: "Energy", ill: "tile-energy.webp", wash: "wash-sky.webp", alt: "A woman farmer running a solar water pump" },
  { cat: "Biodiversity", name: "Biodiversity", ill: "tile-biodiversity.webp", wash: "wash-mint.webp", alt: "A couple with a harvest of mixed produce" },
  { cat: "NRM*", name: "Natural resource management", ill: "tile-nrm.webp", wash: "wash-sage.webp", alt: "A man walking to work with a pickaxe and bag" },
];

function Kpis({ m }: { m: Record<string, number | null> }) {
  const cards: [string, string, string, string?][] = [
    ["role-impactors.webp", "Phase 1 cost", fmtCrore(m["1"])],
    ["role-funders.webp", "Grant + returnable grant required", fmtCrore(m["2"]), "After debt is taken out"],
    ["role-impactors.webp", "Cost per household", fmtRs(m["7a"])],
    ["role-enablers.webp", "Government convergence", fmtPct(m["3"]), "% of Phase 1 cost"],
    ["role-impactors.webp", "Community contribution", fmtPct(m["4"]), "% of Phase 1 cost"],
    ["role-funders.webp", "Net grant + returnable grant", fmtPct(m["6"]), "% of Phase 1 cost"],
  ];
  return (
    <div className="ld-kpis">
      {cards.map(([icon, label, value, note]) => (
        <div className="ld-card ld-has-role" key={label}>
          <img className="ld-role" src={A + icon} alt="" aria-hidden="true" width={56} height={56} />
          <p className="ld-kpi-label">{label}</p>
          <p className="ld-kpi-value">{value}</p>
          {note && <p className="ld-kpi-note">{note}</p>}
        </div>
      ))}
    </div>
  );
}

function Financing({ m, name }: { m: Record<string, number | null> }& { name: string }) {
  const parts = [
    { label: "Government convergence", v: m["3"], c: C[2] },
    { label: "Community contribution", v: m["4"], c: C[1] },
    { label: "Debt", v: m["5"], c: C[3] },
    { label: "Net grant + returnable grant", v: m["6"], c: C[0] },
  ];
  return (
    <div className="ld-card" id="financing">
      <h3 className="ld-h3">How {name}&apos;s Phase 1 is financed</h3>
      <p className="ld-sub">Share of Phase 1 cost; the bar adds up to 100%.</p>
      <ul className="ld-legend" aria-hidden="true">
        {parts.map((p) => (
          <li key={p.label}><i className="ld-sw" style={{ background: p.c }} />{p.label}</li>
        ))}
      </ul>
      <div className="ld-fin" role="img" aria-label={parts.map((p) => `${p.label} ${fmtPct(p.v)}`).join(", ")}>
        {parts.filter((p) => (p.v ?? 0) > 0).map((p) => (
          <span key={p.label} className="ld-fin-seg" style={{ width: `${Math.min(100, p.v ?? 0)}%`, background: p.c }} title={`${p.label}: ${fmtPct(p.v)}`}>
            {(p.v ?? 0) >= 7 ? `${format(".0f")(p.v ?? 0)}%` : ""}
          </span>
        ))}
      </div>
      <ul className="ld-fin-list">
        {parts.map((p) => (
          <li key={p.label}><span>{p.label}</span><b>{fmtPct(p.v)}</b></li>
        ))}
      </ul>
    </div>
  );
}

function Categories({ cats }: { cats: LandscapeSummary["categories"] }) {
  const max = Math.max(...cats.map((c) => c.phase1), 1);
  return (
    <div className="ld-card" id="by-category">
      <h3 className="ld-h3">Phase 1 cost by category</h3>
      <p className="ld-sub">Rs crore, with the category&apos;s share of this landscape&apos;s cost lines.</p>
      <ul className="ld-catbars">
        {cats.map((c) => (
          <li key={c.Category}>
            <span className="ld-catbar-name">{c.Category}</span>
            <span className="ld-catbar-track">
              <span className="ld-catbar-fill" style={{ width: `${Math.max(0.5, (c.phase1 / max) * 100)}%` }} />
            </span>
            <span className="ld-catbar-val">{fmtCr(c.phase1)}  ({fmtPct(c.share)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Threads({ cats }: { cats: LandscapeSummary["categories"] }) {
  const total = cats.reduce((t, c) => t + c.phase1, 0);
  const tiles = THREADS.map((t) => {
    const amt = t.cat === "NRM*"
      ? cats.filter((c) => c.Category.startsWith("NRM")).reduce((s, c) => s + c.phase1, 0)
      : cats.find((c) => c.Category === t.cat)?.phase1 ?? 0;
    const share = total ? Math.round((amt / total) * 1000) / 10 : null;
    return { ...t, amt, share };
  }).sort((a, b) => b.amt - a.amt);
  return (
    <div className="ld-card ld-themes" id="themes">
      <h3 className="ld-h3">Six threads of the plan</h3>
      <p className="ld-sub">Phase 1 cost of six themes in this landscape.</p>
      <div className="ld-theme-grid">
        {tiles.map((t) => (
          <div className="ld-theme ld-theme-static" key={t.cat}>
            <span className="ld-theme-art">
              <img className="ld-theme-wash" src={A + t.wash} alt="" aria-hidden="true" />
              <img className="ld-theme-ill" src={A + t.ill} alt={t.alt} />
            </span>
            <span className="ld-theme-name">{t.name}</span>
            <span className="ld-theme-amt">{fmtCrore(t.amt)}</span>
            <span className="ld-theme-share">{fmtPct(t.share)} of this landscape&apos;s Phase 1 lines</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Actions({ slug }: { slug: string }) {
  return (
    <div className="ld-lock-actions">
      <Link className="ld-btn ld-btn-primary ld-btn-link" href={`/request-access?landscape=${encodeURIComponent(slug)}`}>
        Request access to the full investment dashboard
      </Link>
      <Link className="ld-link" href={DASH}>Open the investment dashboard</Link>
    </div>
  );
}

/** The public Budget tab: hero, KPI cards, the six threads, financing and cost by category. */
export function LandscapeBudgetSummary({ slug, name, data }: { slug: string; name: string; data: LandscapeSummary }) {
  const m = data.metric;
  return (
    <div className="ld-page ld-force-light ld-public">
      <div className="ld">
        <header className="ld-hero">
          <img className="ld-hero-leaf ld-hero-leaf-r" src={A + "leaf-right.webp"} alt="" aria-hidden="true" />
          <div className="ld-hero-body">
            <p className="ld-eyebrow">Landscape investment plan · Phase 1</p>
            <h2 className="ld-title">{name}: what Phase 1 costs</h2>
            <p className="ld-hero-sub">
              {name} needs <b>{fmtCrore(m["1"])}</b> for Phase 1. After government convergence, community contribution and debt,{" "}
              <b>{fmtPct(m["6"])}</b> of it still has to come as grant or returnable grant. That is <b>{fmtRs(m["7a"])}</b> per household.
            </p>
            <Actions slug={slug} />
          </div>
        </header>
        <Kpis m={m} />
        <Threads cats={data.categories} />
        <div className="ld-two">
          <Financing m={m} name={name} />
          <Categories cats={data.categories} />
        </div>
        <p className="ld-sub">
          Phase 1 figures from the All-Landscape Phase 1 sheet, the same figures as the investment dashboard. Amounts in rupees (1 crore = 1,00,00,000).
          Every cost line, the comparisons with other landscapes and the Studio are in the full investment dashboard, shared on request.
        </p>
      </div>
    </div>
  );
}

/** The landscape overview's money block: the headline cards and the financing bar, with links on. */
export function LandscapeMoneyPhase1({ slug, name, data }: { slug: string; name: string; data: LandscapeSummary }) {
  return (
    <section className="ld-page ld-force-light ld-public ld-compact" aria-labelledby="money-title">
      <div className="ld">
        <div className="ld-head-row">
          <div>
            <p className="ld-eyebrow">Landscape investment plan · Phase 1</p>
            <h2 className="ld-panel-title" id="money-title">Where the money goes</h2>
          </div>
          <Link className="ld-btn ld-btn-link" href={`/landscape/${slug}/budget`}>See the Phase 1 budget →</Link>
        </div>
        <Kpis m={data.metric} />
        <Financing m={data.metric} name={name} />
        <Actions slug={slug} />
      </div>
    </section>
  );
}
