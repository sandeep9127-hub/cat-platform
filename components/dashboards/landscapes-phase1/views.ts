/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck -- a close port of the dashboard's tabs.js and studio.js, kept line-for-line so behaviour and numbers match.
import * as d3 from "d3";
import type { Runtime } from "./runtime";

export type DocsApi = { put: (kind: "note" | "view", key: string, data: any) => Promise<void>; del: (kind: "note" | "view", key: string) => Promise<void>; refresh: () => Promise<void> };

/** Registers every calculation, drawing and control of the dashboard on `rt`. Listeners are removed through `signal`. */
export function mountViews(rt: Runtime, LD: any, root: HTMLElement, tabsRef: { current: any }, api: DocsApi, signal: AbortSignal) {
  const listen = (el, type, fn) => el.addEventListener(type, fn, {signal});
rt.calc('by_category', {
  title: 'Phase 1 cost by category',
  description: 'Phase 1 cost of every line, added up by category across all ten landscapes, and each category\'s share of the total.',
  inputs: ['lines'],
  fn: (lines) => {
    const total = d3.sum(lines, (r) => r['Phase 1 Cost (Rs)'] || 0);
    return d3.rollups(lines, (v) => d3.sum(v, (r) => r['Phase 1 Cost (Rs)'] || 0), (r) => r.Category || '(no category)')
      .map(([Category, phase1]) => ({Category, phase1, share: total ? (phase1 / total) * 100 : null}))
      .sort((a, b) => b.phase1 - a.phase1);
  }
});

rt.calc('tag_gap', {
  title: 'Tag share vs the average',
  description: 'For the tag picked on the Lenses tab, each landscape\'s share of its Phase 1 cost minus the average of the landscapes that are not nil.',
  inputs: ['landscapes'],
  fn: (rows) => {
    const p = rt.params();
    const lens = p.lens || 'INSTITUTION TYPE';
    const inLens = rows.filter((x) => String(x.section).toUpperCase().startsWith(lens));
    const r = inLens.find((x) => x.sn === p.tag) || inLens[0];
    if (!r) return [];
    const skip = new Set(['sn', 'section', 'metric', 'All Landscapes', 'Average (nil left out)', 'Minimum (nil left out)', 'Maximum']);
    const avg = r['Average (nil left out)'];
    return Object.keys(r).filter((k) => !skip.has(k)).map((landscape) => ({
      landscape, tag: r.metric, share: r[landscape], average: avg,
      gap: r[landscape] == null || avg == null ? null : Math.round((r[landscape] - avg) * 10) / 10
    }));
  }
});

rt.calc('ix_summary', {
  title: 'Interventions in view',
  description: 'Lines that match the filters on the Interventions tab: how many, and their Phase 1 cost, government, community and investment required.',
  inputs: ['lines'],
  fn: (lines) => {
    const p = rt.params();
    const q = String(p.ix_q || '').toLowerCase().trim();
    const keep = lines.filter((r) =>
      (!p.ix_land || r.Landscape === p.ix_land) &&
      (!p.ix_cat || (String(p.ix_cat).endsWith('*') ? String(r.Category).startsWith(String(p.ix_cat).slice(0, -1)) : r.Category === p.ix_cat)) &&
      (!p.ix_theme || r['Thematic Investment'] === p.ix_theme) &&
      (!p.ix_tagdim || !p.ix_tagval || r[p.ix_tagdim] === p.ix_tagval) &&
      (!q || String(r['Sub Intervention']).toLowerCase().includes(q)));
    const s = (k) => d3.sum(keep, (r) => r[k] || 0);
    return [{lines: keep.length, phase1: s('Phase 1 Cost (Rs)'), govt: s('Phase 1 Govt (Rs)'),
      community: s('Phase 1 Community (Rs)'), required: s('Phase 1 Investment Required (Rs)')}];
  }
});

rt.calc('theme_nrm', {
  title: 'Natural resource management',
  description: 'Phase 1 cost of every line whose category starts with NRM (NRM Private and NRM Community), added up across all ten landscapes, with its share of all lines.',
  inputs: ['lines'],
  fn: (lines) => {
    const cost = (r) => r['Phase 1 Cost (Rs)'] || 0;
    const total = d3.sum(lines, cost);
    const nrm = lines.filter((r) => String(r.Category).startsWith('NRM'));
    const priv = d3.sum(nrm.filter((r) => r.Category === 'NRM Private'), cost);
    const comm = d3.sum(nrm.filter((r) => r.Category === 'NRM Community'), cost);
    const phase1 = d3.sum(nrm, cost);
    return [{phase1, share: total ? Math.round((phase1 / total) * 1000) / 10 : null, private: priv, community: comm}];
  }
});

rt.calc('studio_pivot', {
  title: 'Studio view',
  description: 'Lines for the landscapes picked in Studio, added up by the chosen tag and measure, with each group\'s share of that landscape\'s total. Groups past the top N are added together as Other.',
  inputs: ['lines'],
  fn: (lines) => {
    const p = rt.params();
    const dim = p.s_dim || 'Category';
    const m = p.s_measure || 'Phase 1 Cost (Rs)';
    const top = Number(p.s_top ?? 8);
    const lands = Array.isArray(p.s_lands) ? new Set(p.s_lands) : null;
    const rows = lines.filter((r) => !lands || lands.has(r.Landscape));
    const key = (r) => r[dim] || '(blank)';
    const order = d3.rollups(rows, (v) => d3.sum(v, (r) => r[m] || 0), key).sort((a, b) => b[1] - a[1]).map((d) => d[0]);
    const keep = new Set(top > 0 && order.length > top ? order.slice(0, top - 1) : order);
    const out = [];
    for (const [landscape, groups] of d3.rollup(rows, (v) => d3.sum(v, (r) => r[m] || 0), (r) => r.Landscape, (r) => (keep.has(key(r)) ? key(r) : 'Other'))) {
      const total = d3.sum([...groups.values()]);
      for (const [group, value] of groups) out.push({landscape, group, value, share: total ? Math.round((value / total) * 1000) / 10 : null});
    }
    return out;
  }
});

rt.calc('compare', {
  title: 'Two landscapes side by side',
  description: 'Every Dashboard-tab metric for the two landscapes picked on the Compare tab, and the first minus the second (percentage points for shares, Rs for amounts).',
  inputs: ['landscapes'],
  fn: (rows) => {
    const p = rt.params();
    const a = p.cmp_a || 'Ahwa', b = p.cmp_b || 'Khasi';
    return rows.map((r) => {
      const va = r[a] ?? null, vb = r[b] ?? null;
      const money = ['1', '2', '7a', '7b'].includes(r.sn);
      const diff = va == null || vb == null ? null : money ? va - vb : Math.round((va - vb) * 10) / 10;
      return {sn: r.sn, section: r.section, metric: r.metric, a: va, b: vb, diff, all: r['All Landscapes'] ?? null};
    });
  }
});

rt.calc('compare_cats', {
  title: 'Two landscapes by category',
  description: 'Phase 1 cost of each landscape picked on the Compare tab, added up by category from the line-level Data tab, in Rs and as a share of that landscape\'s lines.',
  inputs: ['lines'],
  fn: (lines) => {
    const p = rt.params();
    const a = p.cmp_a || 'Ahwa', b = p.cmp_b || 'Khasi';
    const sum = (land) => d3.rollup(lines.filter((r) => r.Landscape === land), (v) => d3.sum(v, (r) => r['Phase 1 Cost (Rs)'] || 0), (r) => r.Category || '(no category)');
    const A = sum(a), B = sum(b);
    const ta = d3.sum([...A.values()]), tb = d3.sum([...B.values()]);
    const cats = [...new Set([...A.keys(), ...B.keys()])];
    return cats.map((Category) => {
      const ra = A.get(Category) || 0, rb = B.get(Category) || 0;
      return {Category, a: ra, b: rb, a_share: ta ? Math.round((ra / ta) * 1000) / 10 : null, b_share: tb ? Math.round((rb / tb) * 1000) / 10 : null};
    }).sort((x, y) => (y.a + y.b) - (x.a + x.b));
  }
});


/* Tabs, controls, and the drawings for Overview, Costs, Lenses, Profile, Interventions and Tag table. */

rt.calc('profile_cats', {
  title: 'Profile: cost by category',
  description: 'Phase 1 cost of the lines of the landscape picked on the Landscape profile tab, added up by category, with each category\'s share of that landscape\'s lines.',
  inputs: ['lines'],
  fn: (lines) => {
    const land = rt.params().landscape || 'Ahwa';
    const mine = lines.filter((r) => r.Landscape === land);
    const total = d3.sum(mine, (r) => r['Phase 1 Cost (Rs)'] || 0);
    return d3.rollups(mine, (v) => d3.sum(v, (r) => r['Phase 1 Cost (Rs)'] || 0), (r) => r.Category || '(no category)')
      .map(([Category, phase1]) => ({Category, phase1, share: total ? Math.round((phase1 / total) * 1000) / 10 : null}))
      .sort((a, b) => b.phase1 - a.phase1);
  }
});

/* ---------- Tabs ---------- */
const tabs = (() => {
  const ids = () => [...root.querySelectorAll('[data-tab-panel]')].map((s) => s.id);
  let current = 'overview';
  function open(id, focus) {
    if (!ids().includes(id)) id = 'overview';
    current = id;
    root.querySelectorAll('[data-tab-panel]').forEach((s) => { s.hidden = s.id !== id; });
    root.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    rt.setLink(id);
    // Charts are sized from their container, so draw again once the tab is visible.
    rt.schedule();
  }
  root.querySelectorAll('[data-tab]').forEach((b) => {
    listen(b, 'click', () => open(b.dataset.tab));
    listen(b, 'keydown', (ev) => {
      const tabs = [...root.querySelectorAll('[data-tab]')];
      const i = tabs.indexOf(b);
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const n = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        open(n.dataset.tab, true);
      }
    });
  });
  // Open the tab named in the link, or the tab holding the element it names.
  const hash = decodeURIComponent((location.hash || '').slice(1));
  if (hash) {
    const el = hash ? root.querySelector('#' + CSS.escape(hash)) : null;
    const panel = el && (el.matches('[data-tab-panel]') ? el : el.closest('[data-tab-panel]'));
    if (panel) {
      open(panel.id);
      if (el !== panel) requestAnimationFrame(() => el.scrollIntoView({block: 'start'}));
    } else open('overview');
  }
  // A link to another tab on this page (or the browser's back button) opens it too.
  listen(window, 'hashchange', () => {
    const id = decodeURIComponent((location.hash || '').slice(1));
    const el = id ? root.querySelector('#' + CSS.escape(id)) : null;
    const panel = el && (el.matches('[data-tab-panel]') ? el : el.closest('[data-tab-panel]'));
    if (panel && panel.id !== current) open(panel.id);
  });
  // Printing lays out every tab, one per page.
  listen(window, 'beforeprint', () => { root.querySelectorAll('[data-tab-panel]').forEach((s) => { s.hidden = false; }); rt.render(); });
  listen(window, 'afterprint', () => open(current));
  return {open, get current() { return current; }};
})();

