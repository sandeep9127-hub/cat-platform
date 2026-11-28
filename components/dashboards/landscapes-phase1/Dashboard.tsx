"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Markup } from "./Markup";
import { createRuntime, type Dataset } from "./runtime";
import { ASSET, createLD } from "./ld";
import { mountViews, type DocsApi } from "./views";
import "./dashboard.css";

type Props = {
  landscapes: { columns: string[]; rows: Record<string, unknown>[] };
  lines: { columns: string[]; rows: Record<string, unknown>[] };
  cats: { Landscape: string; Category: string; phase1: number }[];
  /** Private notes and saved views (each editor, or each share link, keeps its own). */
  canNotes: boolean;
  shareBar?: ReactNode;
};

const DOCS = "/dashboards/landscapes-phase-1/docs";

/** Defaults, as in the original dashboard. */
const DEFAULTS = {
  landscape: "Ahwa", lens: "INSTITUTION TYPE", tag: "", heat: "share",
  ix_land: "", ix_cat: "", ix_theme: "", ix_tagdim: "", ix_tagval: "", ix_q: "", ix_sort: "Phase 1 Cost (Rs)", ix_dir: "desc",
  s_dim: "Category", s_measure: "Phase 1 Cost (Rs)", s_mode: "share", s_chart: "stack", s_lands: null,
  s_sort: "total", s_top: 8, s_labels: true, s_avg: true, s_total: true,
  cur: "inr", cmp_a: "Ahwa", cmp_b: "Khasi", cmp_lens: "ALL", cmp_mode: "share",
};

export function LandscapesPhase1Dashboard({ landscapes, lines, cats, canNotes, shareBar }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ctrl = new AbortController();
    const tabsRef: { current: { open: (id: string, focus?: boolean) => void } | null } = { current: null };
    const rt = createRuntime(root, {
      params: DEFAULTS,
      datasets: {
        landscapes: { status: "ok", data: landscapes.rows, columns: landscapes.columns },
        lines: { status: "ok", data: lines.rows, columns: lines.columns },
        cats: { status: "ok", data: cats },
        notes: { status: canNotes ? "loading" : "missing", data: [] },
        views: { status: canNotes ? "loading" : "missing", data: [] },
      },
      onLink: (id) => {
        try {
          history.replaceState(history.state, "", "#" + id);
        } catch {
          /* ignore */
        }
      },
    });

    const loadDocs = async () => {
      if (!canNotes) return;
      try {
        const res = await fetch(DOCS, { cache: "no-store", signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const { docs } = (await res.json()) as { docs: { kind: string; key: string; data: Record<string, unknown>; updated_at: string }[] };
        const notes: Dataset = { status: "ok", data: docs.filter((d) => d.kind === "note").map((d) => ({ id: d.key, note: d.data.note })) };
        const views: Dataset = {
          status: "ok",
          data: docs.filter((d) => d.kind === "view").map((d) => ({ id: d.key, name: d.data.name, config: d.data.config, at: d.data.at })),
        };
        rt.setDataset("notes", notes);
        rt.setDataset("views", views);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        rt.setDataset("notes", { status: "error", data: [], message: "Your notes couldn't load." });
        rt.setDataset("views", { status: "error", data: [], message: "Your saved views couldn't load." });
      }
    };
    const api: DocsApi = {
      async put(kind, key, data) {
        const res = await fetch(DOCS, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, key, data }) });
        if (!res.ok) throw new Error(String(res.status));
      },
      async del(kind, key) {
        const res = await fetch(`${DOCS}?kind=${encodeURIComponent(kind)}&key=${encodeURIComponent(key)}`, { method: "DELETE" });
        if (!res.ok) throw new Error(String(res.status));
      },
      refresh: loadDocs,
    };

    const LD = createLD(rt, tabsRef);
    mountViews(rt, LD, root, tabsRef, api, ctrl.signal);

    // A missing illustration falls back to a CAT brand drawing.
    root.querySelectorAll<HTMLImageElement>("img.ld-theme-ill, img.ld-feature-ill, img.ld-notes-art").forEach((img) => {
      img.addEventListener("error", () => {
        if (!img.src.endsWith("fallback-ill.webp")) img.src = ASSET + "fallback-ill.webp";
      }, { signal: ctrl.signal });
    });

    // Charts follow the container's width.
    let lastW = root.clientWidth;
    const ro = new ResizeObserver(() => {
      if (Math.abs(root.clientWidth - lastW) > 2) {
        lastW = root.clientWidth;
        rt.schedule();
      }
    });
    ro.observe(root);

    rt.render();
    void loadDocs();
    return () => {
      ctrl.abort();
      ro.disconnect();
      rt.dispose();
    };
  }, [landscapes, lines, cats, canNotes]);

  return (
    <div className="ld-page" ref={ref}>
      <Markup canNotes={canNotes} shareBar={shareBar} />
    </div>
  );
}
