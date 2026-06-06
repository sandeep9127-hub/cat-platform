"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Mail, Globe, MapPin } from "lucide-react";

type Org = {
  id: string;
  name: string;
  orgType: string;
  domains: string[];
  locationCount: number;
  states: string[];
  contactPerson: string | null;
  designation: string | null;
  email: string | null;
  website: string | null;
};
type Loc = { orgId: string; lat: number; lng: number; state: string | null; district: string | null };

const TYPE_ORDER = [
  "NGO",
  "Civil Society (CSO/CBO)",
  "Non-profit",
  "Farmer / FPO",
  "Market player",
  "Finance",
  "Donor",
  "Educational / Research",
  "Other",
];

// Load Leaflet + markercluster from CDN once.
let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).L?.markerClusterGroup) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = (href: string) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    };
    css("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    css("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css");
    css("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css");
    const s1 = document.createElement("script");
    s1.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      s2.onload = () => resolve((window as any).L);
      s2.onerror = reject;
      document.body.appendChild(s2);
    };
    s1.onerror = reject;
    document.body.appendChild(s1);
  });
  return leafletPromise;
}

export function OrganizationsExplorer() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [stateF, setStateF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [domainF, setDomainF] = useState("");
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Org | null>(null);
  const [detailOrg, setDetailOrg] = useState<Org | null>(null);

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const highlightRef = useRef<any>(null);

  // fetch directory
  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((d) => {
        setOrgs(d.orgs || []);
        setLocs(d.locations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const states = useMemo(
    () => Array.from(new Set(orgs.flatMap((o) => o.states))).sort(),
    [orgs]
  );
  const domains = useMemo(
    () => Array.from(new Set(orgs.flatMap((o) => o.domains))).sort(),
    [orgs]
  );

  // filtered orgs
  const filteredOrgs = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return orgs.filter((o) => {
      if (ql && !o.name.toLowerCase().includes(ql)) return false;
      if (typeF && o.orgType !== typeF) return false;
      if (stateF && !o.states.includes(stateF)) return false;
      if (domainF && !o.domains.includes(domainF)) return false;
      return true;
    });
  }, [orgs, q, typeF, stateF, domainF]);

  const filteredOrgIds = useMemo(() => new Set(filteredOrgs.map((o) => o.id)), [filteredOrgs]);

  // locations to show: belong to a filtered org, and (if state filter) in that state
  const filteredLocs = useMemo(
    () =>
      locs.filter(
        (l) => filteredOrgIds.has(l.orgId) && (!stateF || l.state === stateF)
      ),
    [locs, filteredOrgIds, stateF]
  );

  useEffect(() => {
    setPage(0);
    highlightRef.current?.clearLayers();
  }, [q, stateF, typeF, domainF]);

  // init map
  useEffect(() => {
    if (loading || !mapEl.current) return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || mapRef.current) return;
      const map = L.map(mapEl.current, {
        scrollWheelZoom: true,
        attributionControl: true,
        minZoom: 4,
        maxZoom: 12,
        zoomControl: true,
      }).setView([22.5, 80], 5);
      // India outline from our own border-correct GeoJSON (the same geometry
      // the Solutions Atlas uses — 36 states/UTs incl. J&K, Ladakh, Arunachal),
      // instead of OpenStreetMap tiles which draw disputed international borders.
      fetch("/geo/india-states.json")
        .then((r) => r.json())
        .then((gj) => {
          const india = L.geoJSON(gj, {
            // Match the Solutions Atlas / Landscapes basemap: barely-tinted teal
            // states defined mostly by a thin teal stroke, over the cream
            // gradient set on the container. og-country adds the soft lift shadow.
            style: { color: "#2e7573", weight: 0.6, opacity: 0.32, fillColor: "#2e7573", fillOpacity: 0.07, className: "og-country" },
          }).addTo(map);
          india.bringToBack();
          // Fit to where the data actually is (mainland) rather than the full
          // GeoJSON — the Andaman/Lakshadweep islands would otherwise force a
          // zoom-out that shrinks mainland India. Loosen the pan boundary to
          // the full country so the islands stay reachable.
          try {
            const pts = locs.filter((l) => l.lat && l.lng).map((l) => [l.lat, l.lng]) as [number, number][];
            if (pts.length) map.fitBounds(pts, { padding: [16, 16] });
            else map.fitBounds(india.getBounds(), { padding: [12, 12] });
            map.setMaxBounds(india.getBounds().pad(0.4));
          } catch {}
        })
        .catch(() => {});
      const cluster = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 });
      map.addLayer(cluster);
      // a separate, non-clustered layer for the highlighted org's pins so they
      // always show on top of the cluster dots
      const hl = L.layerGroup().addTo(map);
      mapRef.current = map;
      clusterRef.current = cluster;
      highlightRef.current = hl;
      renderMarkers(L);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // re-render markers when filter changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !clusterRef.current) return;
    renderMarkers(L);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLocs]);

  function renderMarkers(L: any) {
    const cluster = clusterRef.current;
    const orgById = new Map(orgs.map((o) => [o.id, o]));
    cluster.clearLayers();
    const markers = filteredLocs.map((l) => {
      const o = orgById.get(l.orgId);
      const m = L.circleMarker([l.lat, l.lng], {
        // Glowing core pin, matching the Landscapes map dots: teal core with a
        // paper-coloured ring; og-dot adds the soft outer glow.
        radius: 5,
        color: "#fbf8f2",
        weight: 1.4,
        fillColor: "#2e7573",
        fillOpacity: 0.9,
        className: "og-dot",
      });
      m.bindPopup(
        `<strong>${o ? esc(o.name) : "Organisation"}</strong><br/>${esc(l.district || "")}${
          l.district && l.state ? ", " : ""
        }${esc(l.state || "")}<br/><span style="color:#6B7280;font-size:11px">${o ? esc(o.orgType) : ""}</span>` +
          (o?.contactPerson ? `<br/><span style="font-size:11px">${esc(o.contactPerson)}</span>` : "") +
          (o?.email ? `<br/><a href="mailto:${esc(o.email)}" style="font-size:11px;color:#2D7574">${esc(o.email)}</a>` : "")
      );
      return m;
    });
    cluster.addLayers(markers);
  }

  function focusOrg(o: Org) {
    const L = (window as any).L;
    if (!L || !mapRef.current || !highlightRef.current) return;
    const hl = highlightRef.current;
    hl.clearLayers();
    const myLocs = locs.filter((l) => l.orgId === o.id);
    const pts = myLocs.map((l) => [l.lat, l.lng]) as [number, number][];
    if (!pts.length) return;

    const pinIcon = L.divIcon({
      className: "og-pin",
      html:
        `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">` +
        `<path d="M15 0C6.7 0 0 6.7 0 15c0 10.3 15 25 15 25s15-14.7 15-25C30 6.7 23.3 0 15 0z" fill="#2D7574" stroke="#fff" stroke-width="2.5"/>` +
        `<circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>`,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -36],
    });

    myLocs.forEach((l, i) => {
      const m = L.marker([l.lat, l.lng], { icon: pinIcon, zIndexOffset: 1000 }).addTo(hl);
      m.bindPopup(
        `<strong>${esc(o.name)}</strong><br/>${esc(l.district || "")}${l.district && l.state ? ", " : ""}${esc(l.state || "")}` +
          (o.contactPerson ? `<br/><span style="font-size:11px">${esc(o.contactPerson)}</span>` : "") +
          (o.email ? `<br/><a href="mailto:${esc(o.email)}" style="font-size:11px;color:#2D7574">${esc(o.email)}</a>` : "")
      );
      if (i === 0) setTimeout(() => m.openPopup(), 380);
    });

    if (pts.length === 1) mapRef.current.setView(pts[0], 11, { animate: true });
    else mapRef.current.fitBounds(pts, { maxZoom: 11, padding: [60, 60], animate: true });
  }

  function clearHighlight() {
    highlightRef.current?.clearLayers();
  }

  const PAGE = 24;
  const pageCount = Math.ceil(filteredOrgs.length / PAGE);
  const shown = filteredOrgs.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="og">
      {/* header */}
      <header className="og-head">
        <div>
          <div className="og-eyebrow">Who’s working where</div>
          <h1 className="og-title">Organizations Atlas</h1>
          <p className="og-sub">
            {loading
              ? "Loading the directory…"
              : `${orgs.length} organisations across ${locs.length.toLocaleString()} work locations.`}
          </p>
        </div>
        <button className="og-add" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
          + Add or update an organisation
        </button>
      </header>

      {/* filters */}
      <div className="og-filters">
        <input
          className="og-input"
          placeholder="Search organisations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="og-select" value={stateF} onChange={(e) => setStateF(e.target.value)}>
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="og-select" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All types</option>
          {TYPE_ORDER.filter((t) => orgs.some((o) => o.orgType === t)).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="og-select" value={domainF} onChange={(e) => setDomainF(e.target.value)}>
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {(q || stateF || typeF || domainF) && (
          <button className="og-clear" onClick={() => { setQ(""); setStateF(""); setTypeF(""); setDomainF(""); }}>
            Clear
          </button>
        )}
        <span className="og-count">{filteredOrgs.length} orgs · {filteredLocs.length} points</span>
      </div>

      {/* split: list + map */}
      <div className="og-split">
        <div className="og-list">
          {shown.map((o) => (
            <article key={o.id} className="og-card" onClick={() => setDetailOrg(o)}>
              <div className="og-card-top">
                <h3 className="og-card-name">{o.name}</h3>
                <span className="og-type">{o.orgType}</span>
              </div>
              <div className="og-card-meta">
                <MapPin size={12} strokeWidth={1.8} aria-hidden className="og-meta-ic" />
                {o.locationCount} location{o.locationCount === 1 ? "" : "s"} · {o.states.length} state{o.states.length === 1 ? "" : "s"}
                {o.contactPerson ? ` · ${o.contactPerson}` : ""}
              </div>
              {o.domains.length > 0 && (
                <div className="og-domains">
                  {o.domains.slice(0, 4).map((d) => (
                    <span key={d} className="og-domain">{d}</span>
                  ))}
                  {o.domains.length > 4 && <span className="og-domain-more">+{o.domains.length - 4}</span>}
                </div>
              )}
              <div className="og-card-actions">
                <button className="og-view" onClick={(e) => { e.stopPropagation(); setDetailOrg(o); }}>
                  View details →
                </button>
                <button className="og-edit" onClick={(e) => { e.stopPropagation(); setEditTarget(o); setFormOpen(true); }}>
                  Suggest an edit
                </button>
                {o.website && (
                  <a
                    className="og-card-web"
                    href={o.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe size={12} strokeWidth={1.9} aria-hidden />
                    Website
                  </a>
                )}
              </div>
            </article>
          ))}
          {!loading && shown.length === 0 && <p className="og-empty">No organisations match these filters.</p>}
          {pageCount > 1 && (
            <div className="og-pager">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span>Page {page + 1} of {pageCount}</span>
              <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
        <div className="og-mapwrap">
          <div className="og-map" ref={mapEl} />
          <div className="og-map-frame" aria-hidden />
          {!loading && (
            <>
              <div className="og-map-badge">
                <span className="n">{filteredLocs.length.toLocaleString()}</span>
                <span>points</span>
                <span className="dot">·</span>
                <span className="n">
                  {new Set(filteredLocs.map((l) => l.state).filter(Boolean)).size}
                </span>
                <span>states</span>
              </div>
              <div className="og-map-legend">
                <div><span className="lg-dot t" /> Work location</div>
                <div><span className="lg-dot c" /> Cluster · zoom in</div>
              </div>
            </>
          )}
        </div>
      </div>

      {detailOrg && (
        <OrgDetail
          org={detailOrg}
          locations={locs.filter((l) => l.orgId === detailOrg.id)}
          onClose={() => setDetailOrg(null)}
          onLocate={() => { focusOrg(detailOrg); setDetailOrg(null); }}
          onEdit={() => { setEditTarget(detailOrg); setDetailOrg(null); setFormOpen(true); }}
        />
      )}

      {formOpen && (
        <SubmitForm
          orgs={orgs}
          editTarget={editTarget}
          onClose={() => setFormOpen(false)}
        />
      )}

      <Styles />
    </div>
  );
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

// Render a modal at the document root so it escapes any ancestor stacking
// context (the sticky header was otherwise painting over the sheet's top).
function portal(node: ReactNode) {
  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}

// ----- org detail panel ------------------------------------------------
function OrgDetail({
  org, locations, onClose, onLocate, onEdit,
}: {
  org: Org; locations: Loc[]; onClose: () => void; onLocate: () => void; onEdit: () => void;
}) {
  // group locations by state for a tidy "where they work" list
  const byState = new Map<string, string[]>();
  for (const l of locations) {
    const st = l.state || "—";
    const arr = byState.get(st) || [];
    if (l.district && !arr.includes(l.district)) arr.push(l.district);
    byState.set(st, arr);
  }
  const states = Array.from(byState.keys()).sort();

  return portal(
    <div className="og-modal" onClick={onClose}>
      <div className="og-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="og-close" onClick={onClose} aria-label="Close">×</button>
        <span className="og-type" style={{ display: "inline-block", marginBottom: 8 }}>{org.orgType}</span>
        <h2 className="og-sheet-title">{org.name}</h2>

        <div className="og-detail-contact">
          <div className="og-dc-label">Contact</div>
          {org.contactPerson ? (
            <div className="og-dc-row">
              <strong>{org.contactPerson}</strong>
              {org.designation ? <span className="og-dc-desig"> · {org.designation}</span> : null}
            </div>
          ) : <div className="og-dc-row og-muted">Contact person not listed</div>}
          <div className="og-dc-links">
            {org.email ? (
              <a className="og-dc-link og-dc-email" href={`mailto:${org.email}`}>
                <Mail size={14} strokeWidth={1.8} aria-hidden />
                <span>{org.email}</span>
              </a>
            ) : (
              <div className="og-dc-link og-muted">
                <Mail size={14} strokeWidth={1.8} aria-hidden />
                <span>Email not listed</span>
              </div>
            )}
            {org.website && (
              <a
                className="og-dc-link og-dc-web"
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe size={14} strokeWidth={1.8} aria-hidden />
                <span>{org.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
              </a>
            )}
          </div>
        </div>

        {org.domains.length > 0 && (
          <div className="og-detail-block">
            <div className="og-dc-label">Works on</div>
            <div className="og-domains">
              {org.domains.map((d) => <span key={d} className="og-domain">{d}</span>)}
            </div>
          </div>
        )}

        <div className="og-detail-block">
          <div className="og-dc-label">
            Where they work · {locations.length} location{locations.length === 1 ? "" : "s"} across {states.length} state{states.length === 1 ? "" : "s"}
          </div>
          <ul className="og-where">
            {states.map((st) => (
              <li key={st}>
                <strong>{st}</strong>
                {byState.get(st)!.length ? <span className="og-muted">: {byState.get(st)!.slice(0, 8).join(", ")}{byState.get(st)!.length > 8 ? "…" : ""}</span> : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="og-detail-actions">
          <button className="og-submit" style={{ flex: 1 }} onClick={onLocate}>Show on map</button>
          <button className="og-detail-edit" onClick={onEdit}>Suggest an edit</button>
        </div>
        <p className="og-note">Contact details are self-reported by the organisation.</p>
      </div>
    </div>
  );
}

// ----- submission form -------------------------------------------------
function SubmitForm({ orgs, editTarget, onClose }: { orgs: Org[]; editTarget: Org | null; onClose: () => void }) {
  const [mode, setMode] = useState<"new" | "edit">(editTarget ? "edit" : "new");
  const [targetId, setTargetId] = useState(editTarget?.id ?? "");
  const [f, setF] = useState({
    name: editTarget?.name ?? "",
    orgType: editTarget?.orgType ?? "",
    website: editTarget?.website ?? "",
    domains: editTarget?.domains.join(", ") ?? "",
    comments: "",
    contactPerson: "",
    contactEmail: "",
    submitterNote: "",
  });
  // One organisation can work in many places — collect a list of locations.
  type LocRow = { state: string; district: string; block: string };
  const [locations, setLocations] = useState<LocRow[]>([
    { state: "", district: "", block: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const upLoc = (i: number, k: keyof LocRow, v: string) =>
    setLocations((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addLoc = () =>
    setLocations((rows) => [...rows, { state: "", district: "", block: "" }]);
  const removeLoc = (i: number) =>
    setLocations((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  async function submit() {
    if (!f.name.trim()) { setErr("Organisation name is required."); return; }
    if (!f.contactEmail.trim()) { setErr("Your email is required so we can verify the entry."); return; }
    setBusy(true); setErr("");
    try {
      const cleanLocations = locations
        .map((l) => ({
          state: l.state.trim(),
          district: l.district.trim(),
          block: l.block.trim(),
        }))
        .filter((l) => l.state || l.district || l.block);
      const res = await fetch("/api/organizations/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submissionType: mode,
          targetOrgId: mode === "edit" ? targetId || null : null,
          name: f.name,
          orgType: f.orgType,
          website: f.website,
          domains: f.domains.split(",").map((d) => d.trim()).filter(Boolean),
          locations: cleanLocations,
          comments: f.comments,
          contactPerson: f.contactPerson,
          contactEmail: f.contactEmail,
          submitterNote: f.submitterNote,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setErr("Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return portal(
    <div className="og-modal" onClick={onClose}>
      <div className="og-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="og-close" onClick={onClose} aria-label="Close">×</button>
        {done ? (
          <div className="og-thanks">
            <h2>Thank you</h2>
            <p>Your submission has been received and will be reviewed before it appears in the directory.</p>
            <button className="og-submit" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <h2 className="og-sheet-title">Add or update an organisation</h2>
            <div className="og-toggle">
              <button className={mode === "new" ? "on" : ""} onClick={() => setMode("new")}>New organisation</button>
              <button className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")}>Suggest an edit</button>
            </div>

            {mode === "edit" && (
              <label className="og-field">
                <span>Which organisation?</span>
                <select value={targetId} onChange={(e) => {
                  setTargetId(e.target.value);
                  const o = orgs.find((x) => x.id === e.target.value);
                  if (o) setF((s) => ({ ...s, name: o.name, orgType: o.orgType, domains: o.domains.join(", ") }));
                }}>
                  <option value="">Select…</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
            )}

            <label className="og-field"><span>Organisation name *</span>
              <input value={f.name} onChange={(e) => up("name", e.target.value)} /></label>
            <div className="og-row">
              <label className="og-field"><span>Type</span>
                <select value={f.orgType} onChange={(e) => up("orgType", e.target.value)}>
                  <option value="">Select…</option>
                  {TYPE_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></label>
              <label className="og-field"><span>Website</span>
                <input value={f.website} onChange={(e) => up("website", e.target.value)} placeholder="https://example.org" inputMode="url" /></label>
            </div>

            {/* Work locations — one org can work in many places. */}
            <div className="og-locations">
              <div className="og-loc-head">
                <span>Where they work</span>
                <span className="og-loc-hint">Add a row for each location</span>
              </div>
              {locations.map((loc, i) => (
                <div key={i} className="og-loc-row">
                  <input className="og-loc-in" placeholder="State" value={loc.state} onChange={(e) => upLoc(i, "state", e.target.value)} />
                  <input className="og-loc-in" placeholder="District" value={loc.district} onChange={(e) => upLoc(i, "district", e.target.value)} />
                  <input className="og-loc-in" placeholder="Block" value={loc.block} onChange={(e) => upLoc(i, "block", e.target.value)} />
                  <button
                    type="button"
                    className="og-loc-del"
                    onClick={() => removeLoc(i)}
                    disabled={locations.length === 1}
                    aria-label="Remove this location"
                    title={locations.length === 1 ? "At least one location" : "Remove location"}
                  >×</button>
                </div>
              ))}
              <button type="button" className="og-add-loc" onClick={addLoc}>+ Add another location</button>
            </div>

            <label className="og-field"><span>Domains (comma-separated)</span>
              <input value={f.domains} onChange={(e) => up("domains", e.target.value)} placeholder="Livelihoods, Soil conservation, Seed management" /></label>
            <label className="og-field"><span>Anything else</span>
              <textarea rows={2} value={f.comments} onChange={(e) => up("comments", e.target.value)} /></label>

            <div className="og-pii">
              <div className="og-pii-label">Your details (not published, used only to verify the entry)</div>
              <div className="og-row">
                <label className="og-field"><span>Your name</span>
                  <input value={f.contactPerson} onChange={(e) => up("contactPerson", e.target.value)} /></label>
                <label className="og-field"><span>Your email *</span>
                  <input value={f.contactEmail} onChange={(e) => up("contactEmail", e.target.value)} /></label>
              </div>
            </div>

            {err && <p className="og-err">{err}</p>}
            <button className="og-submit" onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : mode === "new" ? "Submit new organisation" : "Submit edit"}
            </button>
            <p className="og-note">Submissions are reviewed before they appear. Personal details are never shown publicly.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .og { --t:#2D7574; --td:#1F5957; --ink:#1F261F; --muted:#6B7280; --paper:#fbf8f2; --line:rgba(31,38,31,.12);
        background: var(--paper); font-family: var(--font-inter), system-ui, sans-serif; color: var(--ink); }
      .og-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap;
        max-width:1280px; margin:0 auto; padding:32px 24px 16px; }
      .og-eyebrow { font-family: var(--font-jetbrains),monospace; font-size:10px; letter-spacing:1.6px; text-transform:uppercase; color:#b5793a; }
      .og-title { font-family: var(--font-inter),sans-serif; font-size:clamp(40px,5vw,68px); font-weight:600; letter-spacing:-.04em; line-height:1.0; margin:6px 0 6px; }
      .og-sub { font-size:15px; color:var(--ink-soft); max-width:70ch; }
      .og-add { flex:0 0 auto; font-size:13px; font-weight:500; letter-spacing:-.01em;
        padding:11px 20px; border-radius:999px; border:0; cursor:pointer; background:var(--td); color:#fff; transition:transform .15s, background .15s; }
      .og-add:hover { background:var(--teal-2,#2e7573); opacity:.94; }
      .og-add:active { transform:scale(.97); }
      .og-filters { display:flex; gap:10px; flex-wrap:wrap; align-items:center; max-width:1280px; margin:0 auto; padding:10px 24px 16px; }
      .og-input,.og-select { font-family:inherit; font-size:13.5px; padding:9px 12px; border:1px solid var(--line); border-radius:0; background:#fff; color:var(--ink); }
      .og-input:focus,.og-select:focus { outline:none; border-color:var(--rule); }
      .og-input { min-width:220px; flex:1 1 220px; }
      .og-clear { font-size:12px; color:var(--muted); background:none; border:0; cursor:pointer; text-decoration:underline; }
      .og-count { margin-left:auto; font-family:var(--font-jetbrains),monospace; font-size:11px; color:var(--muted); }
      .og-split { display:grid; grid-template-columns: 1fr 1fr; gap:0; max-width:1280px; margin:0 auto; padding:0 24px 40px;
        height: calc(100vh - 250px); min-height:520px; }
      .og-list { overflow-y:auto; padding-right:16px; display:flex; flex-direction:column; gap:0; }
      .og-card { border:1px solid var(--line); border-top:0; border-radius:0; padding:16px; background:var(--paper); cursor:pointer; transition:background .15s; }
      .og-list > .og-card:first-child { border-top:1px solid var(--line); }
      .og-card:hover { background:var(--cream); }
      .og-card-top { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
      .og-card-name { font-family:var(--font-fraunces),Georgia,serif; font-size:16.5px; font-weight:600; line-height:1.2; }
      .og-type { flex:0 0 auto; font-family:var(--font-jetbrains),monospace; font-size:9.5px; text-transform:uppercase; letter-spacing:.06em;
        color:var(--td); background:rgba(45,117,116,.08); border:1px solid rgba(45,117,116,.2); border-radius:999px; padding:3px 8px; white-space:nowrap; }
      .og-card-meta { font-size:12.5px; color:var(--muted); margin-top:5px; display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
      .og-meta-ic { color:var(--td); opacity:.7; flex:0 0 auto; }
      .og-domains { display:flex; flex-wrap:wrap; gap:5px; margin-top:9px; }
      .og-domain { font-size:11px; padding:2px 8px; border-radius:999px; background:rgba(31,38,31,.05); color:var(--ink); }
      .og-domain-more { font-size:11px; color:var(--muted); padding:2px 4px; }
      .og-card-actions { display:flex; gap:14px; margin-top:11px; align-items:center; }
      .og-view, .og-edit { font-family:var(--font-jetbrains),monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; padding:6px 0; min-height:32px; display:inline-flex; align-items:center;
        background:none; border:0; cursor:pointer; padding:0; }
      .og-view { color:var(--td); font-weight:600; }
      .og-edit { color:var(--muted); }
      .og-card-web { font-family:var(--font-jetbrains),monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--td); text-decoration:none; margin-left:auto; display:inline-flex; align-items:center; gap:5px; }
      .og-view:hover, .og-edit:hover, .og-card-web:hover { text-decoration:underline; }
      /* website in detail */
      /* contact links — stacked with breathing room, icon-led */
      .og-dc-links { display:flex; flex-direction:column; gap:9px; margin-top:10px; }
      .og-dc-link { display:inline-flex; align-items:center; gap:8px; font-size:13.5px; color:var(--td); text-decoration:none; width:fit-content; }
      .og-dc-link > svg { flex:0 0 auto; opacity:.75; }
      .og-dc-link.og-muted { color:var(--muted); }
      a.og-dc-link:hover { text-decoration:underline; }
      /* multi-location repeater (submit form) */
      .og-locations { margin:4px 0 2px; }
      .og-loc-head { display:flex; align-items:baseline; gap:8px; margin-bottom:7px; }
      .og-loc-head > span:first-child { font-size:12.5px; font-weight:600; color:var(--ink); }
      .og-loc-hint { font-family:var(--font-jetbrains),monospace; font-size:9.5px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); }
      .og-loc-row { display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:8px; margin-bottom:8px; align-items:center; }
      .og-loc-in { width:100%; padding:8px 10px; border:1px solid var(--line); border-radius:8px; font-size:13.5px; background:#fff; }
      .og-loc-in:focus { outline:none; border-color:var(--td); box-shadow:0 0 0 3px rgba(45,117,116,.16); }
      .og-loc-del { width:30px; height:30px; flex:0 0 auto; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--muted); font-size:17px; line-height:1; cursor:pointer; transition:color .15s, border-color .15s; }
      .og-loc-del:hover:not(:disabled) { color:#B85042; border-color:#B85042; }
      .og-loc-del:disabled { opacity:.35; cursor:not-allowed; }
      .og-add-loc { font-family:var(--font-jetbrains),monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--td); background:none; border:1px dashed rgba(45,117,116,.4); border-radius:8px; padding:7px 12px; cursor:pointer; transition:background .15s; }
      .og-add-loc:hover { background:rgba(45,117,116,.06); }
      /* detail panel */
      .og-detail-contact { background:rgba(45,117,116,.06); border:1px solid rgba(45,117,116,.18); border-radius:12px; padding:14px 16px; margin:6px 0 16px; }
      .og-dc-label { font-family:var(--font-jetbrains),monospace; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--td); margin-bottom:6px; }
      .og-dc-row { font-size:15px; }
      .og-dc-desig { color:var(--muted); }
      .og-muted { color:var(--muted); }
      .og-detail-block { margin-bottom:16px; }
      .og-where { list-style:none; margin:6px 0 0; padding:0; display:flex; flex-direction:column; gap:5px; max-height:200px; overflow-y:auto; }
      .og-where li { font-size:13.5px; line-height:1.4; }
      .og-detail-actions { display:flex; gap:10px; margin-top:6px; }
      .og-detail-edit { flex:0 0 auto; font-family:var(--font-jetbrains),monospace; font-size:11px; text-transform:uppercase; letter-spacing:.06em;
        padding:0 16px; border-radius:10px; border:1px solid var(--line); background:#fff; color:var(--ink); cursor:pointer; }
      .og-detail-edit:hover { border-color:var(--td); color:var(--td); }
      .og-empty { color:var(--muted); padding:30px 0; }
      .og-pager { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 2px 30px; font-size:12.5px; color:var(--muted); }
      .og-pager button { font-family:inherit; font-size:12.5px; padding:6px 12px; border:1px solid var(--line); border-radius:8px; background:#fff; cursor:pointer; }
      .og-pager button:disabled { opacity:.4; cursor:default; }
      /* ── Map styled to match the Landscapes / Solutions Atlas basemap ── */
      .og-mapwrap { position:relative; height:100%; min-height:520px; }
      .og-map { border:1px solid var(--line); border-radius:10px; overflow:hidden; height:100%; min-height:520px; z-index:0;
        box-shadow: 0 1px 2px rgba(26,38,37,.04), 0 12px 32px -16px rgba(46,117,115,.20); }
      .og-map .leaflet-container { height:100%; width:100%;
        background: radial-gradient(ellipse 70% 55% at 50% 10%, rgba(232,242,235,.65), transparent 70%),
                    linear-gradient(180deg, rgba(248,243,232,1) 0%, rgba(244,237,221,.85) 100%); }
      /* soft lift under the landmass + glow on each work-location dot */
      .og-map .leaflet-overlay-pane path.og-country { filter: drop-shadow(0 5px 12px rgba(26,38,37,.10)); }
      .og-map .leaflet-overlay-pane path.og-dot { filter: drop-shadow(0 0 4px rgba(46,117,115,.55)); }
      /* dashed inner frame, echoing the Landscapes map */
      .og-map-frame { position:absolute; inset:11px; border:1px dashed var(--line); border-radius:6px; pointer-events:none; z-index:650; }
      /* teal counter badge, top-right */
      .og-map-badge { position:absolute; top:14px; right:14px; z-index:660; display:flex; align-items:center; gap:6px;
        font-family:var(--font-jetbrains),monospace; font-size:10px; text-transform:uppercase; letter-spacing:.13em; color:#f3efe6;
        background: linear-gradient(135deg,#334B4A 0%,#2E7573 60%,#334B4A 100%); padding:8px 12px; border-radius:8px;
        border:1px solid rgba(251,248,242,.12); box-shadow:0 10px 28px -12px rgba(26,38,37,.45), inset 0 1px 0 rgba(255,255,255,.10); }
      .og-map-badge .n { color:#f8ca7c; font-size:12px; font-weight:600; }
      .og-map-badge .dot { opacity:.45; }
      /* legend, bottom-left */
      .og-map-legend { position:absolute; bottom:14px; left:14px; z-index:660; display:flex; flex-direction:column; gap:6px;
        font-family:var(--font-jetbrains),monospace; font-size:9px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted);
        background:rgba(251,248,242,.92); backdrop-filter:blur(6px); border:1px solid var(--line); border-radius:8px; padding:9px 11px;
        box-shadow:0 6px 16px -10px rgba(26,38,37,.20); }
      .og-map-legend > div { display:flex; align-items:center; gap:7px; }
      .lg-dot { width:10px; height:10px; border-radius:999px; flex:0 0 auto; }
      .lg-dot.t { background:#2e7573; box-shadow:0 0 0 3px rgba(46,117,115,.18); }
      .lg-dot.c { background:linear-gradient(135deg,#2E7573,#1F5957); box-shadow:0 0 0 3px rgba(46,117,115,.18); }
      /* cluster bubbles → teal halo to match the dot language */
      .og .marker-cluster { background:transparent; }
      .og .marker-cluster div { background:linear-gradient(135deg, rgba(46,117,115,.94), rgba(31,89,87,.94)); color:#fbf8f2;
        font-family:var(--font-jetbrains),monospace; font-weight:600; border:1.5px solid rgba(251,248,242,.92);
        box-shadow:0 0 0 6px rgba(46,117,115,.16), 0 4px 10px -4px rgba(26,38,37,.4); }
      .og .marker-cluster span { line-height:30px; }
      .og-pin { background:transparent !important; border:0 !important; }
      .og-pin svg { filter: drop-shadow(0 3px 4px rgba(31,38,37,.35)); animation: og-drop .35s cubic-bezier(.2,.8,.2,1); transform-origin: 50% 100%; }
      @keyframes og-drop { 0% { transform: translateY(-12px) scale(.7); opacity:0; } 100% { transform: none; opacity:1; } }

      /* modal */
      .og-modal { position:fixed; inset:0; background:rgba(26,38,37,.5); display:flex; align-items:flex-start; justify-content:center; z-index:1000; padding:40px 16px; overflow-y:auto; }
      .og-sheet { background:var(--paper); border-radius:16px; max-width:560px; width:100%; padding:28px 28px 24px; position:relative; box-shadow:0 30px 80px -30px rgba(0,0,0,.5); }
      .og-close { position:absolute; top:14px; right:16px; width:32px; height:32px; border-radius:999px; border:1px solid var(--line); background:none; cursor:pointer; font-size:20px; color:var(--muted); }
      .og-sheet-title { font-family:var(--font-fraunces),Georgia,serif; font-size:24px; font-weight:600; margin:0 0 14px; }
      .og-toggle { display:flex; gap:6px; background:rgba(31,38,31,.05); border-radius:10px; padding:4px; margin-bottom:16px; }
      .og-toggle button { flex:1; font-family:inherit; font-size:13px; padding:8px; border:0; border-radius:7px; background:none; cursor:pointer; color:var(--muted); }
      .og-toggle button.on { background:#fff; color:var(--ink); font-weight:600; box-shadow:0 1px 2px rgba(0,0,0,.06); }
      .og-field { display:flex; flex-direction:column; gap:4px; margin-bottom:11px; }
      .og-field > span { font-size:11.5px; color:var(--muted); }
      .og-field input,.og-field select,.og-field textarea { font-family:inherit; font-size:13.5px; padding:9px 11px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); }
      .og-row { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
      .og-pii { border-top:1px dashed var(--line); margin-top:8px; padding-top:14px; }
      .og-pii-label { font-size:11.5px; color:#b5793a; margin-bottom:8px; }
      .og-err { color:#b3261e; font-size:12.5px; margin:4px 0; }
      .og-submit { width:100%; margin-top:10px; font-family:var(--font-jetbrains),monospace; font-size:12px; text-transform:uppercase; letter-spacing:.08em;
        padding:14px; border-radius:6px; border:0; cursor:pointer; background:var(--td); color:#fff; }
      .og-submit:disabled { opacity:.6; }
      .og-note { font-size:11.5px; color:var(--muted); margin-top:10px; text-align:center; }
      .og-thanks { text-align:center; padding:20px 0; }
      .og-thanks h2 { font-family:var(--font-fraunces),Georgia,serif; font-size:26px; margin-bottom:8px; }
      .og-thanks p { color:var(--muted); font-size:14px; margin-bottom:18px; }

      @media (max-width: 900px) {
        .og-split { grid-template-columns:1fr; height:auto; }
        .og-list { padding-right:0; max-height:none; }
        .og-mapwrap { height:420px; min-height:0; margin-top:12px; }
        .og-map { height:420px; min-height:0; }
        .og-row { grid-template-columns:1fr; }
      }
    `}</style>
  );
}