/* ---------- Controls bound to filters ---------- */
function ldParse(el, raw) {
  if (el.type === 'checkbox') return el.checked;
  if (el.dataset.type === 'number') return Number(raw);
  return raw;
}
root.querySelectorAll('[data-param]').forEach((el) => {
  const name = el.dataset.param;
  if (el.type === 'search' || el.type === 'text') {
    let t;
    listen(el, 'input', () => { clearTimeout(t); t = setTimeout(() => rt.setParams({[name]: el.value.trim()}), 250); });
  } else {
    listen(el, 'change', () => {
      const patch = {[name]: ldParse(el, el.value)};
      if (name === 'ix_tagdim') patch.ix_tagval = '';
      if (name === 'lens') patch.tag = '';
      rt.setParams(patch);
    });
  }
});
root.querySelectorAll('[data-set]').forEach((b) => {
  listen(b, 'click', () => rt.setParams({[b.dataset.set]: b.dataset.value}));
});
rt.onData(() => {
  root.querySelectorAll('[data-param]').forEach((el) => {
    if (el === document.activeElement) return;
    const v = LD.p(el.dataset.param);
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v == null ? '' : String(v);
  });
  root.querySelectorAll('[data-set]').forEach((b) => {
    const on = String(LD.p(b.dataset.set)) === b.dataset.value;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  // Notes: show the saved note for the landscape in view, unless someone is typing.
  const ta = root.querySelector('#note-text');
  if (ta && ta !== document.activeElement) {
    const n = rt.data('notes');
    const mine = n.status === 'ok' ? (n.data || []).find((r) => r.id === LD.p('landscape')) : null;
    ta.value = mine && typeof mine.note === 'string' ? mine.note : '';
  }
});

/* Expose the series colours to the stylesheet so the hero, tabs and cards follow the look and theme. */
rt.onData(() => { root.querySelectorAll('.ld-sw[data-sw]').forEach((s) => { s.style.background = LD.color(Number(s.dataset.sw)); }); });

/* Click a landscape heading in the tag table to open its profile. */
root.querySelectorAll('.ld-table-heat th[data-land]').forEach((th) => {
  listen(th, 'click', () => LD.openProfile(th.dataset.land));
});

/* Interventions: sort by heading, clear filters. */
root.querySelectorAll('#ix-list th[data-sort]').forEach((th) => {
  listen(th, 'click', () => {
    const k = th.dataset.sort;
    const same = LD.p('ix_sort') === k;
    const numeric = /\(Rs\)$/.test(k);
    rt.setParams({ix_sort: k, ix_dir: same ? (LD.p('ix_dir') === 'asc' ? 'desc' : 'asc') : (numeric ? 'desc' : 'asc')});
  });
});
rt.onData(() => {
  root.querySelectorAll('#ix-list th[data-sort]').forEach((th) => {
    if (th.dataset.sort === LD.p('ix_sort')) th.setAttribute('aria-sort', LD.p('ix_dir') === 'asc' ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  });
});
root.querySelectorAll('#ix-clear').forEach((b) => listen(b, 'click', () => {
  rt.setParams({ix_land: '', ix_cat: '', ix_theme: '', ix_tagdim: '', ix_tagval: '', ix_q: ''});
}));

/* Notes */
root.querySelectorAll('#note-save').forEach((b) => listen(b, 'click', async () => {
  const land = LD.p('landscape');
  const ta = root.querySelector('#note-text');
  let saved = true;
  try {
    await api.put('note', land, {landscape: land, note: ta ? ta.value : '', at: new Date().toISOString()});
    await api.refresh();
  } catch { saved = false; }
  root.querySelectorAll('#note-unsaved').forEach((p) => { p.hidden = saved; });
  root.querySelectorAll('#note-saved').forEach((p) => { p.hidden = !saved; });
}));

/* ---------- Shared small drawings ---------- */
function ldSelect(sel, options, current, onPick) {
  sel.replaceChildren(...options.map(([v, label]) => new Option(label, v)));
  sel.value = current ?? '';
  if (sel.value !== (current ?? '') && options.length) sel.value = options[0][0];
  sel.onchange = () => onPick(sel.value);
}

/* ---------- Overview ---------- */
rt.draw('lede-cost', (el) => { const g = LD.data('landscapes'); if (LD.pending(el, g)) return; const r = LD.row(g, '1'); el.textContent = r ? LD.fmtCrore(r[LD.ALL]) : '—'; });
rt.draw('lede-net', (el) => { const g = LD.data('landscapes'); if (LD.pending(el, g)) return; const r = LD.row(g, '6'); el.textContent = r ? LD.fmtPct(r[LD.ALL]) : '—'; });
function hhExtreme(which) {
  const g = LD.data('landscapes'); const r = LD.row(g, '7a');
  if (!r) return null;
  const list = LD.landscapes(g).filter((n) => r[n] != null).map((n) => ({n, v: r[n]}));
  if (!list.length) return null;
  return list.reduce((a, b) => (which === 'min' ? (b.v < a.v ? b : a) : (b.v > a.v ? b : a)));
}
['min', 'max'].forEach((w) => {
  rt.draw('hh-' + w, (el) => {
    const g = LD.data('landscapes'); if (LD.pending(el, g)) return;
    const e = hhExtreme(w);
    if (!e) { el.textContent = '—'; return; }
    el.setAttribute('data-field', e.n);
    el.textContent = LD.fmtRs(e.v);
  });
  rt.draw('hh-' + w + '-name', (el) => {
    if (LD.data('landscapes').status !== 'ok') { el.textContent = '—'; return; }
    const e = hhExtreme(w); el.textContent = e ? e.n : '—';
  });
});
rt.draw('kpi-crore', (el) => { const g = LD.data('landscapes'); if (LD.pending(el, g)) return; const r = LD.row(g, el.dataset.sn); el.textContent = r ? LD.fmtCrore(r[LD.ALL]) : '—'; });
rt.draw('kpi-pct', (el) => { const g = LD.data('landscapes'); if (LD.pending(el, g)) return; const r = LD.row(g, el.dataset.sn); el.textContent = r ? LD.fmtPct(r[LD.ALL]) : '—'; });

rt.draw('financing-chart', (el) => {
  const g = LD.data('landscapes'); if (LD.pending(el, g, 'chart')) return;
  const sns = ['3', '4', '5', '6'];
  const rows = sns.map((sn) => LD.row(g, sn));
  LD.stack(el, {
    cats: [...LD.landscapes(g).map((n) => ({key: n, label: n})), {key: LD.ALL, label: 'All landscapes', bold: true, gapBefore: true}],
    series: ['Government convergence', 'Community contribution', 'Debt', 'Net grant + returnable grant'],
    val: (k, i) => (rows[i] ? rows[i][k] : null), max: 100, fmt: LD.fmtPct, segFmt: (v) => d3.format('.0f')(v) + '%', colorIdx: [2, 1, 3, 0],
    aria: 'Stacked bars: share of Phase 1 cost from government, community, debt and net grant for each landscape and all landscapes.',
    onCat: LD.openProfile
  });
});

rt.draw('category-chart', (el) => {
  const g = LD.data('by_category'); if (LD.pending(el, g, 'chart')) return;
  LD.bars(el, (g.data || []).map((r) => ({name: r.Category, value: r.phase1, share: r.share})), {
    fmt: (v) => LD.fmtCr(v), aria: 'Bar chart of Phase 1 cost in Rs crore by category across all landscapes.',
    onClick: (d) => { rt.setParams({ix_cat: d.name, ix_land: ''}); tabs.open('interventions'); }, hint: 'Click to see its lines'
  });
  // Add each category's share after its amount.
  const shares = new Map((g.data || []).map((r) => [LD.fmtCr(r.phase1), r.share]));
  el.querySelectorAll('text.ld-val').forEach((t) => { const s = shares.get(t.textContent); if (s != null) t.textContent += '  (' + LD.fmtPct(s) + ')'; });
});

/* Theme tiles: amount and share for each illustrated category; a click opens its lines. */
function themeSrc(el) { return el.dataset.cat === 'NRM*' ? 'theme_nrm' : 'by_category'; }
function themeRow(el) {
  const g = LD.data(themeSrc(el));
  if (g.status !== 'ok') return null;
  return el.dataset.cat === 'NRM*' ? (g.data || [])[0] : (g.data || []).find((r) => r.Category === el.dataset.cat);
}
rt.draw('theme-split', (el) => {
  const g = LD.data('theme_nrm'); if (LD.pending(el, g)) return;
  const r = (g.data || [])[0]; el.textContent = r ? LD.fmtCrore(r[el.dataset.k]) : '—';
});
rt.draw('theme-amt', (el) => {
  const g = LD.data(themeSrc(el)); if (LD.pending(el, g)) return;
  const r = themeRow(el); el.textContent = r ? LD.fmtCrore(r.phase1) : '—';
});
rt.draw('theme-share', (el) => {
  const r = themeRow(el); el.textContent = r ? LD.fmtPct(r.share) : '—';
});
// Keep the tiles in order of amount, largest first, whatever the data says now.
rt.onData(() => {
  const tiles = [...root.querySelectorAll('.ld-theme[data-cat]')];
  const amt = (b) => { const r = themeRow(b); return r && r.phase1 != null ? r.phase1 : -1; };
  const sorted = tiles.map((b) => [b, amt(b)]).sort((x, y) => y[1] - x[1]).map(([b]) => b);
  if (sorted.some((b, i) => b !== tiles[i]) && sorted.length) {
    const parent = sorted[0].parentElement;
    const keep = root.ownerDocument.activeElement;
    sorted.forEach((b) => parent.appendChild(b));
    if (keep && keep.isConnected && keep !== root.ownerDocument.activeElement) keep.focus();
  }
});
root.querySelectorAll('.ld-theme[data-cat]').forEach((b) => listen(b, 'click', () => {
  rt.setParams({ix_cat: b.dataset.cat, ix_land: '', ix_theme: '', ix_tagdim: '', ix_tagval: '', ix_q: ''});
  tabs.open('interventions');
}));

/* ---------- Costs ---------- */
function costBars(el, sn, fmt, aria, refFrom) {
  const g = LD.data('landscapes'); if (LD.pending(el, g, 'chart')) return;
  const r = LD.row(g, sn) || {};
  LD.bars(el, LD.landscapes(g).map((n) => ({name: n, value: r[n]})), {
    fmt, aria, onClick: (d) => LD.openProfile(d.name),
    ref: refFrom === 'avg' ? r[LD.AVG] : refFrom === 'all' ? r[LD.ALL] : refFrom, refLabel: refFrom === 'avg' ? 'Average' : refFrom === 'all' ? 'All' : ''
  });
}
rt.draw('cost-chart', (el) => costBars(el, '1', (v) => LD.fmtCr(v), 'Bar chart of Phase 1 cost in Rs crore for each landscape.', 'avg'));
rt.draw('share-chart', (el) => costBars(el, '7', LD.fmtPct, 'Bar chart of each landscape\'s share of the combined Phase 1 cost.', 10));
rt.draw('hh-chart', (el) => costBars(el, '7a', (v) => LD.fmtMoney(v), 'Bar chart of Phase 1 cost per household in Rs for each landscape.', 'all'));
rt.draw('ha-chart', (el) => costBars(el, '7b', (v) => LD.fmtMoney(v), 'Bar chart of Phase 1 cost per hectare of gross cropped area in Rs, for the landscapes that record it.', 'all'));
rt.draw('ha-missing', (el) => {
  const g = LD.data('landscapes'); if (g.status !== 'ok') { el.textContent = '—'; return; }
  const r = LD.row(g, '7b') || {};
  const miss = LD.landscapes(g).filter((n) => r[n] == null);
  el.textContent = miss.length ? miss.join(', ') : 'none';
});

/* ---------- Lenses ---------- */
function lensRows(g, lens) {
  return (g.data || []).filter((r) => String(r.section).toUpperCase().startsWith(lens || LD.p('lens')));
}
rt.draw('lens-legend', (ul) => {
  const g = LD.data('landscapes'); if (g.status !== 'ok') { ul.replaceChildren(); return; }
  ul.replaceChildren(...lensRows(g).map((r, i) => {
    const li = document.createElement('li');
    const sw = document.createElement('i'); sw.className = 'ld-sw'; sw.style.background = LD.color(i);
    li.append(sw, document.createTextNode(LD.shortName(r.metric)));
    return li;
  }));
});
rt.draw('lens-chart', (el) => {
  const g = LD.data('landscapes'); if (LD.pending(el, g, 'chart')) return;
  const rows = lensRows(g);
  if (!rows.length) { LD.msg(el, 'This lens has no rows in the sheet.', {hint: 'Pick another lens.'}); return; }
  LD.stack(el, {
    cats: [...LD.landscapes(g).map((n) => ({key: n, label: n})), {key: LD.ALL, label: 'All landscapes', bold: true, gapBefore: true}],
    series: rows.map((r) => LD.shortName(r.metric)), val: (k, i) => rows[i][k], max: 100,
    fmt: LD.fmtPct, segFmt: (v) => d3.format('.0f')(v) + '%', onCat: LD.openProfile,
    aria: 'Stacked bars: share of Phase 1 cost by ' + LD.p('lens').toLowerCase() + ' tag for each landscape and all landscapes.'
  });
});
rt.draw('tag-select', (sel) => {
  const g = LD.data('landscapes'); if (g.status !== 'ok') { sel.replaceChildren(); return; }
  const rows = lensRows(g);
  const cur = rows.find((r) => r.sn === LD.p('tag')) ? LD.p('tag') : (rows[0] || {}).sn;
  ldSelect(sel, rows.map((r) => [r.sn, LD.shortName(r.metric)]), cur, (v) => rt.setParams({tag: v}));
});
rt.draw('gap-tag', (el) => {
  const g = LD.data('tag_gap'); if (g.status !== 'ok' || !(g.data || []).length) { el.textContent = '—'; return; }
  el.textContent = LD.shortName(g.data[0].tag).toLowerCase();
});
rt.draw('gap-avg', (el) => {
  const g = LD.data('tag_gap'); if (LD.pending(el, g)) return;
  el.textContent = (g.data || []).length ? LD.fmtPct(g.data[0].average) : '—';
});
rt.draw('gap-chart', (el) => {
  const g = LD.data('tag_gap'); if (LD.pending(el, g, 'chart')) return;
  const items = (g.data || []).filter((r) => r.gap != null).map((r) => ({name: r.landscape, value: r.gap}));
  const nil = (g.data || []).filter((r) => r.gap == null).map((r) => r.landscape);
  LD.bars(el, items, {
    signed: true, negColor: LD.color(1), fmt: (v) => (v > 0 ? '+' : '') + d3.format('.1f')(v) + ' pts', onClick: (d) => LD.openProfile(d.name),
    aria: 'Diverging bars: each landscape\'s share for the chosen tag minus the average, in percentage points.'
  });
  if (nil.length) { const p = document.createElement('p'); p.className = 'ld-sub'; p.textContent = 'Nil, so left out: ' + nil.join(', '); el.append(p); }
});

/* ---------- Landscape profile ---------- */
rt.draw('pf-select', (sel) => {
  const g = LD.data('landscapes'); if (g.status !== 'ok') { sel.replaceChildren(); return; }
  ldSelect(sel, LD.landscapes(g).map((n) => [n, n]), LD.p('landscape'), (v) => rt.setParams({landscape: v}));
});
rt.draw('pf-name', (el) => { el.textContent = LD.p('landscape') || '—'; });
rt.draw('pf-kpi', (el) => {
  const g = LD.data('landscapes'); if (LD.pending(el, g)) return;
  const land = LD.p('landscape');
  el.setAttribute('data-field', land);
  const r = LD.row(g, el.dataset.sn);
  const v = r ? r[land] : null;
  const k = el.dataset.kind;
  el.textContent = k === 'crore' ? LD.fmtCrore(v) : k === 'rs' ? LD.fmtRs(v) : LD.fmtPct(v);
});
rt.draw('kpi-all', (el) => {
  const g = LD.data('landscapes'); if (LD.pending(el, g)) return;
  const r = LD.row(g, el.dataset.sn); const v = r ? r[LD.ALL] : null;
  el.textContent = el.dataset.sn === '7a' ? LD.fmtRs(v) : LD.fmtPct(v);
});
rt.draw('pf-cat-chart', (el) => {
  const g = LD.data('profile_cats'); if (LD.pending(el, g, 'chart')) return;
  LD.bars(el, (g.data || []).map((r) => ({name: r.Category, value: r.phase1})), {
    fmt: (v) => LD.fmtCr(v), aria: 'Bar chart of this landscape\'s Phase 1 cost by category, in Rs crore.',
    onClick: (d) => { rt.setParams({ix_cat: d.name, ix_land: LD.p('landscape')}); tabs.open('interventions'); }, hint: 'Click to see its lines'
  });
  const shares = new Map((g.data || []).map((r) => [LD.fmtCr(r.phase1), r.share]));
  el.querySelectorAll('text.ld-val').forEach((t) => { const s = shares.get(t.textContent); if (s != null) t.textContent += '  (' + LD.fmtPct(s) + ')'; });
});
rt.draw('pf-dots', (el) => {
  const g = LD.data('landscapes'); if (LD.pending(el, g, 'chart')) return;
  const lands = LD.landscapes(g);
  const rows = [], points = [], avg = {};
  let sec = null;
  (g.data || []).filter((r) => !['1', '2', '7', '7a', '7b'].includes(r.sn)).forEach((r) => {
    if (r.section !== sec) { sec = r.section; rows.push({head: true, label: sec.replace(/\s*\(.*\)\s*$/, '').toLowerCase().replace(/^./, (c) => c.toUpperCase())}); }
    rows.push({key: r.sn, label: LD.shortName(r.metric)});
    avg[r.sn] = r[LD.ALL];
    lands.forEach((n) => points.push({row: r.sn, name: n, value: r[n]}));
  });
  LD.dots(el, rows, points, {hl: LD.p('landscape'), avg, avgLabel: 'All landscapes', fmt: LD.fmtPct, max: 100, tick: (v) => v + '%',
    aria: 'Dot plot of every tag\'s share of Phase 1 cost, with this landscape highlighted against the others and all landscapes.'});
});
function ldEmptyRow(span, text, hint) {
  const tr = document.createElement('tr'); tr.className = 'ld-empty-row';
  const td = document.createElement('td'); td.colSpan = span; td.className = 'ld-empty-cell';
  td.append(LD.emptyArt(text, {hint}));
  tr.append(td);
  return tr;
}
function lineKey(r) { return encodeURIComponent(r.Landscape) + ',' + encodeURIComponent(r['S. No']); }
function lineRow(r, cols, opts) {
  const tr = document.createElement('tr'); tr.dataset.key = lineKey(r);
  cols.forEach((c) => {
    const td = document.createElement('td');
    const v = r[c];
    td.textContent = /\(Rs\)$/.test(c) ? LD.fmtMoney(v) : (c === 'Thematic Investment' ? LD.shortGroup(v || '—') : (v || '—'));
    if (c === 'Landscape' && opts && opts.linkLand) { td.className = 'ld-cell-link'; td.onclick = () => LD.openProfile(v); }
    tr.append(td);
  });
  return tr;
}
rt.draw('pf-top-table', (tb) => {
  const g = LD.data('lines'); if (g.status !== 'ok') { tb.replaceChildren(); return; }
  const land = LD.p('landscape');
  const rows = (g.data || []).filter((r) => r.Landscape === land).sort((a, b) => (b['Phase 1 Cost (Rs)'] || 0) - (a['Phase 1 Cost (Rs)'] || 0)).slice(0, 15);
  if (!rows.length) { tb.replaceChildren(ldEmptyRow(6, 'No lines for ' + land + ' in the Data tab.', 'Pick another landscape above.')); return; }
  tb.replaceChildren(...rows.map((r) => lineRow(r, ['Sub Intervention', 'Category', 'Phase 1 Cost (Rs)', 'Phase 1 Govt (Rs)', 'Phase 1 Community (Rs)', 'Phase 1 Investment Required (Rs)'])));
});

/* ---------- Interventions ---------- */
function uniq(rows, k) { return [...new Set(rows.map((r) => r[k]).filter(Boolean))].sort(d3.ascending); }
function ixFiltered(lines) {
  const q = String(LD.p('ix_q') || '').toLowerCase().trim();
  const dim = LD.p('ix_tagdim'), val = LD.p('ix_tagval');
  return lines.filter((r) =>
    (!LD.p('ix_land') || r.Landscape === LD.p('ix_land')) &&
    (!LD.p('ix_cat') || (String(LD.p('ix_cat')).endsWith('*') ? String(r.Category).startsWith(String(LD.p('ix_cat')).slice(0, -1)) : r.Category === LD.p('ix_cat'))) &&
    (!LD.p('ix_theme') || r['Thematic Investment'] === LD.p('ix_theme')) &&
    (!dim || !val || r[dim] === val) &&
    (!q || String(r['Sub Intervention']).toLowerCase().includes(q)));
}
rt.draw('ix-land', (sel) => {
  const g = LD.data('lines'); if (g.status !== 'ok') { sel.replaceChildren(); return; }
  ldSelect(sel, [['', 'All landscapes'], ...uniq(g.data, 'Landscape').map((v) => [v, v])], LD.p('ix_land'), (v) => rt.setParams({ix_land: v}));
});
rt.draw('ix-cat', (sel) => {
  const g = LD.data('lines'); if (g.status !== 'ok') { sel.replaceChildren(); return; }
  const cats = uniq(g.data, 'Category');
  const groups = cats.some((v) => v.startsWith('NRM')) ? [['NRM*', 'All NRM (private and community)']] : [];
  ldSelect(sel, [['', 'All categories'], ...groups, ...cats.map((v) => [v, v])], LD.p('ix_cat'), (v) => rt.setParams({ix_cat: v}));
});
rt.draw('ix-theme', (sel) => {
  const g = LD.data('lines'); if (g.status !== 'ok') { sel.replaceChildren(); return; }
  const vals = uniq(g.data, 'Thematic Investment').sort((a, b) => (parseInt(a.replace(/\D+/, ''), 10) || 0) - (parseInt(b.replace(/\D+/, ''), 10) || 0));
  ldSelect(sel, [['', 'All thematic investments'], ...vals.map((v) => [v, LD.shortGroup(v)])], LD.p('ix_theme'), (v) => rt.setParams({ix_theme: v}));
});
rt.draw('ix-tagval', (sel) => {
  const g = LD.data('lines'); const dim = LD.p('ix_tagdim');
  sel.disabled = !dim;
  if (g.status !== 'ok' || !dim) { sel.replaceChildren(new Option('Pick a lens first', '')); return; }
  ldSelect(sel, [['', 'Any tag'], ...uniq(g.data, dim).map((v) => [v, v])], LD.p('ix_tagval'), (v) => rt.setParams({ix_tagval: v}));
});
rt.draw('ix-kpi', (el) => {
  const g = LD.data('ix_summary'); if (LD.pending(el, g)) return;
  const r = (g.data || [])[0]; const k = el.dataset.k;
  el.textContent = !r ? '—' : k === 'lines' ? LD.fmtIN(r[k]) : LD.fmtCrore(r[k]);
});
const IX_MAX = 200;
rt.draw('ix-count', (el) => {
  const g = LD.data('lines'); if (g.status !== 'ok') { el.textContent = g.status === 'loading' ? 'Loading lines…' : "The lines couldn't load."; return; }
  const n = ixFiltered(g.data || []).length;
  el.textContent = n === 0 ? 'No lines match these filters.' : n > IX_MAX ? `Showing the first ${IX_MAX} of ${LD.fmtIN(n)} matching lines. Narrow the filters to see the rest.` : `Showing all ${LD.fmtIN(n)} matching lines.`;
});
rt.draw('ix-table', (tb) => {
  const g = LD.data('lines'); if (g.status !== 'ok') { tb.replaceChildren(); return; }
  const k = LD.p('ix_sort'), dir = LD.p('ix_dir') === 'asc' ? 1 : -1;
  const rows = ixFiltered(g.data || []).sort((a, b) => {
    const x = a[k], y = b[k];
    if (typeof x === 'number' || typeof y === 'number') return dir * ((x ?? -Infinity) - (y ?? -Infinity));
    return dir * String(x ?? '').localeCompare(String(y ?? ''));
  }).slice(0, IX_MAX);
  if (!rows.length) { tb.replaceChildren(ldEmptyRow(8, 'No lines match these filters.', 'Clear a filter, or try another word in the search.')); return; }
  tb.replaceChildren(...rows.map((r) => lineRow(r, ['Landscape', 'Sub Intervention', 'Category', 'Thematic Investment', 'Phase 1 Cost (Rs)', 'Phase 1 Govt (Rs)', 'Phase 1 Community (Rs)', 'Phase 1 Investment Required (Rs)'], {linkLand: true})));
});

/* ---------- Tag table ---------- */
rt.draw('heat-legend', (ul) => {
  const mk = (bg, text) => { const li = document.createElement('li'); const sw = document.createElement('i'); sw.className = 'ld-sw'; sw.style.background = bg; li.append(sw, document.createTextNode(text)); return li; };
  ul.replaceChildren(...(LD.p('heat') === 'gap'
    ? [mk(`color-mix(in srgb, ${LD.color(0)} 55%, transparent)`, 'Above the average'), mk(`color-mix(in srgb, ${LD.color(1)} 55%, transparent)`, 'Below the average')]
    : [mk(`color-mix(in srgb, ${LD.color(0)} 15%, transparent)`, 'Small share'), mk(`color-mix(in srgb, ${LD.color(0)} 60%, transparent)`, 'Large share')]));
});
rt.draw('metric-table', (tb) => {
  const g = LD.data('landscapes'); if (g.status !== 'ok') { tb.replaceChildren(); return; }
  const lands = LD.landscapes(g);
  const head = [...lands, LD.ALL, LD.AVG, 'Minimum (nil left out)', 'Maximum'];
  const mode = LD.p('heat');
  const out = [];
  let sec = null;
  (g.data || []).filter((r) => !['1', '2', '7a', '7b'].includes(r.sn)).forEach((r) => {
    if (r.section !== sec) {
      sec = r.section;
      const tr = document.createElement('tr'); tr.className = 'ld-sec';
      const td = document.createElement('td'); td.colSpan = head.length + 1;
      td.textContent = sec.replace(/\s*\(.*\)\s*$/, '').toLowerCase().replace(/^./, (c) => c.toUpperCase());
      tr.append(td); out.push(tr);
    }
    const tr = document.createElement('tr'); tr.dataset.key = r.sn;
    const th = document.createElement('td'); th.textContent = r.metric; tr.append(th);
    head.forEach((h) => {
      const td = document.createElement('td');
      const v = r[h];
      td.textContent = LD.fmtPct(v);
      if (h === LD.ALL) td.className = 'ld-col-all';
      if (v != null && lands.includes(h)) {
        if (mode === 'gap' && r[LD.AVG] != null) {
          const d = v - r[LD.AVG];
          const k = Math.min(1, Math.abs(d) / 20);
          td.style.background = `color-mix(in srgb, ${LD.color(d >= 0 ? 0 : 1)} ${Math.round(k * 60)}%, transparent)`;
        } else if (mode !== 'gap' && v > 0) td.style.background = `color-mix(in srgb, ${LD.color(0)} ${Math.round(Math.min(v, 100) * 0.55)}%, transparent)`;
      }
      tr.append(td);
    });
    out.push(tr);
  });
  tb.replaceChildren(...out);
});

/* ---------- Currency units ---------- */
rt.draw('unit-big', (el) => { el.textContent = LD.unitBig(); });
rt.draw('unit-small', (el) => { el.textContent = LD.unitSmall(); });

/* ---------- Compare ---------- */
function cmpNames() { return {a: LD.p('cmp_a'), b: LD.p('cmp_b')}; }
function cmpPick(side, v) {
  const n = cmpNames();
  const other = side === 'a' ? n.b : n.a;
  // Picking the landscape already on the other side swaps them.
  if (v === other) rt.setParams({cmp_a: side === 'a' ? v : n.b, cmp_b: side === 'a' ? n.a : v});
  else rt.setParams({[side === 'a' ? 'cmp_a' : 'cmp_b']: v});
}
['a', 'b'].forEach((side) => {
  rt.draw('cmp-' + side, (sel) => {
    const g = LD.data('landscapes'); if (g.status !== 'ok') { sel.replaceChildren(); return; }
    ldSelect(sel, LD.landscapes(g).map((n) => [n, n]), cmpNames()[side], (v) => cmpPick(side, v));
  });
});
root.querySelectorAll('#cmp-swap').forEach((b) => listen(b, 'click', () => {
  const n = cmpNames(); rt.setParams({cmp_a: n.b, cmp_b: n.a});
}));
root.querySelectorAll('#pf-compare').forEach((b) => listen(b, 'click', () => {
  const land = LD.p('landscape');
  const patch = {cmp_a: land};
  if (LD.p('cmp_b') === land) patch.cmp_b = LD.p('cmp_a') === land ? (land === 'Khasi' ? 'Ahwa' : 'Khasi') : LD.p('cmp_a');
  rt.setParams(patch);
  tabs.open('compare');
}));
rt.draw('cmp-name', (el) => {
  const side = el.dataset.side === 'b' ? 'b' : 'a';
  el.textContent = cmpNames()[side];
  el.style.boxShadow = 'inset 0 -3px 0 ' + LD.color(side === 'a' ? 0 : 1);
});
function cmpFmt(kind, v) { return kind === 'crore' ? LD.fmtCrore(v) : kind === 'rs' ? LD.fmtRs(v) : LD.fmtPct(v); }
function cmpDiff(kind, v) {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  const a = Math.abs(v);
  return kind === 'pct' ? sign + d3.format('.1f')(a) + ' pts' : sign + cmpFmt(kind, a);
}
rt.draw('cmp-val', (el) => {
  const g = LD.data('compare'); if (LD.pending(el, g)) return;
  const r = (g.data || []).find((x) => x.sn === el.dataset.sn);
  const side = el.dataset.side;
  const v = r ? r[side] : null;
  el.textContent = side === 'diff' ? cmpDiff(el.dataset.kind, v) : cmpFmt(el.dataset.kind, v);
});
rt.draw('cmp-fin', (el) => {
  const g = LD.data('landscapes'); if (LD.pending(el, g, 'chart')) return;
  const rows = ['3', '4', '5', '6'].map((sn) => LD.row(g, sn));
  const n = cmpNames();
  LD.stack(el, {
    cats: [{key: n.a, label: n.a}, {key: n.b, label: n.b}, {key: LD.ALL, label: 'All landscapes', bold: true, gapBefore: true}],
    series: ['Government convergence', 'Community contribution', 'Debt', 'Net grant + returnable grant'],
    val: (k, i) => (rows[i] ? rows[i][k] : null), max: 100, fmt: LD.fmtPct, segFmt: (v) => d3.format('.0f')(v) + '%', colorIdx: [2, 1, 3, 0],
    aria: 'Stacked bars: how ' + n.a + ' and ' + n.b + ' finance Phase 1, against all landscapes.', onCat: LD.openProfile
  });
});
const CMP_SKIP = ['1', '2', '7', '7a', '7b'];
rt.draw('cmp-gap-legend', (ul) => {
  const n = cmpNames();
  const mk = (i, text) => { const li = document.createElement('li'); const sw = document.createElement('i'); sw.className = 'ld-sw'; sw.style.background = LD.color(i); li.append(sw, document.createTextNode(text)); return li; };
  ul.replaceChildren(mk(0, 'Larger in ' + n.a), mk(1, 'Larger in ' + n.b));
});
rt.draw('cmp-gap-chart', (el) => {
  const g = LD.data('compare'); if (LD.pending(el, g, 'chart')) return;
  const items = (g.data || []).filter((r) => !CMP_SKIP.includes(r.sn) && r.diff != null && r.diff !== 0)
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)).slice(0, 10)
    .map((r) => ({name: LD.shortName(r.metric), value: r.diff, key: r.sn}));
  if (!items.length) { LD.msg(el, 'These two landscapes have the same shares on every tag.', {hint: 'Pick two different landscapes above.'}); return; }
  LD.bars(el, items, {signed: true, posColor: LD.color(0), negColor: LD.color(1),
    fmt: (v) => (v > 0 ? '+' : '') + d3.format('.1f')(v) + ' pts',
    aria: 'Diverging bars: the ten tags where the two landscapes differ most, in percentage points.'});
});
rt.draw('cmp-cat-chart', (el) => {
  const g = LD.data('compare_cats'); if (LD.pending(el, g, 'chart')) return;
  const rows = g.data || [];
  if (!rows.length) { LD.msg(el, 'Neither landscape has lines in the Data tab.', {hint: 'Try another pair.'}); return; }
  const share = LD.p('cmp_mode') !== 'rs';
  const by = new Map(rows.map((r) => [r.Category, r]));
  const n = cmpNames();
  LD.butterfly(el, rows.map((r) => ({key: r.Category, label: r.Category})),
    (k) => (share ? by.get(k).a_share : by.get(k).a), (k) => (share ? by.get(k).b_share : by.get(k).b), {
      nameA: n.a, nameB: n.b,
      fmt: share ? LD.fmtPct : (v) => (v == null ? '—' : LD.fmtCr(v)),
      aria: 'Back-to-back bars of Phase 1 cost by category for ' + n.a + ' and ' + n.b + '.'
    });
  if (!share) { const p = document.createElement('p'); p.className = 'ld-sub'; p.textContent = 'Amounts in ' + LD.unitBig() + '.'; el.append(p); }
});
rt.draw('cmp-tag-chart', (el) => {
  const g = LD.data('compare'); if (LD.pending(el, g, 'chart')) return;
  const lens = LD.p('cmp_lens');
  const rows = [];
  const by = new Map();
  let sec = null;
  (g.data || []).filter((r) => !CMP_SKIP.includes(r.sn) && (lens === 'ALL' || String(r.section).toUpperCase().startsWith(lens))).forEach((r) => {
    if (lens === 'ALL' && r.section !== sec) { sec = r.section; rows.push({head: true, label: sec.replace(/\s*\(.*\)\s*$/, '').toLowerCase().replace(/^./, (c) => c.toUpperCase())}); }
    rows.push({key: r.sn, label: LD.shortName(r.metric)});
    by.set(r.sn, r);
  });
  const n = cmpNames();
  LD.butterfly(el, rows, (k) => by.get(k).a, (k) => by.get(k).b, {nameA: n.a, nameB: n.b, fmt: LD.fmtPct,
    aria: 'Back-to-back bars of each tag\'s share of Phase 1 cost for ' + n.a + ' and ' + n.b + '.'});
});
rt.draw('cmp-table', (tb) => {
  const g = LD.data('compare'); if (g.status !== 'ok') { tb.replaceChildren(); return; }
  const kind = (sn) => (sn === '1' || sn === '2' ? 'crore' : sn === '7a' || sn === '7b' ? 'rs' : 'pct');
  const out = [];
  let sec = null;
  (g.data || []).forEach((r) => {
    if (r.section !== sec) {
      sec = r.section;
      const tr = document.createElement('tr'); tr.className = 'ld-sec';
      const td = document.createElement('td'); td.colSpan = 5;
      td.textContent = sec.replace(/\s*\(.*\)\s*$/, '').toLowerCase().replace(/^./, (c) => c.toUpperCase());
      tr.append(td); out.push(tr);
    }
    const k = kind(r.sn);
    const tr = document.createElement('tr'); tr.dataset.key = r.sn;
    [r.metric, cmpFmt(k, r.a), cmpFmt(k, r.b), cmpDiff(k, r.diff), cmpFmt(k, r.all)].forEach((v, i) => {
      const td = document.createElement('td'); td.textContent = v;
      if (i === 3 && r.diff) td.style.color = LD.color(r.diff > 0 ? 0 : 1);
      tr.append(td);
    });
    out.push(tr);
  });
  tb.replaceChildren(...out);
});

/* Studio: a view builder over every cost line, with saved views. */

const S_KEYS = ['s_dim', 's_measure', 's_mode', 's_chart', 's_lands', 's_sort', 's_top', 's_labels', 's_avg', 's_total'];
const S_LABEL = {
  dim: {'Category': 'category', 'Thematic Investment': 'thematic investment', 'Climate': 'climate tag', 'Equity': 'equity tag', 'Gender': 'gender tag',
    'Economic Purpose': 'economic purpose', 'Institution Type': 'institution type', 'Capital': 'capital type', 'Biodiversity Class': 'biodiversity class'},
  measure: {'Phase 1 Cost (Rs)': 'Phase 1 cost', 'Phase 1 Investment Required (Rs)': 'Phase 1 investment required', 'Phase 1 Govt (Rs)': 'Phase 1 government money',
    'Phase 1 Community (Rs)': 'Phase 1 community contribution', 'Total Cost (Rs)': 'Total cost, all phases', 'Total Investment Required (Rs)': 'Total investment required, all phases'},
  chart: {stack: 'stacked bars', dots: 'dot plot', heat: 'heatmap', treemap: 'treemap', bars: 'totals'}
};

function sAllLands() {
  const g = LD.data('lines');
  return g.status === 'ok' ? [...new Set((g.data || []).map((r) => r.Landscape))].sort(d3.ascending) : [];
}

/* Everything the Studio charts need, from the studio_pivot calculation. */
function sModel() {
  const g = LD.data('studio_pivot');
  const rows = g.data || [];
  const share = LD.p('s_mode') === 'share';
  const totalsByGroup = d3.rollup(rows, (v) => d3.sum(v, (r) => r.value), (r) => r.group);
  const groups = [...totalsByGroup.keys()].sort((a, b) => (a === 'Other') - (b === 'Other') || totalsByGroup.get(b) - totalsByGroup.get(a));
  const cell = new Map(rows.map((r) => [r.landscape + '\u0000' + r.group, r]));
  const landTotal = d3.rollup(rows, (v) => d3.sum(v, (r) => r.value), (r) => r.landscape);
  let lands = [...landTotal.keys()];
  const sort = LD.p('s_sort');
  const first = groups[0];
  const val = (land, grp) => { const c = cell.get(land + '\u0000' + grp); return c ? (share ? c.share : c.value) : null; };
  if (sort === 'name') lands.sort(d3.ascending);
  else if (sort === 'first') lands.sort((a, b) => (val(b, first) || 0) - (val(a, first) || 0));
  else lands.sort((a, b) => landTotal.get(b) - landTotal.get(a));
  const grand = d3.sum(rows, (r) => r.value);
  const avgOf = (grp) => d3.mean(lands, (l) => val(l, grp) || 0);
  const allOf = (grp) => (share ? (grand ? ((totalsByGroup.get(grp) || 0) / grand) * 100 : null) : totalsByGroup.get(grp) || 0);
  const fmt = share ? LD.fmtPct : (v) => (v == null ? '—' : LD.fmtCr(v) + ' ' + (LD.usd() ? 'US$ mn' : 'Rs cr'));
  const segFmt = share ? (v) => d3.format('.0f')(v) + '%' : (v) => LD.fmtCr(v);
  return {g, rows, share, groups, lands, val, avgOf, allOf, fmt, segFmt, totalsByGroup, grand};
}

function sGoToLines(group) {
  if (group === 'Other') return;
  const dim = LD.p('s_dim');
  const patch = {ix_land: '', ix_cat: '', ix_theme: '', ix_tagdim: '', ix_tagval: '', ix_q: ''};
  if (dim === 'Category') patch.ix_cat = group;
  else if (dim === 'Thematic Investment') patch.ix_theme = group;
  else { patch.ix_tagdim = dim; patch.ix_tagval = group; }
  rt.setParams(patch);
  tabs.open('interventions');
}

/* Landscape chips */
rt.draw('s-lands', (box) => {
  const all = sAllLands();
  if (!all.length) { box.replaceChildren(); return; }
  const cur = LD.p('s_lands');
  const on = new Set(Array.isArray(cur) ? cur : all);
  box.replaceChildren(...all.map((n) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ld-chip'; b.textContent = n;
    b.setAttribute('aria-pressed', on.has(n) ? 'true' : 'false');
    b.onclick = () => {
      const next = new Set(on);
      if (next.has(n)) next.delete(n); else next.add(n);
      rt.setParams({s_lands: next.size === all.length ? null : all.filter((x) => next.has(x))});
    };
    return b;
  }));
});
root.querySelectorAll('#s-all').forEach((b) => listen(b, 'click', () => rt.setParams({s_lands: null})));
root.querySelectorAll('#s-none').forEach((b) => listen(b, 'click', () => rt.setParams({s_lands: []})));
root.querySelectorAll('#s-reset').forEach((b) => listen(b, 'click', () => {
  const patch = {};
  S_KEYS.forEach((k) => { patch[k] = LD.DEF[k]; });
  rt.setParams(patch);
}));

