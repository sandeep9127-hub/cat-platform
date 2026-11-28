import Link from "next/link";
import "./dashboard.css";

const A = "/dashboards/lp1/";

/** What each part of the dashboard holds. Deliberately no figures: the numbers open only with access. */
const PARTS: { title: string; body: string; tool?: boolean }[] = [
  { title: "Overview", body: "Phase 1 cost and how it is financed across the ten landscapes, and the six threads of the plan." },
  { title: "Costs", body: "Each landscape's Phase 1 cost, its share of the whole, and cost per household and per hectare." },
  { title: "Lenses", body: "Where the money goes by institution type, equity, gender, economic purpose, climate, capital and biodiversity." },
  { title: "Landscape profile", body: "One landscape at a time: financing, cost by category, every tag against the others, the largest interventions." },
  { title: "Compare", body: "Any two landscapes side by side, with the tags where they differ most." },
  { title: "Interventions", body: "Every cost line, filtered, searched and sorted.", tool: true },
  { title: "Tag table", body: "The full tag grid, landscape by landscape.", tool: true },
  { title: "Studio", body: "Build and compare your own views of the cost lines.", tool: true },
];

const THREADS: [string, string, string][] = [
  ["tile-agriculture.webp", "wash-mint.webp", "Agriculture, horticulture and agroforestry"],
  ["tile-livestock.webp", "wash-sage.webp", "Livestock"],
  ["tile-nutrition.webp", "wash-sand.webp", "Nutrition"],
  ["tile-energy.webp", "wash-sky.webp", "Energy"],
  ["tile-biodiversity.webp", "wash-mint.webp", "Biodiversity"],
  ["tile-nrm.webp", "wash-sage.webp", "Natural resource management"],
];

export function DashboardGate({ unavailable }: { unavailable?: boolean }) {
  return (
    <div className="ld-page">
      <div className="ld">
        <header className="ld-hero" id="top">
          <img className="ld-hero-leaf ld-hero-leaf-r" src={A + "leaf-right.webp"} alt="" aria-hidden="true" />
          <img className="ld-hero-leaf ld-hero-leaf-l" src={A + "leaf-left.webp"} alt="" aria-hidden="true" />
          <div className="ld-hero-top">
            <a className="ld-logo" href="https://agroecologyindia.org" target="_blank" rel="noopener" aria-label="CAT, Consortium for Agroecological Transformations (opens agroecologyindia.org)">
              <img src={A + "cat-logo-full.svg"} alt="CAT, Consortium for Agroecological Transformations" width={170} height={50} />
            </a>
          </div>
          <div className="ld-hero-body">
            <p className="ld-eyebrow">Landscape investment plans · Phase 1</p>
            <h1 className="ld-title">The full investment dashboard</h1>
            <p className="ld-hero-sub">
              Ten CAT landscapes compared, line by line: what Phase 1 costs, who pays for it, and where the money goes. The dashboard is shared on
              request, with a personal, view-only link.
            </p>
            <div className="ld-lock-actions">
              <Link className="ld-btn ld-btn-primary ld-btn-link" href="/request-access">Request access to the full investment dashboard</Link>
              <Link className="ld-link" href="/signin">CAT team? Sign in</Link>
            </div>
          </div>
        </header>

        {unavailable && (
          <p className="ld-lede" role="status">
            That link isn&apos;t available any more: it may have expired or been revoked. You can ask for access again with the button above.
          </p>
        )}

        <section className="ld-card ld-themes" aria-labelledby="gate-threads">
          <h2 className="ld-h3" id="gate-threads">Six threads of the plan</h2>
          <p className="ld-sub">The dashboard follows each thread across every landscape.</p>
          <div className="ld-theme-grid">
            {THREADS.map(([ill, wash, name]) => (
              <div className="ld-theme" key={name} style={{ cursor: "default" }}>
                <span className="ld-theme-art">
                  <img className="ld-theme-wash" src={A + wash} alt="" aria-hidden="true" />
                  <img className="ld-theme-ill" src={A + ill} alt="" aria-hidden="true" />
                </span>
                <span className="ld-theme-name">{name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ld-card" aria-labelledby="gate-inside">
          <h2 className="ld-h3" id="gate-inside">What&apos;s inside</h2>
          <ul className="ld-views" style={{ marginTop: 12 }}>
            {PARTS.map((p) => (
              <li key={p.title}>
                <b>{p.title}{p.tool ? " · tool" : ""}</b>
                <span>{p.body}</span>
              </li>
            ))}
          </ul>
          <p className="ld-sub" style={{ marginTop: 14 }}>
            Each landscape&apos;s own Budget page on the Hub stays open to everyone. The dashboard adds the comparisons and every cost line.
          </p>
        </section>

        <footer className="ld-footer">
          <span>Consortium for Agroecological Transformations</span>
          <a href="https://agroecologyindia.org" target="_blank" rel="noopener">agroecologyindia.org</a>
        </footer>
      </div>
    </div>
  );
}
