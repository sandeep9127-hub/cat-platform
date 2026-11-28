/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck -- a line-for-line port of the dashboard's core.js chart helpers; kept close to the original so behaviour and numbers match.
import * as d3 from "d3";
import type { Runtime } from "./runtime";

export const ASSET = "/dashboards/lp1/";

export function createLD(rt: Runtime, tabsRef: { current: { open: (id: string, focus?: boolean) => void } | null }) {
  const ALL = 'All Landscapes';
  const AVG = 'Average (nil left out)';
  const DEF = {
    landscape: 'Ahwa', lens: 'INSTITUTION TYPE', tag: '', heat: 'share',
    ix_land: '', ix_cat: '', ix_theme: '', ix_tagdim: '', ix_tagval: '', ix_q: '', ix_sort: 'Phase 1 Cost (Rs)', ix_dir: 'desc',
    s_dim: 'Category', s_measure: 'Phase 1 Cost (Rs)', s_mode: 'share', s_chart: 'stack', s_lands: null,
    s_sort: 'total', s_top: 8, s_labels: true, s_avg: true, s_total: true,
    cur: 'inr', cmp_a: 'Ahwa', cmp_b: 'Khasi', cmp_lens: 'ALL', cmp_mode: 'share'
  };
  const p = (k) => { const v = rt.params()[k]; return v === undefined ? DEF[k] : v; };
  // Fixed exchange rate chosen for this dashboard: Rs 90 = US$ 1.
  const USD_RATE = 90;
  const usd = () => p('cur') === 'usd';
  const fmtPct = (v) => v == null ? '—' : d3.format('.1f')(v) + '%';
  // A big amount: "Rs 270.1 crore" or "US$ 30.0 million".
  const fmtCrore = (v) => v == null ? '—' : usd() ? 'US$ ' + d3.format('.1f')(v / USD_RATE / 1e6) + ' million' : 'Rs ' + d3.format('.1f')(v / 1e7) + ' crore';
  // A big amount as a bare number in the unit named by unitBig(): crore or US$ million.
  const fmtCr = (v) => {
    if (v == null) return '—';
    const n = usd() ? v / USD_RATE / 1e6 : v / 1e7;
    return d3.format(Math.abs(n) < 10 ? '.2f' : '.1f')(n);
  };
  // An exact amount with its currency: "Rs 35,986" or "US$ 400".
  const fmtRs = (v) => v == null ? '—' : usd() ? 'US$ ' + Math.round(v / USD_RATE).toLocaleString('en-US') : 'Rs ' + Math.round(v).toLocaleString('en-IN');
  // An exact amount as a bare number in the unit named by unitSmall().
  const fmtMoney = (v) => v == null ? '—' : usd() ? Math.round(v / USD_RATE).toLocaleString('en-US') : Math.round(v).toLocaleString('en-IN');
  const unitBig = () => (usd() ? 'US$ million' : 'Rs crore');
  const unitSmall = () => (usd() ? 'US$' : 'Rs');
  const fmtIN = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
  const shortName = (m) => m.replace(/^(Exclusively|Largely) invested in (the )?/i, '').replace(/^Invested in /i, '').replace(/^./, (c) => c.toUpperCase());
  const shortGroup = (g) => String(g).replace(/^Thematic Investment (\d+):\s*/, 'TI$1 ');
  const color = (i) => rt.colors[i % rt.colors.length];
  const data = (id) => rt.data(id);
  const row = (g, sn) => (g.data || []).find((r) => r.sn === sn);
  const landscapes = (g) => {
    const c = g.columns || [];
    const i = c.indexOf('metric'), j = c.indexOf(ALL);
    return i >= 0 && j > i ? c.slice(i + 1, j) : [];
  };
  /* Empty and error states carry one of CAT's watercolour leaf clusters. */
  const LEAVES = [ASSET + 'leaf-left.webp', ASSET + 'leaf-right.webp'];
  const emptyArt = (text, opts = {}) => {
    const d = document.createElement('div');
    d.className = 'ld-empty ld-msg' + (opts.error ? ' ld-empty-error' : '') + (opts.compact ? ' ld-empty-compact' : '');
    const img = document.createElement('img');
    img.src = LEAVES[String(text).length % 2]; img.alt = ''; img.setAttribute('aria-hidden', 'true');
    const p = document.createElement('p'); p.className = 'ld-empty-title'; p.textContent = text;
    d.append(img, p);
    if (opts.hint) { const h = document.createElement('p'); h.className = 'ld-empty-hint'; h.textContent = opts.hint; d.append(h); }
    return d;
  };
  const msg = (el, text, opts) => { el.replaceChildren(emptyArt(text, opts)); };
  // Returns true when the drawing should stop because data isn't ready.
  const pending = (el, g, kind) => {
    if (g.status === 'ok') { el.classList.remove('dash-skeleton'); return false; }
    if (g.status === 'loading') { el.classList.add('dash-skeleton'); return true; }
    el.classList.remove('dash-skeleton');
    if (kind === 'chart') {
      if (g.status === 'error') msg(el, "This part couldn't load.", {error: true, hint: g.message || 'Reload the page to try again.'});
      else msg(el, 'This part is still loading.', {hint: 'Reload the page if it doesn\'t appear.'});
    }
    else if (kind === 'list') el.replaceChildren();
    else el.textContent = '—';
    return true;
  };
  const tip = (el) => {
    const t = document.createElement('div');
    t.className = 'ld-tip'; t.hidden = true; el.appendChild(t);
    return {
      show(ev, title, body, hint) {
        t.replaceChildren();
        const b = document.createElement('b'); b.textContent = title;
        const s = document.createElement('span'); s.textContent = body ? ' · ' + body : '';
        t.append(b, s);
        if (hint) { const h = document.createElement('div'); h.className = 'ld-tip-hint'; h.textContent = hint; t.append(h); }
        t.hidden = false;
        const box = el.getBoundingClientRect();
        let x = ev.clientX - box.left + 12;
        const y = ev.clientY - box.top + 14;
        if (x + t.offsetWidth > box.width) x = Math.max(0, ev.clientX - box.left - t.offsetWidth - 12);
        t.style.left = x + 'px'; t.style.top = y + 'px';
      },
      hide() { t.hidden = true; }
    };
  };
  const measure = (svg, texts, cls) => {
    let m = 0;
    texts.forEach((s) => {
      const n = svg.append('text').attr('class', cls || null).text(s);
      m = Math.max(m, n.node().getComputedTextLength()); n.remove();
    });
    return Math.ceil(m);
  };
  const reduced = () => !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const grow = (sel, attr, to) => {
    if (reduced()) { sel.attr(attr, to); return; }
    sel.attr(attr, 0).transition().duration(450).ease(d3.easeCubicOut).attr(attr, to);
  };
  const openProfile = (name) => {
    if (!name || name === ALL || String(name).startsWith('__')) return;
    rt.setParams({landscape: name});
    if (tabsRef.current) tabsRef.current.open('profile');
  };

  /* Horizontal stacked bars.
     cfg: {cats:[{key,label,bold,gapBefore}], series:[label], val(catKey, i), max, fmt, segFmt, aria, labels, onCat, hl} */
  function stack(el, cfg) {
    const W = Math.max(el.clientWidth, 240);
    const barH = 22, gap = 8, sep = 12;
    const extra = cfg.cats.filter((c) => c.gapBefore).length * sep;
    const H = cfg.cats.length * (barH + gap) + extra;
    el.replaceChildren();
    const svg = d3.select(el).append('svg').attr('height', H).attr('role', 'img').attr('aria-label', cfg.aria);
    const lw = measure(svg, cfg.cats.map((c) => c.label), 'ld-cat-all') + 10;
    const totals = cfg.cats.map((c) => d3.sum(cfg.series, (_, i) => cfg.val(c.key, i) || 0));
    const max = cfg.max || d3.max(totals) || 1;
    const x = d3.scaleLinear().domain([0, max]).range([lw, W - 2]);
    const t = tip(el);
    let y = 0;
    cfg.cats.forEach((c) => {
      if (c.gapBefore) y += sep;
      const g = svg.append('g');
      g.append('text').attr('x', lw - 8).attr('y', y + barH / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('class', (c.bold ? 'ld-cat-all ' : '') + (cfg.onCat && !c.bold ? 'ld-click' : '') + (cfg.hl === c.key ? ' ld-cat-hl' : ''))
        .text(c.label).on('click', () => cfg.onCat && cfg.onCat(c.key));
      let acc = 0;
      cfg.series.forEach((s, si) => {
        const v = cfg.val(c.key, si) || 0;
        const x0 = x(Math.min(acc, max)), x1 = x(Math.min(acc + v, max));
        acc += v;
        if (x1 - x0 <= 0) return;
        const rect = g.append('rect').attr('x', x0).attr('y', y).attr('height', barH)
          .style('fill', color(cfg.colorIdx ? cfg.colorIdx[si] : si)).style('cursor', cfg.onCat && !c.bold ? 'pointer' : null)
          .on('pointermove', (ev) => t.show(ev, c.label, s + ': ' + cfg.fmt(cfg.val(c.key, si)), cfg.onCat && !c.bold ? 'Click to open its profile' : ''))
          .on('pointerleave', () => t.hide())
          .on('click', () => cfg.onCat && !c.bold && cfg.onCat(c.key));
        grow(rect, 'width', Math.max(0, x1 - x0 - 1));
        if (cfg.labels !== false && x1 - x0 > 40) g.append('text').attr('class', 'ld-seg-label').attr('x', (x0 + x1) / 2).attr('y', y + barH / 2)
          .attr('dy', '0.35em').attr('text-anchor', 'middle').text((cfg.segFmt || cfg.fmt)(v));
      });
      y += barH + gap;
    });
  }

  /* Sorted horizontal bars. items: [{name, value, key}]. cfg: {fmt, aria, onClick, hl, ref, refLabel, signed, sort} */
  function bars(el, items, cfg) {
    items = items.filter((d) => d.value != null);
    if (cfg.sort !== false) items.sort((a, b) => b.value - a.value);
    if (!items.length) { msg(el, 'Nothing to show here yet.', {hint: 'No landscape has a value for this.'}); return; }
    const W = Math.max(el.clientWidth, 240);
    const barH = 20, gap = 8;
    const H = items.length * (barH + gap) + (cfg.ref != null ? 18 : 0);
    const top = cfg.ref != null ? 18 : 0;
    el.replaceChildren();
    const svg = d3.select(el).append('svg').attr('height', H).attr('role', 'img').attr('aria-label', cfg.aria);
    const lw = measure(svg, items.map((d) => d.name)) + 10;
    const vw = measure(svg, items.map((d) => cfg.fmt(d.value)), 'ld-val') + 10;
    const lo = cfg.signed ? Math.min(0, d3.min(items, (d) => d.value)) : 0;
    const hi = Math.max(cfg.signed ? 0 : 0, d3.max(items, (d) => d.value), cfg.ref || 0) || 1;
    const x = d3.scaleLinear().domain([lo, hi]).range([lw + (cfg.signed ? vw : 0), W - vw]);
    const t = tip(el);
    if (cfg.signed) svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', top).attr('y2', H).style('stroke', 'var(--cds-chart-axis)');
    items.forEach((d, i) => {
      const y = top + i * (barH + gap);
      const on = cfg.hl && cfg.hl === (d.key ?? d.name);
      svg.append('text').attr('x', lw - 8).attr('y', y + barH / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('class', (cfg.onClick ? 'ld-click' : '') + (on ? ' ld-cat-hl' : '')).text(d.name)
        .on('click', () => cfg.onClick && cfg.onClick(d));
      const x0 = x(Math.min(0, d.value)), x1 = x(Math.max(0, d.value));
      const r = svg.append('rect').attr('x', x0).attr('y', y).attr('height', barH).attr('rx', 2)
        .style('fill', cfg.signed ? (d.value >= 0 ? (cfg.posColor || color(0)) : (cfg.negColor || color(4))) : (cfg.hl && !on ? 'var(--cds-chart-muted)' : color(0)))
        .style('cursor', cfg.onClick ? 'pointer' : null)
        .on('pointermove', (ev) => t.show(ev, d.name, cfg.fmt(d.value), cfg.onClick ? cfg.hint || 'Click to open its profile' : ''))
        .on('pointerleave', () => t.hide())
        .on('click', () => cfg.onClick && cfg.onClick(d));
      grow(r, 'width', Math.max(1, x1 - x0));
      const lx = d.value >= 0 ? x1 + 6 : x0 - 6;
      svg.append('text').attr('class', 'ld-val').attr('x', lx).attr('y', y + barH / 2).attr('dy', '0.35em')
        .attr('text-anchor', d.value >= 0 ? 'start' : 'end').text(cfg.fmt(d.value));
    });
    if (cfg.ref != null) {
      svg.append('line').attr('x1', x(cfg.ref)).attr('x2', x(cfg.ref)).attr('y1', top - 4).attr('y2', H)
        .style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '4 3');
      svg.append('text').attr('x', x(cfg.ref)).attr('y', 10).attr('text-anchor', 'middle').text(cfg.refLabel || '');
    }
  }

  /* Dot plot. rows: [{key,label,head}], points: [{row, name, value}], cfg: {hl, avg:{row:value}, fmt, aria, max} */
  function dots(el, rows, points, cfg) {
    const W = Math.max(el.clientWidth, 260);
    const rh = 24, hh = 26;
    const H = d3.sum(rows, (r) => (r.head ? hh : rh)) + 22;
    el.replaceChildren();
    const svg = d3.select(el).append('svg').attr('height', H).attr('role', 'img').attr('aria-label', cfg.aria);
    const lw = Math.min(measure(svg, rows.filter((r) => !r.head).map((r) => r.label)) + 12, W * 0.45);
    const max = cfg.max || d3.max(points, (d) => d.value) || 1;
    const x = d3.scaleLinear().domain([0, max]).nice().range([lw, W - 12]);
    const ax = svg.append('g').attr('class', 'ld-axis').attr('transform', `translate(0,${H - 18})`)
      .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor((W - lw) / 80))).tickFormat(cfg.tick || ((v) => v)));
    ax.select('.domain').remove();
    const t = tip(el);
    let y = 0;
    rows.forEach((r) => {
      if (r.head) {
        svg.append('text').attr('x', 0).attr('y', y + hh - 8).attr('class', 'ld-dot-head').text(r.label);
        y += hh; return;
      }
      const cy = y + rh / 2;
      svg.append('line').attr('x1', lw).attr('x2', W - 12).attr('y1', cy).attr('y2', cy).style('stroke', 'var(--cds-chart-grid)');
      const lab = svg.append('text').attr('x', lw - 8).attr('y', cy).attr('dy', '0.35em').attr('text-anchor', 'end').text(r.label);
      if (lab.node().getComputedTextLength() > lw - 10) {
        let s = r.label; while (s.length > 4 && lab.node().getComputedTextLength() > lw - 10) { s = s.slice(0, -2); lab.text(s + '…'); }
      }
      if (cfg.avg && cfg.avg[r.key] != null) {
        svg.append('line').attr('x1', x(cfg.avg[r.key])).attr('x2', x(cfg.avg[r.key])).attr('y1', cy - 8).attr('y2', cy + 8)
          .style('stroke', 'var(--color-fg)').style('stroke-width', 2)
          .on('pointermove', (ev) => t.show(ev, r.label, (cfg.avgLabel || 'Average') + ': ' + cfg.fmt(cfg.avg[r.key])))
          .on('pointerleave', () => t.hide());
      }
      points.filter((d) => d.row === r.key && d.value != null).sort((a, b) => (a.name === cfg.hl) - (b.name === cfg.hl)).forEach((d) => {
        const on = d.name === cfg.hl;
        svg.append('circle').attr('cx', x(d.value)).attr('cy', cy).attr('r', on ? 6 : 4)
          .style('fill', on ? color(0) : 'var(--cds-chart-muted)').style('opacity', on ? 1 : 0.75)
          .style('stroke', on ? 'var(--color-bg)' : 'none').style('stroke-width', 1.5)
          .on('pointermove', (ev) => t.show(ev, d.name, r.label + ': ' + cfg.fmt(d.value)))
          .on('pointerleave', () => t.hide());
      });
      y += rh;
    });
  }

  /* Heatmap. rowsK: [{key,label}], cols: [{key,label}], val(r,c), cfg: {fmt, aria, max} */
  function heat(el, rowsK, cols, val, cfg) {
    const minW = 0;
    el.replaceChildren();
    const probe = d3.select(el).append('svg').attr('height', 1);
    const lw = measure(probe, rowsK.map((r) => r.label)) + 10;
    probe.remove();
    const cw = Math.max(54, Math.floor((Math.max(el.clientWidth, 260) - lw) / Math.max(cols.length, 1)));
    const W = Math.max(minW, lw + cw * cols.length);
    const rh = 28, th = 64;
    const H = th + rowsK.length * rh;
    const wrap = document.createElement('div'); wrap.className = 'ld-hscroll'; el.appendChild(wrap);
    const svg = d3.select(wrap).append('svg').attr('width', W).attr('height', H).style('width', W + 'px').attr('role', 'img').attr('aria-label', cfg.aria);
    const max = cfg.max || d3.max(rowsK.flatMap((r) => cols.map((c) => val(r.key, c.key) || 0))) || 1;
    const t = tip(el);
    cols.forEach((c, ci) => {
      const tx = svg.append('text').attr('transform', `translate(${lw + ci * cw + cw / 2},${th - 6}) rotate(-30)`).attr('text-anchor', 'start').text(c.label);
      let s = c.label; while (s.length > 6 && tx.node().getComputedTextLength() > 90) { s = s.slice(0, -2); tx.text(s + '…'); }
    });
    rowsK.forEach((r, ri) => {
      const y = th + ri * rh;
      svg.append('text').attr('x', lw - 8).attr('y', y + rh / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('class', cfg.onRow ? 'ld-click' : null).text(r.label).on('click', () => cfg.onRow && cfg.onRow(r.key));
      cols.forEach((c, ci) => {
        const v = val(r.key, c.key);
        const k = v ? Math.min(1, v / max) : 0;
        svg.append('rect').attr('x', lw + ci * cw + 1).attr('y', y + 1).attr('width', cw - 2).attr('height', rh - 2).attr('rx', 3)
          .style('fill', v ? `color-mix(in srgb, ${color(0)} ${Math.round(12 + k * 78)}%, transparent)` : 'var(--color-panel)')
          .style('stroke', 'var(--color-border-line)')
          .on('pointermove', (ev) => t.show(ev, r.label, c.label + ': ' + cfg.fmt(v)))
          .on('pointerleave', () => t.hide());
        if (cfg.labels !== false && v) svg.append('text').attr('x', lw + ci * cw + cw / 2).attr('y', y + rh / 2).attr('dy', '0.35em')
          .attr('text-anchor', 'middle').attr('class', k > 0.55 ? 'ld-heat-dark' : 'ld-val').text(cfg.cellFmt ? cfg.cellFmt(v) : cfg.fmt(v));
      });
    });
  }

  /* Treemap of groups, each split by landscape. groups: [{name, children:[{name, value}]}] */
  function treemap(el, groups, cfg) {
    const W = Math.max(el.clientWidth, 260);
    const H = Math.max(320, Math.min(560, W * 0.6));
    el.replaceChildren();
    const root = d3.hierarchy({children: groups}).sum((d) => d.value || 0).sort((a, b) => b.value - a.value);
    d3.treemap().size([W, H]).paddingTop(18).paddingInner(2).paddingOuter(2).round(true)(root);
    const svg = d3.select(el).append('svg').attr('height', H).attr('role', 'img').attr('aria-label', cfg.aria);
    const t = tip(el);
    const total = root.value || 1;
    root.children && root.children.forEach((g, gi) => {
      svg.append('rect').attr('x', g.x0).attr('y', g.y0).attr('width', g.x1 - g.x0).attr('height', g.y1 - g.y0)
        .style('fill', `color-mix(in srgb, ${color(gi)} 18%, transparent)`).style('stroke', color(gi));
      if (g.x1 - g.x0 > 50) {
        const tx = svg.append('text').attr('x', g.x0 + 4).attr('y', g.y0 + 13).attr('class', 'ld-tm-head')
          .text(shortGroup(g.data.name) + ' · ' + d3.format('.0f')((g.value / total) * 100) + '%');
        let s = tx.text(); while (s.length > 4 && tx.node().getComputedTextLength() > g.x1 - g.x0 - 8) { s = s.slice(0, -2); tx.text(s + '…'); }
      }
      (g.children || []).forEach((l) => {
        svg.append('rect').attr('x', l.x0).attr('y', l.y0).attr('width', Math.max(0, l.x1 - l.x0)).attr('height', Math.max(0, l.y1 - l.y0))
          .style('fill', color(gi)).style('opacity', 0.85)
          .on('pointermove', (ev) => t.show(ev, l.data.name, shortGroup(g.data.name) + ': ' + cfg.fmt(l.value)))
          .on('pointerleave', () => t.hide());
        if (cfg.labels !== false && l.x1 - l.x0 > 56 && l.y1 - l.y0 > 16) {
          const tx = svg.append('text').attr('x', l.x0 + 4).attr('y', l.y0 + 12).attr('class', 'ld-seg-label').text(l.data.name);
          let s = l.data.name; while (s.length > 3 && tx.node().getComputedTextLength() > l.x1 - l.x0 - 8) { s = s.slice(0, -2); tx.text(s + '…'); }
        }
      });
    });
  }

  /* Back-to-back bars: landscape A grows left, landscape B grows right.
     rows: [{key,label,head}], a(key), b(key), cfg: {fmt, max, nameA, nameB, aria} */
  function butterfly(el, rows, a, b, cfg) {
    const W = Math.max(el.clientWidth, 300);
    const rh = 24, hh = 26, top = 24;
    const H = top + d3.sum(rows, (r) => (r.head ? hh : rh));
    el.replaceChildren();
    const svg = d3.select(el).append('svg').attr('height', H).attr('role', 'img').attr('aria-label', cfg.aria);
    const data = rows.filter((r) => !r.head);
    const lw = Math.min(measure(svg, data.map((r) => r.label)) + 12, W * 0.36);
    const max = cfg.max || d3.max(data.flatMap((r) => [a(r.key) || 0, b(r.key) || 0])) || 1;
    const vw = measure(svg, [cfg.fmt(max)], 'ld-val') + 8;
    const mid = lw + (W - lw) / 2;
    const s = d3.scaleLinear().domain([0, max]).range([0, Math.max(20, (W - lw) / 2 - vw - 6)]);
    const t = tip(el);
    svg.append('text').attr('x', mid - 6).attr('y', 12).attr('text-anchor', 'end').attr('class', 'ld-bf-name').style('fill', color(0)).text('◀ ' + cfg.nameA);
    svg.append('text').attr('x', mid + 6).attr('y', 12).attr('text-anchor', 'start').attr('class', 'ld-bf-name').style('fill', color(1)).text(cfg.nameB + ' ▶');
    let y = top;
    rows.forEach((r) => {
      if (r.head) { svg.append('text').attr('x', 0).attr('y', y + hh - 8).attr('class', 'ld-dot-head').text(r.label); y += hh; return; }
      const cy = y + rh / 2;
      const lab = svg.append('text').attr('x', lw - 8).attr('y', cy).attr('dy', '0.35em').attr('text-anchor', 'end').text(r.label);
      let lt = r.label; while (lt.length > 4 && lab.node().getComputedTextLength() > lw - 10) { lt = lt.slice(0, -2); lab.text(lt + '…'); }
      const va = a(r.key), vb = b(r.key);
      const show = (ev) => t.show(ev, r.label, cfg.nameA + ' ' + cfg.fmt(va) + '  ·  ' + cfg.nameB + ' ' + cfg.fmt(vb));
      const ra = svg.append('rect').attr('y', y + 3).attr('height', rh - 6).attr('rx', 2).style('fill', color(0))
        .attr('x', mid - 2 - s(va || 0)).on('pointermove', show).on('pointerleave', () => t.hide());
      grow(ra, 'width', Math.max(va ? 1 : 0, s(va || 0)));
      const rb = svg.append('rect').attr('x', mid + 2).attr('y', y + 3).attr('height', rh - 6).attr('rx', 2).style('fill', color(1))
        .on('pointermove', show).on('pointerleave', () => t.hide());
      grow(rb, 'width', Math.max(vb ? 1 : 0, s(vb || 0)));
      svg.append('text').attr('class', 'ld-val').attr('x', mid - 6 - s(va || 0)).attr('y', cy).attr('dy', '0.35em').attr('text-anchor', 'end').text(cfg.fmt(va));
      svg.append('text').attr('class', 'ld-val').attr('x', mid + 6 + s(vb || 0)).attr('y', cy).attr('dy', '0.35em').text(cfg.fmt(vb));
      y += rh;
    });
    svg.append('line').attr('x1', mid).attr('x2', mid).attr('y1', top - 4).attr('y2', H).style('stroke', 'var(--cds-chart-axis)');
  }

  return {ALL, AVG, DEF, USD_RATE, usd, p, fmtPct, fmtCrore, fmtCr, fmtRs, fmtMoney, unitBig, unitSmall, fmtIN, shortName, shortGroup, color, data, row, landscapes,
    msg, emptyArt, pending, tip, stack, bars, dots, heat, treemap, butterfly, openProfile};
}