/* Title, caption and legend */
rt.draw('s-title', (el) => {
  el.textContent = (S_LABEL.measure[LD.p('s_measure')] || 'Phase 1 cost') + ' by ' + (S_LABEL.dim[LD.p('s_dim')] || 'category');
});
rt.draw('s-caption', (el) => {
  const all = sAllLands();
  const cur = LD.p('s_lands');
  const n = Array.isArray(cur) ? cur.length : all.length;
  const how = LD.p('s_chart') !== 'treemap' && LD.p('s_mode') === 'share' ? 'as a share of each landscape\'s total' : 'in ' + LD.unitBig();
  el.textContent = `Shown ${how}, as ${S_LABEL.chart[LD.p('s_chart')] || 'a chart'}, for ${n} of ${all.length || 10} landscapes. Hover for exact values; click a group to see its lines.`;
});
rt.draw('s-legend', (ul) => {
  const m = sModel();
  if (m.g.status !== 'ok' || !m.rows.length) { ul.replaceChildren(); return; }
  const chart = LD.p('s_chart');
  const item = (bg, text, cls) => {
    const li = document.createElement('li'); const sw = document.createElement('i'); sw.className = 'ld-sw' + (cls ? ' ' + cls : '');
    if (bg) sw.style.background = bg;
    li.append(sw, document.createTextNode(text)); return li;
  };
  if (chart === 'stack' || chart === 'treemap') ul.replaceChildren(...m.groups.map((gname, i) => item(LD.color(i), LD.shortGroup(gname))));
  else if (chart === 'dots') ul.replaceChildren(item(LD.color(0), LD.p('landscape') + ' (pick on the profile tab)'), item('var(--cds-chart-muted)', 'Other landscapes'), ...(LD.p('s_avg') ? [item(null, 'Average landscape', 'ld-sw-line')] : []));
  else ul.replaceChildren();
});

