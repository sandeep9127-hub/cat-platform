/* The dashboard's page structure, ported from the Claude Data dashboard's index.html.
   Drawings fill the [data-draw] elements; see views.ts. */
import type { ReactNode } from "react";

export function Markup({ canNotes, shareBar }: { canNotes: boolean; shareBar?: ReactNode }) {
  return (
    <div className="ld">
      <header className="ld-hero" id="top">
        <img className="ld-hero-leaf ld-hero-leaf-r" src="/dashboards/lp1/leaf-right.webp" alt="" aria-hidden="true" />
        <img className="ld-hero-leaf ld-hero-leaf-l" src="/dashboards/lp1/leaf-left.webp" alt="" aria-hidden="true" />
        <div className="ld-hero-top">
          <a className="ld-logo" href="https://agroecologyindia.org" target="_blank" rel="noopener" aria-label="CAT, Consortium for Agroecological Transformations (opens agroecologyindia.org)">
            <img src="/dashboards/lp1/cat-logo-full.svg" alt="CAT, Consortium for Agroecological Transformations" width="170" height="50" />
          </a>
          <div className="ld-field ld-cur"><span>Currency</span>
            <div className="ld-seg" role="group" aria-label="Currency">
              <button type="button" className="ld-seg-btn" data-set="cur" data-value="inr">₹ INR</button>
              <button type="button" className="ld-seg-btn" data-set="cur" data-value="usd">$ USD</button>
            </div>
          </div>
        </div>
        <div className="ld-hero-body">
          <p className="ld-eyebrow">Landscape investment plans · Phase 1</p>
          <h1 className="ld-title">All landscapes, Phase 1</h1>
          <p className="ld-hero-sub">Ten CAT landscapes compared, live from the All-Landscape Phase 1 sheet. Amounts are in rupees (1 crore = 1,00,00,000) or US dollars at a fixed Rs 90 = US$ 1; other figures are shares of Phase 1 cost.</p>
        </div>
      </header>

      {shareBar}

      <nav className="ld-tabs" role="tablist" aria-label="Dashboard sections">
        <button type="button" role="tab" className="ld-tab is-on" data-tab="overview" aria-selected="true">Overview</button>
        <button type="button" role="tab" className="ld-tab" data-tab="costs" aria-selected="false" tabIndex={-1}>Costs</button>
        <button type="button" role="tab" className="ld-tab" data-tab="lenses" aria-selected="false" tabIndex={-1}>Lenses</button>
        <button type="button" role="tab" className="ld-tab" data-tab="profile" aria-selected="false" tabIndex={-1}>Landscape profile</button>
        <button type="button" role="tab" className="ld-tab" data-tab="compare" aria-selected="false" tabIndex={-1}>Compare</button>
        <span className="ld-tabs-sep" aria-hidden="true">Tools</span>
        <button type="button" role="tab" className="ld-tab ld-tab-tool" data-tab="interventions" aria-selected="false" tabIndex={-1}>Interventions</button>
        <button type="button" role="tab" className="ld-tab ld-tab-tool" data-tab="tags" aria-selected="false" tabIndex={-1}>Tag table</button>
        <button type="button" role="tab" className="ld-tab ld-tab-studio ld-tab-tool" data-tab="studio" aria-selected="false" tabIndex={-1}>Studio ✦</button>
      </nav>

  
      <section id="overview" data-tab-panel="" role="tabpanel" className="ld-panel">
        <h2 className="ld-panel-title ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-1.webp" alt="" aria-hidden="true" width="48" height="48" />Overview</h2>
        <p className="ld-lede">Ten landscapes need <b className="ld-num dash-skeleton" data-draw="lede-cost" data-source="landscapes" data-field="All Landscapes" data-where="sn=1">—</b> for Phase 1. After government convergence, community contribution and debt, <b className="ld-num dash-skeleton" data-draw="lede-net" data-source="landscapes" data-field="All Landscapes" data-where="sn=6">—</b> of it still has to come as grant or returnable grant. Cost per household runs from <b className="ld-num dash-skeleton" data-draw="hh-min" data-source="landscapes" data-where="sn=7a">—</b> in <span data-draw="hh-min-name">—</span> to <b className="ld-num dash-skeleton" data-draw="hh-max" data-source="landscapes" data-where="sn=7a">—</b> in <span data-draw="hh-max-name">—</span>.</p>

        <div className="ld-kpis" id="headline" aria-label="Headline figures, all landscapes" data-fetchpriority="high">
          <div className="ld-card ld-has-role" id="kpi-cost"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Phase 1 cost</p><p className="ld-kpi-value dash-skeleton" data-draw="kpi-crore" data-sn="1" data-source="landscapes" data-field="All Landscapes" data-where="sn=1">—</p><p className="ld-kpi-note">All ten landscapes</p></div>
          <div className="ld-card ld-has-role" id="kpi-grant"><img className="ld-role" src="/dashboards/lp1/role-funders.webp" alt="" aria-hidden="true" width="56" height="56" data-role="funders" /><p className="ld-kpi-label">Grant + returnable grant required</p><p className="ld-kpi-value dash-skeleton" data-draw="kpi-crore" data-sn="2" data-source="landscapes" data-field="All Landscapes" data-where="sn=2">—</p><p className="ld-kpi-note">After debt is taken out</p></div>
          <div className="ld-card ld-has-role" id="kpi-govt"><img className="ld-role" src="/dashboards/lp1/role-enablers.webp" alt="" aria-hidden="true" width="56" height="56" data-role="enablers" /><p className="ld-kpi-label">Government convergence</p><p className="ld-kpi-value dash-skeleton" data-draw="kpi-pct" data-sn="3" data-source="landscapes" data-field="All Landscapes" data-where="sn=3">—</p><p className="ld-kpi-note">% of Phase 1 cost</p></div>
          <div className="ld-card ld-has-role" id="kpi-community"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Community contribution</p><p className="ld-kpi-value dash-skeleton" data-draw="kpi-pct" data-sn="4" data-source="landscapes" data-field="All Landscapes" data-where="sn=4">—</p><p className="ld-kpi-note">% of Phase 1 cost</p></div>
          <div className="ld-card ld-has-role" id="kpi-debt"><img className="ld-role" src="/dashboards/lp1/role-markets.webp" alt="" aria-hidden="true" width="56" height="56" data-role="markets" /><p className="ld-kpi-label">Debt</p><p className="ld-kpi-value dash-skeleton" data-draw="kpi-pct" data-sn="5" data-source="landscapes" data-field="All Landscapes" data-where="sn=5">—</p><p className="ld-kpi-note">% of Phase 1 cost</p></div>
          <div className="ld-card ld-has-role" id="kpi-net"><img className="ld-role" src="/dashboards/lp1/role-funders.webp" alt="" aria-hidden="true" width="56" height="56" data-role="funders" /><p className="ld-kpi-label">Net grant + returnable grant</p><p className="ld-kpi-value dash-skeleton" data-draw="kpi-pct" data-sn="6" data-source="landscapes" data-field="All Landscapes" data-where="sn=6">—</p><p className="ld-kpi-note">% of Phase 1 cost</p></div>
        </div>


        <div className="ld-card ld-themes" id="themes">
          <h3 className="ld-h3">Six threads of the plan</h3>
          <p className="ld-sub">Phase 1 cost of six themes across all ten landscapes, from the line-level Data tab. Pick one to see its lines.</p>
          <div className="ld-theme-grid">
            <button type="button" className="ld-theme" data-cat="Agriculture, Horticulture &amp; Agroforestry">
              <span className="ld-theme-art"><img className="ld-theme-wash" src="/dashboards/lp1/wash-mint.webp" alt="" aria-hidden="true" /><img className="ld-theme-ill" src="/dashboards/lp1/tile-agriculture.webp" alt="A farmer with a wooden plough" /></span>
              <span className="ld-theme-name">Agriculture, horticulture and agroforestry</span>
              <span className="ld-theme-amt dash-skeleton" data-draw="theme-amt" data-cat="Agriculture, Horticulture &amp; Agroforestry" data-source="by_category" data-field="phase1" data-where="Category=Agriculture, Horticulture %26 Agroforestry">—</span>
              <span className="ld-theme-share"><span data-draw="theme-share" data-cat="Agriculture, Horticulture &amp; Agroforestry" data-source="by_category" data-field="share" data-where="Category=Agriculture, Horticulture %26 Agroforestry">—</span> of all Phase 1 lines</span>
              <span className="ld-theme-go">See its lines →</span>
            </button>
            <button type="button" className="ld-theme" data-cat="Livestock Management">
              <span className="ld-theme-art"><img className="ld-theme-wash" src="/dashboards/lp1/wash-sage.webp" alt="" aria-hidden="true" /><img className="ld-theme-ill" src="/dashboards/lp1/tile-livestock.webp" alt="An older man with his goats" /></span>
              <span className="ld-theme-name">Livestock</span>
              <span className="ld-theme-amt dash-skeleton" data-draw="theme-amt" data-cat="Livestock Management" data-source="by_category" data-field="phase1" data-where="Category=Livestock Management">—</span>
              <span className="ld-theme-share"><span data-draw="theme-share" data-cat="Livestock Management" data-source="by_category" data-field="share" data-where="Category=Livestock Management">—</span> of all Phase 1 lines</span>
              <span className="ld-theme-go">See its lines →</span>
            </button>
            <button type="button" className="ld-theme" data-cat="Nutrition">
              <span className="ld-theme-art"><img className="ld-theme-wash" src="/dashboards/lp1/wash-sand.webp" alt="" aria-hidden="true" /><img className="ld-theme-ill" src="/dashboards/lp1/tile-nutrition.webp" alt="A full thali of local food" /></span>
              <span className="ld-theme-name">Nutrition</span>
              <span className="ld-theme-amt dash-skeleton" data-draw="theme-amt" data-cat="Nutrition" data-source="by_category" data-field="phase1" data-where="Category=Nutrition">—</span>
              <span className="ld-theme-share"><span data-draw="theme-share" data-cat="Nutrition" data-source="by_category" data-field="share" data-where="Category=Nutrition">—</span> of all Phase 1 lines</span>
              <span className="ld-theme-go">See its lines →</span>
            </button>
            <button type="button" className="ld-theme" data-cat="Energy">
              <span className="ld-theme-art"><img className="ld-theme-wash" src="/dashboards/lp1/wash-sky.webp" alt="" aria-hidden="true" /><img className="ld-theme-ill" src="/dashboards/lp1/tile-energy.webp" alt="A woman farmer running a solar water pump to irrigate her vegetable rows" /></span>
              <span className="ld-theme-name">Energy</span>
              <span className="ld-theme-amt dash-skeleton" data-draw="theme-amt" data-cat="Energy" data-source="by_category" data-field="phase1" data-where="Category=Energy">—</span>
              <span className="ld-theme-share"><span data-draw="theme-share" data-cat="Energy" data-source="by_category" data-field="share" data-where="Category=Energy">—</span> of all Phase 1 lines</span>
              <span className="ld-theme-go">See its lines →</span>
            </button>
            <button type="button" className="ld-theme" data-cat="Biodiversity">
              <span className="ld-theme-art"><img className="ld-theme-wash" src="/dashboards/lp1/wash-mint.webp" alt="" aria-hidden="true" /><img className="ld-theme-ill" src="/dashboards/lp1/tile-biodiversity.webp" alt="A couple with a harvest of mixed produce" /></span>
              <span className="ld-theme-name">Biodiversity</span>
              <span className="ld-theme-amt dash-skeleton" data-draw="theme-amt" data-cat="Biodiversity" data-source="by_category" data-field="phase1" data-where="Category=Biodiversity">—</span>
              <span className="ld-theme-share"><span data-draw="theme-share" data-cat="Biodiversity" data-source="by_category" data-field="share" data-where="Category=Biodiversity">—</span> of all Phase 1 lines</span>
              <span className="ld-theme-go">See its lines →</span>
            </button>
            <button type="button" className="ld-theme" data-cat="NRM*">
              <span className="ld-theme-art"><img className="ld-theme-wash" src="/dashboards/lp1/wash-sage.webp" alt="" aria-hidden="true" /><img className="ld-theme-ill" src="/dashboards/lp1/tile-nrm.webp" alt="A man walking to work with a pickaxe and bag" /></span>
              <span className="ld-theme-name">Natural resource management</span>
              <span className="ld-theme-amt dash-skeleton" data-draw="theme-amt" data-cat="NRM*" data-source="theme_nrm" data-field="phase1" data-row="0">—</span>
              <span className="ld-theme-share"><span data-draw="theme-share" data-cat="NRM*" data-source="theme_nrm" data-field="share" data-row="0">—</span> of all Phase 1 lines</span>
              <span className="ld-theme-split">Private <span data-draw="theme-split" data-k="private" data-source="theme_nrm" data-field="private" data-row="0">—</span> · Community <span data-draw="theme-split" data-k="community" data-source="theme_nrm" data-field="community" data-row="0">—</span></span>
              <span className="ld-theme-go">See its lines →</span>
            </button>
          </div>
        </div>

        <div className="ld-card" id="financing">
          <h3 className="ld-h3">How each landscape's Phase 1 is financed</h3>
          <p className="ld-sub">Share of Phase 1 cost; each bar adds up to 100%. Click a landscape to open its profile.</p>
          <ul className="ld-legend" aria-hidden="true">
            <li><i className="ld-sw" data-sw="2"></i>Government convergence</li>
            <li><i className="ld-sw" data-sw="1"></i>Community contribution</li>
            <li><i className="ld-sw" data-sw="3"></i>Debt</li>
            <li><i className="ld-sw" data-sw="0"></i>Net grant + returnable grant</li>
          </ul>
          <div className="ld-chart" data-draw="financing-chart" data-source="landscapes"></div>
        </div>

        <div className="ld-card" id="by-category">
          <h3 className="ld-h3">Where the Phase 1 money goes, by category</h3>
          <p className="ld-sub"><span data-draw="unit-big">—</span> across all ten landscapes, with each category's share of the total.</p>
          <div className="ld-chart" data-draw="category-chart" data-source="by_category"></div>
        </div>
      </section>

  
      <section id="costs" data-tab-panel="" role="tabpanel" className="ld-panel" hidden>
        <h2 className="ld-panel-title ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-2.webp" alt="" aria-hidden="true" width="48" height="48" />Costs</h2>
        <div className="ld-two">
          <div className="ld-card" id="cost-by-landscape">
            <h3 className="ld-h3">Phase 1 cost by landscape</h3>
            <p className="ld-sub"><span data-draw="unit-big">—</span>. Dashed line: average landscape.</p>
            <div className="ld-chart" data-draw="cost-chart" data-source="landscapes"></div>
          </div>
          <div className="ld-card" id="cost-share">
            <h3 className="ld-h3">Share of the combined Phase 1 cost</h3>
            <p className="ld-sub">% of all ten landscapes together. Dashed line: an equal tenth.</p>
            <div className="ld-chart" data-draw="share-chart" data-source="landscapes"></div>
          </div>
          <div className="ld-card" id="cost-per-household">
            <h3 className="ld-h3">Phase 1 cost per household</h3>
            <p className="ld-sub"><span data-draw="unit-small">—</span> per household. Dashed line: all landscapes together.</p>
            <div className="ld-chart" data-draw="hh-chart" data-source="landscapes"></div>
          </div>
          <div className="ld-card" id="cost-per-hectare">
            <h3 className="ld-h3">Phase 1 cost per hectare</h3>
            <p className="ld-sub"><span data-draw="unit-small">—</span> per hectare of gross cropped area. Dashed line: all landscapes together.</p>
            <div className="ld-chart" data-draw="ha-chart" data-source="landscapes"></div>
            <p className="ld-sub">No area recorded for: <span data-draw="ha-missing">—</span></p>
          </div>
        </div>
      </section>

  
      <section id="lenses" data-tab-panel="" role="tabpanel" className="ld-panel" hidden>
        <h2 className="ld-panel-title ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-3.webp" alt="" aria-hidden="true" width="48" height="48" />Lenses</h2>
        <div className="ld-card" id="lens-mix">
          <div className="ld-head-row">
            <div>
              <h3 className="ld-h3">Where the money goes, by lens</h3>
              <p className="ld-sub">Share of Phase 1 cost under each tag. "Exclusively" means the money reaches only that group; "largely" means most of it does.</p>
            </div>
            <label className="ld-field"><span>Lens</span>
              <select className="dash-select" data-param="lens" aria-label="Lens">
                <option value="INSTITUTION TYPE">Institution type</option>
                <option value="EQUITY">Equity</option>
                <option value="GENDER">Gender</option>
                <option value="ECONOMIC PURPOSE">Economic purpose</option>
                <option value="CLIMATE">Climate</option>
                <option value="CAPITAL">Capital</option>
                <option value="BIODIVERSITY">Biodiversity</option>
              </select>
            </label>
          </div>
          <ul className="ld-legend" data-draw="lens-legend" aria-hidden="true"></ul>
          <div className="ld-chart" data-draw="lens-chart" data-source="landscapes"></div>
        </div>

        <div className="ld-card" id="lens-gap">
          <div className="ld-head-row">
            <div>
              <h3 className="ld-h3">Above or below the average</h3>
              <p className="ld-sub">Each landscape's share for <b data-draw="gap-tag">—</b>, in percentage points against the average of <b className="ld-num" data-draw="gap-avg" data-source="tag_gap" data-field="average" data-row="0">—</b>.</p>
            </div>
            <label className="ld-field"><span>Tag</span>
              <select className="dash-select" data-draw="tag-select" aria-label="Tag"></select>
            </label>
          </div>
          <div className="ld-chart" data-draw="gap-chart" data-source="tag_gap"></div>
        </div>
      </section>

  
      <section id="profile" data-tab-panel="" role="tabpanel" className="ld-panel" hidden>
        <div className="ld-head-row ld-feature">
          <span className="ld-feature-art" aria-hidden="true"><img className="ld-feature-wash" src="/dashboards/lp1/wash-mint.webp" alt="" /><img className="ld-feature-ill" src="/dashboards/lp1/head-profile.webp" alt="" /></span>
          <h2 className="ld-panel-title ld-panel-title-inline ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-4.webp" alt="" aria-hidden="true" width="48" height="48" />Landscape profile:{'\u00a0'}<span data-draw="pf-name">—</span></h2>
          <div className="ld-row ld-row-end">
            <label className="ld-field"><span>Landscape</span>
              <select className="dash-select" data-draw="pf-select" aria-label="Landscape"></select>
            </label>
            <button type="button" className="ld-btn" id="pf-compare">Compare with another landscape</button>
          </div>
        </div>

        <div className="ld-kpis" id="pf-kpis">
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Phase 1 cost</p><p className="ld-kpi-value dash-skeleton" data-draw="pf-kpi" data-sn="1" data-kind="crore" data-source="landscapes" data-where="sn=1">—</p><p className="ld-kpi-note">Share of all landscapes: <span className="ld-num" data-draw="pf-kpi" data-sn="7" data-kind="pct" data-source="landscapes" data-where="sn=7">—</span></p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-funders.webp" alt="" aria-hidden="true" width="56" height="56" data-role="funders" /><p className="ld-kpi-label">Grant + returnable grant required</p><p className="ld-kpi-value dash-skeleton" data-draw="pf-kpi" data-sn="2" data-kind="crore" data-source="landscapes" data-where="sn=2">—</p><p className="ld-kpi-note">After debt is taken out</p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Cost per household</p><p className="ld-kpi-value dash-skeleton" data-draw="pf-kpi" data-sn="7a" data-kind="rs" data-source="landscapes" data-where="sn=7a">—</p><p className="ld-kpi-note">All landscapes: <span className="ld-num" data-draw="kpi-all" data-sn="7a" data-source="landscapes" data-field="All Landscapes" data-where="sn=7a">—</span></p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-enablers.webp" alt="" aria-hidden="true" width="56" height="56" data-role="enablers" /><p className="ld-kpi-label">Government convergence</p><p className="ld-kpi-value dash-skeleton" data-draw="pf-kpi" data-sn="3" data-kind="pct" data-source="landscapes" data-where="sn=3">—</p><p className="ld-kpi-note">All landscapes: <span className="ld-num" data-draw="kpi-all" data-sn="3" data-source="landscapes" data-field="All Landscapes" data-where="sn=3">—</span></p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Community contribution</p><p className="ld-kpi-value dash-skeleton" data-draw="pf-kpi" data-sn="4" data-kind="pct" data-source="landscapes" data-where="sn=4">—</p><p className="ld-kpi-note">All landscapes: <span className="ld-num" data-draw="kpi-all" data-sn="4" data-source="landscapes" data-field="All Landscapes" data-where="sn=4">—</span></p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-funders.webp" alt="" aria-hidden="true" width="56" height="56" data-role="funders" /><p className="ld-kpi-label">Net grant + returnable grant</p><p className="ld-kpi-value dash-skeleton" data-draw="pf-kpi" data-sn="6" data-kind="pct" data-source="landscapes" data-where="sn=6">—</p><p className="ld-kpi-note">All landscapes: <span className="ld-num" data-draw="kpi-all" data-sn="6" data-source="landscapes" data-field="All Landscapes" data-where="sn=6">—</span></p></div>
        </div>

        <div className="ld-two">
          <div className="ld-card" id="pf-categories">
            <h3 className="ld-h3">Phase 1 cost by category</h3>
            <p className="ld-sub"><span data-draw="unit-big">—</span>, with the category's share of this landscape's lines.</p>
            <div className="ld-chart" data-draw="pf-cat-chart" data-source="profile_cats"></div>
          </div>
          {canNotes && (
          <div className="ld-card" id="pf-notes">
            <img className="ld-notes-art" src="/dashboards/lp1/notes.webp" alt="" aria-hidden="true" />
            <h3 className="ld-h3">My notes on this landscape</h3>
            <p className="ld-sub">Only you can see these notes. They are kept with your account or your access link, one per landscape.</p>
            <textarea id="note-text" className="ld-textarea" rows={8} aria-label="My notes on this landscape" placeholder="Write a note…"></textarea>
            <div className="ld-row">
              <button type="button" className="ld-btn ld-btn-primary" id="note-save">Save note</button>
              <span className="ld-sub" id="note-saved" hidden>Saved.</span>
              <span className="ld-warn" id="note-unsaved" hidden>That wasn't saved. You may not have permission to save here.</span>
            </div>
          </div>
          )}
        </div>

        <div className="ld-card" id="pf-lenses">
          <h3 className="ld-h3">Every tag: this landscape against all landscapes</h3>
          <p className="ld-sub">% of Phase 1 cost. The coloured dot is this landscape, grey dots are the others, and the black tick is all landscapes together.</p>
          <div className="ld-chart" data-draw="pf-dots" data-source="landscapes"></div>
        </div>

        <div className="ld-card" id="pf-top">
          <h3 className="ld-h3">Largest interventions</h3>
          <p className="ld-sub">The 15 lines with the largest Phase 1 cost. See every line on the Interventions tab.</p>
          <div className="ld-scroll">
            <table className="ld-table ld-table-lines" data-source="lines" data-row-key="Landscape,S. No">
              <thead><tr>
                <th data-field="Sub Intervention">Intervention</th>
                <th data-field="Category">Category</th>
                <th data-field="Phase 1 Cost (Rs)">Phase 1 cost (<span data-draw="unit-small">—</span>)</th>
                <th data-field="Phase 1 Govt (Rs)">Government (<span data-draw="unit-small">—</span>)</th>
                <th data-field="Phase 1 Community (Rs)">Community (<span data-draw="unit-small">—</span>)</th>
                <th data-field="Phase 1 Investment Required (Rs)">Investment required (<span data-draw="unit-small">—</span>)</th>
              </tr></thead>
              <tbody data-draw="pf-top-table"></tbody>
            </table>
          </div>
        </div>
      </section>

  
      <section id="compare" data-tab-panel="" role="tabpanel" className="ld-panel" hidden>
        <div className="ld-head-row ld-feature ld-feature-wide">
          <span className="ld-feature-art" aria-hidden="true"><img className="ld-feature-wash" src="/dashboards/lp1/wash-sky.webp" alt="" /><img className="ld-feature-ill" src="/dashboards/lp1/head-compare.webp" alt="" /></span>
          <h2 className="ld-panel-title ld-panel-title-inline ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-5.webp" alt="" aria-hidden="true" width="48" height="48" />Compare two landscapes</h2>
          <div className="ld-row ld-row-end">
            <label className="ld-field"><span>First landscape</span><select className="dash-select" data-draw="cmp-a" aria-label="First landscape"></select></label>
            <button type="button" className="ld-btn" id="cmp-swap" aria-label="Swap the two landscapes">⇄ Swap</button>
            <label className="ld-field"><span>Second landscape</span><select className="dash-select" data-draw="cmp-b" aria-label="Second landscape"></select></label>
          </div>
        </div>

        <p className="ld-lede"><span className="ld-name" data-draw="cmp-name" data-side="a">—</span> needs <b className="ld-num dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="1" data-kind="crore" data-source="compare" data-field="a" data-where="sn=1">—</b> for Phase 1 and <span className="ld-name" data-draw="cmp-name" data-side="b">—</span> needs <b className="ld-num dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="1" data-kind="crore" data-source="compare" data-field="b" data-where="sn=1">—</b>. Per household that is <b className="ld-num dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="7a" data-kind="rs" data-source="compare" data-field="a" data-where="sn=7a">—</b> against <b className="ld-num dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="7a" data-kind="rs" data-source="compare" data-field="b" data-where="sn=7a">—</b>, and <b className="ld-num dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="6" data-kind="pct" data-source="compare" data-field="a" data-where="sn=6">—</b> against <b className="ld-num dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="6" data-kind="pct" data-source="compare" data-field="b" data-where="sn=6">—</b> of the cost still has to come as net grant or returnable grant.</p>

        <div className="ld-kpis ld-kpis-pairs" id="cmp-kpis">
          <div className="ld-card ld-has-role ld-pair"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Phase 1 cost</p><div className="ld-pair-row"><div><span className="ld-pair-name" data-draw="cmp-name" data-side="a">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="1" data-kind="crore" data-source="compare" data-field="a" data-where="sn=1">—</p></div><div><span className="ld-pair-name" data-draw="cmp-name" data-side="b">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="1" data-kind="crore" data-source="compare" data-field="b" data-where="sn=1">—</p></div></div><p className="ld-kpi-note">Difference: <span className="ld-num" data-draw="cmp-val" data-side="diff" data-sn="1" data-kind="crore" data-source="compare" data-field="diff" data-where="sn=1">—</span></p></div>
          <div className="ld-card ld-has-role ld-pair"><img className="ld-role" src="/dashboards/lp1/role-funders.webp" alt="" aria-hidden="true" width="56" height="56" data-role="funders" /><p className="ld-kpi-label">Grant + returnable grant required</p><div className="ld-pair-row"><div><span className="ld-pair-name" data-draw="cmp-name" data-side="a">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="2" data-kind="crore" data-source="compare" data-field="a" data-where="sn=2">—</p></div><div><span className="ld-pair-name" data-draw="cmp-name" data-side="b">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="2" data-kind="crore" data-source="compare" data-field="b" data-where="sn=2">—</p></div></div><p className="ld-kpi-note">Difference: <span className="ld-num" data-draw="cmp-val" data-side="diff" data-sn="2" data-kind="crore" data-source="compare" data-field="diff" data-where="sn=2">—</span></p></div>
          <div className="ld-card ld-has-role ld-pair"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Cost per household</p><div className="ld-pair-row"><div><span className="ld-pair-name" data-draw="cmp-name" data-side="a">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="7a" data-kind="rs" data-source="compare" data-field="a" data-where="sn=7a">—</p></div><div><span className="ld-pair-name" data-draw="cmp-name" data-side="b">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="7a" data-kind="rs" data-source="compare" data-field="b" data-where="sn=7a">—</p></div></div><p className="ld-kpi-note">Difference: <span className="ld-num" data-draw="cmp-val" data-side="diff" data-sn="7a" data-kind="rs" data-source="compare" data-field="diff" data-where="sn=7a">—</span></p></div>
          <div className="ld-card ld-has-role ld-pair"><img className="ld-role" src="/dashboards/lp1/role-enablers.webp" alt="" aria-hidden="true" width="56" height="56" data-role="enablers" /><p className="ld-kpi-label">Government convergence</p><div className="ld-pair-row"><div><span className="ld-pair-name" data-draw="cmp-name" data-side="a">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="3" data-kind="pct" data-source="compare" data-field="a" data-where="sn=3">—</p></div><div><span className="ld-pair-name" data-draw="cmp-name" data-side="b">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="3" data-kind="pct" data-source="compare" data-field="b" data-where="sn=3">—</p></div></div><p className="ld-kpi-note">Difference: <span className="ld-num" data-draw="cmp-val" data-side="diff" data-sn="3" data-kind="pct" data-source="compare" data-field="diff" data-where="sn=3">—</span></p></div>
          <div className="ld-card ld-has-role ld-pair"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Community contribution</p><div className="ld-pair-row"><div><span className="ld-pair-name" data-draw="cmp-name" data-side="a">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="4" data-kind="pct" data-source="compare" data-field="a" data-where="sn=4">—</p></div><div><span className="ld-pair-name" data-draw="cmp-name" data-side="b">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="4" data-kind="pct" data-source="compare" data-field="b" data-where="sn=4">—</p></div></div><p className="ld-kpi-note">Difference: <span className="ld-num" data-draw="cmp-val" data-side="diff" data-sn="4" data-kind="pct" data-source="compare" data-field="diff" data-where="sn=4">—</span></p></div>
          <div className="ld-card ld-has-role ld-pair"><img className="ld-role" src="/dashboards/lp1/role-markets.webp" alt="" aria-hidden="true" width="56" height="56" data-role="markets" /><p className="ld-kpi-label">Debt</p><div className="ld-pair-row"><div><span className="ld-pair-name" data-draw="cmp-name" data-side="a">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="a" data-sn="5" data-kind="pct" data-source="compare" data-field="a" data-where="sn=5">—</p></div><div><span className="ld-pair-name" data-draw="cmp-name" data-side="b">—</span><p className="ld-pair-value dash-skeleton" data-draw="cmp-val" data-side="b" data-sn="5" data-kind="pct" data-source="compare" data-field="b" data-where="sn=5">—</p></div></div><p className="ld-kpi-note">Difference: <span className="ld-num" data-draw="cmp-val" data-side="diff" data-sn="5" data-kind="pct" data-source="compare" data-field="diff" data-where="sn=5">—</span></p></div>
        </div>
        <p className="ld-sub">Differences are the first landscape minus the second: percentage points for shares, money for amounts.</p>

        <div className="ld-two">
          <div className="ld-card" id="cmp-financing">
            <h3 className="ld-h3">How each is financed</h3>
            <p className="ld-sub">Share of Phase 1 cost, against all landscapes together.</p>
            <ul className="ld-legend" aria-hidden="true">
              <li><i className="ld-sw" data-sw="2"></i>Government convergence</li>
              <li><i className="ld-sw" data-sw="1"></i>Community contribution</li>
              <li><i className="ld-sw" data-sw="3"></i>Debt</li>
              <li><i className="ld-sw" data-sw="0"></i>Net grant + returnable grant</li>
            </ul>
            <div className="ld-chart ld-chart-short" data-draw="cmp-fin" data-source="landscapes"></div>
          </div>
          <div className="ld-card" id="cmp-gaps">
            <h3 className="ld-h3">Where they differ most</h3>
            <p className="ld-sub">The ten tags with the largest gap, in percentage points of Phase 1 cost.</p>
            <ul className="ld-legend" data-draw="cmp-gap-legend" aria-hidden="true"></ul>
            <div className="ld-chart" data-draw="cmp-gap-chart" data-source="compare"></div>
          </div>
        </div>

        <div className="ld-card" id="cmp-categories">
          <div className="ld-head-row">
            <div>
              <h3 className="ld-h3">Phase 1 cost by category</h3>
              <p className="ld-sub">From the line-level Data tab. Hover a row for both values.</p>
            </div>
            <div className="ld-seg" role="group" aria-label="Show categories as">
              <button type="button" className="ld-seg-btn" data-set="cmp_mode" data-value="share">% of landscape</button>
              <button type="button" className="ld-seg-btn" data-set="cmp_mode" data-value="rs">Amount</button>
            </div>
          </div>
          <div className="ld-chart" data-draw="cmp-cat-chart" data-source="compare_cats"></div>
        </div>

        <div className="ld-card" id="cmp-tags">
          <div className="ld-head-row">
            <div>
              <h3 className="ld-h3">Every tag, side by side</h3>
              <p className="ld-sub">% of Phase 1 cost under each tag.</p>
            </div>
            <label className="ld-field"><span>Lens</span>
              <select className="dash-select" data-param="cmp_lens" aria-label="Lens">
                <option value="ALL">All lenses</option>
                <option value="INSTITUTION TYPE">Institution type</option>
                <option value="EQUITY">Equity</option>
                <option value="GENDER">Gender</option>
                <option value="ECONOMIC PURPOSE">Economic purpose</option>
                <option value="CLIMATE">Climate</option>
                <option value="CAPITAL">Capital</option>
                <option value="BIODIVERSITY">Biodiversity</option>
              </select>
            </label>
          </div>
          <div className="ld-chart" data-draw="cmp-tag-chart" data-source="compare"></div>
        </div>

        <details className="ld-card ld-details-card" id="cmp-table">
          <summary>Every metric in a table</summary>
          <div className="ld-scroll ld-scroll-tall">
            <table className="ld-table" data-source="compare" data-row-key="sn">
              <thead><tr>
                <th data-field="metric">Metric</th>
                <th data-field="a"><span data-draw="cmp-name" data-side="a">—</span></th>
                <th data-field="b"><span data-draw="cmp-name" data-side="b">—</span></th>
                <th data-field="diff">Difference</th>
                <th data-field="all">All landscapes</th>
              </tr></thead>
              <tbody data-draw="cmp-table"></tbody>
            </table>
          </div>
        </details>
      </section>

  
      <section id="interventions" data-tab-panel="" role="tabpanel" className="ld-panel ld-panel-tool" hidden>
        <p className="ld-tool-eyebrow"><span>Tool</span>Filter, search and sort every cost line</p>
        <h2 className="ld-panel-title ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-1.webp" alt="" aria-hidden="true" width="48" height="48" />Interventions</h2>
        <div className="ld-card ld-filters" id="ix-filters">
          <label className="ld-field"><span>Landscape</span><select className="dash-select" data-draw="ix-land" aria-label="Landscape"></select></label>
          <label className="ld-field"><span>Category</span><select className="dash-select" data-draw="ix-cat" aria-label="Category"></select></label>
          <label className="ld-field"><span>Thematic investment</span><select className="dash-select" data-draw="ix-theme" aria-label="Thematic investment"></select></label>
          <label className="ld-field"><span>Tag lens</span>
            <select className="dash-select" data-param="ix_tagdim" aria-label="Tag lens">
              <option value="">Any lens</option>
              <option value="Climate">Climate</option>
              <option value="Equity">Equity</option>
              <option value="Gender">Gender</option>
              <option value="Economic Purpose">Economic purpose</option>
              <option value="Institution Type">Institution type</option>
              <option value="Capital">Capital</option>
              <option value="Biodiversity Class">Biodiversity</option>
            </select>
          </label>
          <label className="ld-field"><span>Tag</span><select className="dash-select" data-draw="ix-tagval" aria-label="Tag"></select></label>
          <label className="ld-field ld-field-grow"><span>Search interventions</span><input type="search" className="ld-input" data-param="ix_q" placeholder="e.g. seed, solar, goat" aria-label="Search interventions" /></label>
          <button type="button" className="ld-btn" id="ix-clear">Clear filters</button>
        </div>

        <div className="ld-kpis" id="ix-kpis">
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-enablers.webp" alt="" aria-hidden="true" width="56" height="56" data-role="enablers" /><p className="ld-kpi-label">Lines</p><p className="ld-kpi-value dash-skeleton" data-draw="ix-kpi" data-k="lines" data-source="ix_summary" data-field="lines" data-row="0">—</p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Phase 1 cost</p><p className="ld-kpi-value dash-skeleton" data-draw="ix-kpi" data-k="phase1" data-source="ix_summary" data-field="phase1" data-row="0">—</p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-enablers.webp" alt="" aria-hidden="true" width="56" height="56" data-role="enablers" /><p className="ld-kpi-label">Government</p><p className="ld-kpi-value dash-skeleton" data-draw="ix-kpi" data-k="govt" data-source="ix_summary" data-field="govt" data-row="0">—</p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-impactors.webp" alt="" aria-hidden="true" width="56" height="56" data-role="impactors" /><p className="ld-kpi-label">Community</p><p className="ld-kpi-value dash-skeleton" data-draw="ix-kpi" data-k="community" data-source="ix_summary" data-field="community" data-row="0">—</p></div>
          <div className="ld-card ld-has-role"><img className="ld-role" src="/dashboards/lp1/role-funders.webp" alt="" aria-hidden="true" width="56" height="56" data-role="funders" /><p className="ld-kpi-label">Investment required</p><p className="ld-kpi-value dash-skeleton" data-draw="ix-kpi" data-k="required" data-source="ix_summary" data-field="required" data-row="0">—</p></div>
        </div>

        <div className="ld-card" id="ix-list">
          <p className="ld-sub" data-draw="ix-count">—</p>
          <p className="ld-sub">Click a column heading to sort; click a landscape to open its profile.</p>
          <div className="ld-scroll ld-scroll-tall">
            <table className="ld-table ld-table-lines" data-source="lines" data-row-key="Landscape,S. No" data-fetchpriority="low">
              <thead><tr>
                <th data-field="Landscape" data-sort="Landscape">Landscape</th>
                <th data-field="Sub Intervention" data-sort="Sub Intervention">Intervention</th>
                <th data-field="Category" data-sort="Category">Category</th>
                <th data-field="Thematic Investment" data-sort="Thematic Investment">Thematic investment</th>
                <th data-field="Phase 1 Cost (Rs)" data-sort="Phase 1 Cost (Rs)">Phase 1 cost (<span data-draw="unit-small">—</span>)</th>
                <th data-field="Phase 1 Govt (Rs)" data-sort="Phase 1 Govt (Rs)">Government (<span data-draw="unit-small">—</span>)</th>
                <th data-field="Phase 1 Community (Rs)" data-sort="Phase 1 Community (Rs)">Community (<span data-draw="unit-small">—</span>)</th>
                <th data-field="Phase 1 Investment Required (Rs)" data-sort="Phase 1 Investment Required (Rs)">Investment required (<span data-draw="unit-small">—</span>)</th>
              </tr></thead>
              <tbody data-draw="ix-table"></tbody>
            </table>
          </div>
        </div>
      </section>

  
      <section id="tags" data-tab-panel="" role="tabpanel" className="ld-panel ld-panel-tool" hidden>
        <p className="ld-tool-eyebrow"><span>Tool</span>The full tag grid, cell by cell</p>
        <h2 className="ld-panel-title ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-2.webp" alt="" aria-hidden="true" width="48" height="48" />Tag table</h2>
        <div className="ld-card" id="all-metrics">
          <div className="ld-head-row">
            <p className="ld-sub">% of Phase 1 cost; a dash means nil. Average leaves out nil landscapes. Click a landscape heading to open its profile.</p>
            <label className="ld-field"><span>Shade cells by</span>
              <select className="dash-select" data-param="heat" aria-label="Shade cells by">
                <option value="share">Size of share</option>
                <option value="gap">Above or below average</option>
              </select>
            </label>
          </div>
          <ul className="ld-legend" data-draw="heat-legend" aria-hidden="true"></ul>
          <div className="ld-scroll">
            <table className="ld-table ld-table-heat" data-source="landscapes" data-row-key="sn" data-fetchpriority="low">
              <thead>
                <tr>
                  <th data-field="metric">Tag</th>
                  <th data-field="Vempalli" data-land="Vempalli">Vempalli</th>
                  <th data-field="Dharashiv" data-land="Dharashiv">Dharashiv</th>
                  <th data-field="Ahwa" data-land="Ahwa">Ahwa</th>
                  <th data-field="Dantewada" data-land="Dantewada">Dantewada</th>
                  <th data-field="Rajnagar" data-land="Rajnagar">Rajnagar</th>
                  <th data-field="Patratu" data-land="Patratu">Patratu</th>
                  <th data-field="Chitrakonda" data-land="Chitrakonda">Chitrakonda</th>
                  <th data-field="Mau" data-land="Mau">Mau</th>
                  <th data-field="Khasi" data-land="Khasi">Khasi</th>
                  <th data-field="Patharpratima" data-land="Patharpratima">Patharpratima</th>
                  <th data-field="All Landscapes" className="ld-col-all">All</th>
                  <th data-field="Average (nil left out)">Average</th>
                  <th data-field="Minimum (nil left out)">Min</th>
                  <th data-field="Maximum">Max</th>
                </tr>
              </thead>
              <tbody data-draw="metric-table"></tbody>
            </table>
          </div>
        </div>
      </section>

  
      <section id="studio" data-tab-panel="" role="tabpanel" className="ld-panel ld-panel-tool" hidden>
        <p className="ld-tool-eyebrow"><span>Tool</span>Build, compare and save your own views</p>
        <h2 className="ld-panel-title ld-has-step"><img className="ld-step" src="/dashboards/lp1/step-3.webp" alt="" aria-hidden="true" width="48" height="48" />Studio</h2>
        <p className="ld-sub">Build your own view from every cost line: pick what to group by, what to measure, how to draw it and which landscapes to compare. Save views you want to come back to.</p>

        <div className="ld-studio">
          <aside className="ld-card ld-controls" id="studio-controls" aria-label="Studio controls">
            <label className="ld-field"><span>Group by</span>
              <select className="dash-select" data-param="s_dim" aria-label="Group by">
                <option value="Category">Category</option>
                <option value="Thematic Investment">Thematic investment</option>
                <option value="Climate">Climate</option>
                <option value="Equity">Equity</option>
                <option value="Gender">Gender</option>
                <option value="Economic Purpose">Economic purpose</option>
                <option value="Institution Type">Institution type</option>
                <option value="Capital">Capital</option>
                <option value="Biodiversity Class">Biodiversity</option>
              </select>
            </label>
            <label className="ld-field"><span>Measure</span>
              <select className="dash-select" data-param="s_measure" aria-label="Measure">
                <option value="Phase 1 Cost (Rs)">Phase 1 cost</option>
                <option value="Phase 1 Investment Required (Rs)">Phase 1 investment required</option>
                <option value="Phase 1 Govt (Rs)">Phase 1 government</option>
                <option value="Phase 1 Community (Rs)">Phase 1 community</option>
                <option value="Total Cost (Rs)">Total cost, all phases</option>
                <option value="Total Investment Required (Rs)">Total investment required, all phases</option>
              </select>
            </label>
            <div className="ld-field"><span>Show as</span>
              <div className="ld-seg" role="group" aria-label="Show as">
                <button type="button" className="ld-seg-btn" data-set="s_mode" data-value="share">% of landscape</button>
                <button type="button" className="ld-seg-btn" data-set="s_mode" data-value="rs">Amount</button>
              </div>
            </div>
            <div className="ld-field"><span>Chart</span>
              <div className="ld-seg ld-seg-wrap" role="group" aria-label="Chart">
                <button type="button" className="ld-seg-btn" data-set="s_chart" data-value="stack">Stacked bars</button>
                <button type="button" className="ld-seg-btn" data-set="s_chart" data-value="dots">Dot plot</button>
                <button type="button" className="ld-seg-btn" data-set="s_chart" data-value="heat">Heatmap</button>
                <button type="button" className="ld-seg-btn" data-set="s_chart" data-value="treemap">Treemap</button>
                <button type="button" className="ld-seg-btn" data-set="s_chart" data-value="bars">Totals</button>
              </div>
            </div>
            <label className="ld-field"><span>Order landscapes by</span>
              <select className="dash-select" data-param="s_sort" aria-label="Order landscapes by">
                <option value="total">Largest total first</option>
                <option value="name">Name</option>
                <option value="first">Largest share of the top group</option>
              </select>
            </label>
            <label className="ld-field"><span>Groups to show</span>
              <select className="dash-select" data-param="s_top" data-type="number" aria-label="Groups to show">
                <option value="5">Top 5, rest as Other</option>
                <option value="8">Top 8, rest as Other</option>
                <option value="12">Top 12, rest as Other</option>
                <option value="0">All groups</option>
              </select>
            </label>
            <div className="ld-field"><span>Landscapes</span>
              <div className="ld-chips" data-draw="s-lands" aria-label="Landscapes to include"></div>
              <div className="ld-row">
                <button type="button" className="ld-link" id="s-all">All</button>
                <button type="button" className="ld-link" id="s-none">None</button>
              </div>
            </div>
            <fieldset className="ld-checks">
              <legend>Options</legend>
              <label><input type="checkbox" data-param="s_labels" /> Values on the chart</label>
              <label><input type="checkbox" data-param="s_avg" /> Average landscape</label>
              <label><input type="checkbox" data-param="s_total" /> All picked landscapes together</label>
            </fieldset>
            <button type="button" className="ld-btn" id="s-reset">Reset Studio</button>
          </aside>

          <div className="ld-studio-main">
            <div className="ld-card" id="studio-view">
              <h3 className="ld-h3" data-draw="s-title">—</h3>
              <p className="ld-sub" data-draw="s-caption">—</p>
              <ul className="ld-legend" data-draw="s-legend" aria-hidden="true"></ul>
              <div className="ld-chart ld-chart-tall" data-draw="studio-chart" data-source="studio_pivot"></div>
              <details className="ld-details" id="studio-table">
                <summary>See the numbers behind this view</summary>
                <div className="ld-scroll ld-scroll-tall">
                  <table className="ld-table" data-source="studio_pivot" data-row-key="landscape,group">
                    <thead><tr>
                      <th data-field="landscape">Landscape</th>
                      <th data-field="group">Group</th>
                      <th data-field="value">Amount (<span data-draw="unit-small">—</span>)</th>
                      <th data-field="share">% of landscape</th>
                    </tr></thead>
                    <tbody data-draw="studio-table"></tbody>
                  </table>
                </div>
              </details>
            </div>

            {canNotes && (
            <div className="ld-card" id="studio-saved">
              <h3 className="ld-h3">Saved views</h3>
              <p className="ld-sub">Save the Studio settings under a name and load them later. They are kept with your account or your access link, and only you see them.</p>
              <div className="ld-row">
                <input type="text" className="ld-input" id="view-name" placeholder="Name this view" aria-label="Name this view" maxLength={80} />
                <button type="button" className="ld-btn ld-btn-primary" id="view-save">Save view</button>
              </div>
              <p className="ld-warn" id="view-unsaved" hidden>That wasn't saved. You may not have permission to save here.</p>
              <ul className="ld-views" data-draw="views-list"></ul>
            </div>
            )}
          </div>
        </div>
      </section>

      <details className="ld-foot" id="notes">
        <summary>How these figures are worked out</summary>
        <p>Landscape figures come live from the Dashboard tab of the All-Landscape Phase 1 sheet, which reads the master budget sheets. Debt is read from the landscape budgets file; net grant plus returnable grant is investment required minus debt, so government, community, debt and net grant add up to 100%.</p>
        <p>"All" is each tag's share of the combined cost of all ten landscapes. "Average" is the simple average of the landscape shares that are not nil.</p>
        <p>The Interventions, Landscape profile categories and Studio views add up the line-level Data tab. Its totals can differ slightly from the Dashboard tab, which handles MAP / Community Leadership Programme lines on their own row.</p>
      </details>

      <footer className="ld-footer">
        <span>Consortium for Agroecological Transformations</span>
        <a href="https://agroecologyindia.org" target="_blank" rel="noopener">agroecologyindia.org</a>
      </footer>
    </div>
  );
}
