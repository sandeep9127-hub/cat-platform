/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A small stand-in for the Claude Data "dash" runtime the dashboard was first
 * written for: datasets, calculations that re-run when filters change, named
 * drawings bound to [data-draw] elements, and filters ("params"). Everything is
 * scoped to one root element so the page can mount and unmount cleanly.
 */
export type Status = "ok" | "loading" | "error" | "missing";
export type Dataset = { status: Status; data: any; columns?: string[]; message?: string };

type Calc = { inputs: string[]; fn: (...inputs: any[]) => any };

export type Runtime = ReturnType<typeof createRuntime>;

export const LIGHT_SERIES = ["#2E7573", "#C4673F", "#5E6990", "#B07D2B", "#A0656C", "#5F8F8C", "#7A85B8", "#334B4A"];
export const DARK_SERIES = ["#6FB3AE", "#F8A07B", "#929CC5", "#F8CA7C", "#C68F95", "#B8CCCA", "#C0CCE9", "#E1EDE8"];

export function createRuntime(root: HTMLElement, opts: { params: Record<string, any>; datasets: Record<string, Dataset>; onLink?: (id: string) => void }) {
  const params: Record<string, any> = { ...opts.params };
  const datasets: Record<string, Dataset> = { ...opts.datasets };
  const calcs = new Map<string, Calc>();
  const draws = new Map<string, (el: any) => void>();
  const onDataFns: (() => void)[] = [];
  const cache = new Map<string, Dataset>();
  const dark = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  let frame = 0;
  let disposed = false;

  const rt = {
    get colors(): string[] {
      return dark && dark.matches ? DARK_SERIES : LIGHT_SERIES;
    },
    params: () => ({ ...params }),
    setParams(patch: Record<string, any>) {
      Object.assign(params, patch);
      rt.schedule();
    },
    resetParams(defaults: Record<string, any>) {
      Object.keys(params).forEach((k) => delete params[k]);
      Object.assign(params, defaults);
      rt.schedule();
    },
    setDataset(id: string, ds: Dataset) {
      datasets[id] = ds;
      rt.schedule();
    },
    data(id: string): Dataset {
      if (datasets[id]) return datasets[id];
      const c = calcs.get(id);
      if (!c) return { status: "missing", data: [] };
      const hit = cache.get(id);
      if (hit) return hit;
      const ins = c.inputs.map((i) => rt.data(i));
      const bad = ins.find((d) => d.status !== "ok");
      let out: Dataset;
      if (bad) out = { status: bad.status, data: null, message: bad.message };
      else {
        try {
          out = { status: "ok", data: c.fn(...ins.map((d) => d.data)) };
        } catch (e) {
          console.error(`[dashboard] calculation ${id} failed`, e);
          out = { status: "error", data: null, message: (e as Error).message };
        }
      }
      cache.set(id, out);
      return out;
    },
    calc(id: string, c: Calc) {
      calcs.set(id, c);
    },
    draw(name: string, fn: (el: any) => void) {
      draws.set(name, fn);
    },
    onData(fn: () => void) {
      onDataFns.push(fn);
    },
    setLink(id: string) {
      opts.onLink?.(id);
    },
    render() {
      if (disposed) return;
      cache.clear();
      const cs = rt.colors;
      cs.forEach((c, i) => root.style.setProperty("--ld-c" + i, c));
      for (const [name, fn] of draws) {
        root.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => {
          try {
            fn(el);
          } catch (e) {
            console.error(`[dashboard] drawing ${name} failed`, e);
          }
        });
      }
      for (const fn of onDataFns) {
        try {
          fn();
        } catch (e) {
          console.error("[dashboard] update failed", e);
        }
      }
    },
    schedule() {
      if (frame || disposed) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        rt.render();
      });
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      dark?.removeEventListener("change", onScheme);
    },
  };
  const onScheme = () => rt.schedule();
  dark?.addEventListener("change", onScheme);
  return rt;
}