/* The chart */
rt.draw('studio-chart', (el) => {
  const m = sModel();
  if (LD.pending(el, m.g, 'chart')) return;
  if (Array.isArray(LD.p('s_lands')) && !LD.p('s_lands').length) { LD.msg(el, 'Pick at least one landscape.', {hint: 'Tap a landscape in the panel, or choose All.'}); return; }
  if (!m.rows.length) { LD.msg(el, 'No lines have an amount for this measure.', {hint: 'Try another measure or more landscapes.'}); return; }
  const chart = LD.p('s_chart');
  const labels = !!LD.p('s_labels');
  if (chart === 'stack') {
    const cats = m.lands.map((n) => ({key: n, label: n}));
    if (LD.p('s_avg')) cats.push({key: '__avg', label: 'Average landscape', bold: true, gapBefore: true});
    if (LD.p('s_total')) cats.push({key: '__all', label: 'All picked together', bold: true, gapBefore: !LD.p('s_avg')});
    LD.stack(el, {
      cats, series: m.groups.map(LD.shortGroup), labels,
      val: (k, i) => (k === '__avg' ? m.avgOf(m.groups[i]) : k === '__all' ? m.allOf(m.groups[i]) : m.val(k, m.groups[i])),
      max: m.share ? 100 : null, fmt: m.fmt, segFmt: m.segFmt, onCat: LD.openProfile, hl: LD.p('landscape'),
      aria: 'Stacked bars of ' + LD.p('s_measure') + ' by ' + LD.p('s_dim') + ' for each picked landscape.'
    });
  } else if (chart === 'dots') {
    const rows = m.groups.map((gname) => ({key: gname, label: LD.shortGroup(gname)}));
    const points = [];
    m.groups.forEach((gname) => m.lands.forEach((l) => points.push({row: gname, name: l, value: m.val(l, gname)})));
    const avg = {}; if (LD.p('s_avg')) m.groups.forEach((gname) => { avg[gname] = m.avgOf(gname); });
    LD.dots(el, rows, points, {hl: LD.p('landscape'), avg, avgLabel: 'Average landscape', fmt: m.fmt,
      tick: m.share ? (v) => v + '%' : (v) => LD.fmtCr(v), max: m.share ? null : null,
      aria: 'Dot plot: each picked landscape\'s ' + LD.p('s_measure') + ' for each ' + LD.p('s_dim') + ' group.'});
  } else if (chart === 'heat') {
    const rowsK = m.lands.map((n) => ({key: n, label: n}));
    if (LD.p('s_avg')) rowsK.push({key: '__avg', label: 'Average landscape'});
    if (LD.p('s_total')) rowsK.push({key: '__all', label: 'All picked together'});
    LD.heat(el, rowsK, m.groups.map((gname) => ({key: gname, label: LD.shortGroup(gname)})),
      (r, c) => (r === '__avg' ? m.avgOf(c) : r === '__all' ? m.allOf(c) : m.val(r, c)),
      {fmt: m.fmt, cellFmt: m.segFmt, labels, max: m.share ? 100 : d3.max(m.lands.flatMap((l) => m.groups.map((gname) => m.val(l, gname) || 0))),
        onRow: LD.openProfile, aria: 'Heatmap of ' + LD.p('s_measure') + ' by landscape and ' + LD.p('s_dim') + '.'});
  } else if (chart === 'treemap') {
    const groups = m.groups.map((gname) => ({name: gname, children: m.lands.map((l) => {
      const c = m.rows.find((r) => r.landscape === l && r.group === gname);
      return {name: l, value: c ? c.value : 0};
    }).filter((d) => d.value > 0)}));
    LD.treemap(el, groups, {fmt: (v) => LD.fmtCr(v) + ' ' + (LD.usd() ? 'US$ mn' : 'Rs cr'), labels,
      aria: 'Treemap of ' + LD.p('s_measure') + ' by ' + LD.p('s_dim') + ', each group split by landscape.'});
  } else {
    const items = m.groups.map((gname) => ({name: LD.shortGroup(gname), key: gname, value: m.allOf(gname)}));
    LD.bars(el, items, {fmt: m.fmt, sort: false, onClick: (d) => sGoToLines(d.key), hint: 'Click to see its lines',
      aria: 'Bar chart of ' + LD.p('s_measure') + ' by ' + LD.p('s_dim') + ' across the picked landscapes.'});
  }
  // Clicking a stacked segment's group name is not possible in SVG legends, so legend items open the lines.
});

/* The numbers behind the view */
rt.draw('studio-table', (tb) => {
  const m = sModel();
  if (m.g.status !== 'ok') { tb.replaceChildren(); return; }
  const order = new Map(m.lands.map((l, i) => [l, i]));
  const gorder = new Map(m.groups.map((gname, i) => [gname, i]));
  const rows = [...m.rows].sort((a, b) => (order.get(a.landscape) - order.get(b.landscape)) || (gorder.get(a.group) - gorder.get(b.group)));
  tb.replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    tr.dataset.key = encodeURIComponent(r.landscape) + ',' + encodeURIComponent(r.group);
    [r.landscape, LD.shortGroup(r.group), LD.fmtMoney(r.value), LD.fmtPct(r.share)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
    return tr;
  }));
});

/* Saved views */
function sWarn(ok) { root.querySelectorAll('#view-unsaved').forEach((p) => { p.hidden = ok; }); }
root.querySelectorAll('#view-save').forEach((b) => listen(b, 'click', async () => {
  const input = root.querySelector('#view-name');
  const cfg = {};
  S_KEYS.forEach((k) => { cfg[k] = LD.p(k); });
  const name = (input && input.value.trim()) || (S_LABEL.measure[cfg.s_measure] + ' by ' + S_LABEL.dim[cfg.s_dim]);
  let ok = true;
  try {
    await api.put('view', 'v' + Date.now(), {name, config: JSON.stringify(cfg), at: new Date().toISOString()});
    if (input) input.value = '';
    await api.refresh();
  } catch { ok = false; }
  sWarn(ok);
}));
rt.draw('views-list', (ul) => {
  const g = LD.data('views');
  if (g.status !== 'ok') { ul.replaceChildren(); return; }
  const rows = [...(g.data || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (!rows.length) {
    const li = document.createElement('li'); li.className = 'ld-views-empty';
    li.append(LD.emptyArt('No saved views yet.', {hint: 'Set up a view, give it a name and press Save view.', compact: true}));
    ul.replaceChildren(li); return;
  }
  ul.replaceChildren(...rows.map((r) => {
    const li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = r.name || 'Untitled view';
    const s = document.createElement('span');
    const d = new Date(r.at); s.textContent = isNaN(d) ? '' : d3.timeFormat('%-d %b %Y, %H:%M')(d);
    const load = document.createElement('button'); load.type = 'button'; load.className = 'ld-btn'; load.textContent = 'Load';
    load.onclick = () => {
      let cfg = {};
      try { cfg = JSON.parse(r.config); } catch { cfg = {}; }
      const patch = {};
      S_KEYS.forEach((k) => { if (k in cfg) patch[k] = cfg[k]; });
      rt.setParams(patch);
    };
    const del = document.createElement('button'); del.type = 'button'; del.className = 'ld-link'; del.textContent = 'Delete';
    del.onclick = async () => {
      let ok = true;
      try { await api.del('view', r.id); await api.refresh(); } catch { ok = false; }
      sWarn(ok);
    };
    li.append(b, s, load, del);
    return li;
  }));
});

  tabsRef.current = tabs;
}
