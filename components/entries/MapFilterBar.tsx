"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Layers,
  Compass,
  MapPin,
  Check,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { categoryIconFor } from "@/components/ui/CategoryIcon";

type Opt = { value: string; label: string; count: number };
type PrincipleOpt = Opt & { n: number };

/**
 * Solutions Atlas filter bar. Desktop (lg+): three multi-select dropdowns
 * (Intervention · Principle · State), right-aligned. Mobile (< lg): a single
 * "Filters (n)" button opening a bottom sheet with all three axes. Selections
 * live in the URL (deep-linkable); toggling uses router.replace scroll:false so
 * the page re-filters without closing the open dropdown/sheet. Within an axis
 * values are OR'd; the three axes intersect (AND) — handled on the server.
 */
export function MapFilterBar({
  categories,
  principles,
  states,
  resultCount,
}: {
  categories: Opt[];
  principles: PrincipleOpt[];
  states: Opt[];
  resultCount: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const read = (k: string) =>
    (sp.get(k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const selCat = read("category");
  const selPri = read("principle");
  const selState = read("state");

  const push = (axis: "category" | "principle" | "state", values: string[]) => {
    const params = new URLSearchParams();
    const c = axis === "category" ? values : selCat;
    const p = axis === "principle" ? values : selPri;
    const s = axis === "state" ? values : selState;
    if (c.length) params.set("category", c.join(","));
    if (p.length) params.set("principle", p.join(","));
    if (s.length) params.set("state", s.join(","));
    const qs = params.toString();
    router.replace(qs ? `/map?${qs}` : "/map", { scroll: false });
  };
  const toggle = (axis: "category" | "principle" | "state", current: string[], value: string) =>
    push(axis, current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  const clearAll = () => router.replace("/map", { scroll: false });

  const totalActive = selCat.length + selPri.length + selState.length;

  // Option rows reused by both the desktop dropdowns and the mobile sheet.
  const catRows = categories.map((o) => {
    const Ic = categoryIconFor(o.value);
    return (
      <Row
        key={o.value}
        on={selCat.includes(o.value)}
        onClick={() => toggle("category", selCat, o.value)}
        icon={<Ic size={14} strokeWidth={1.8} className="shrink-0 text-muted" aria-hidden />}
        label={o.label}
        count={o.count}
      />
    );
  });
  const priRows = principles.map((o) => (
    <Row
      key={o.value}
      on={selPri.includes(o.value)}
      onClick={() => toggle("principle", selPri, o.value)}
      icon={
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/images/principle-icons/p${o.n}.png?v=4`}
          alt=""
          className="shrink-0 w-4 h-4 object-contain"
          aria-hidden
        />
      }
      label={o.label}
      count={o.count}
    />
  ));
  const stateRows = states.map((o) => (
    <Row
      key={o.value}
      on={selState.includes(o.value)}
      onClick={() => toggle("state", selState, o.value)}
      label={o.label}
      count={o.count}
    />
  ));

  return (
    <>
      {/* Desktop — inline dropdowns */}
      <div className="hidden lg:flex flex-wrap items-center gap-2 justify-end">
        {totalActive > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-deep-teal hover:text-ink transition-colors mr-1"
          >
            Clear ({totalActive}) ×
          </button>
        )}
        <Dropdown label="Intervention" Icon={Layers} active={selCat.length}>
          {catRows}
        </Dropdown>
        <Dropdown label="Principle" Icon={Compass} active={selPri.length}>
          {priRows}
        </Dropdown>
        <Dropdown label="State" Icon={MapPin} active={selState.length}>
          {stateRows}
        </Dropdown>
      </div>

      {/* Mobile — single Filters button → bottom sheet */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] text-ink-soft active:scale-[0.97] transition-transform"
      >
        <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden />
        Filters
        {totalActive > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-deep-teal text-paper font-mono text-[10px] tabular-nums">
            {totalActive}
          </span>
        )}
      </button>

      {mounted &&
        sheetOpen &&
        createPortal(
          <div className="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Filter the Atlas">
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]" onClick={() => setSheetOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[86vh] flex flex-col rounded-t-[20px] bg-paper border-t border-line animate-slide-up">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line-soft">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal font-semibold">
                  Filter the Atlas
                </span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close filters"
                  className="p-1.5 -mr-1.5 text-ink-soft hover:text-ink"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
                <SheetSection Icon={Layers} label="By intervention">{catRows}</SheetSection>
                <SheetSection Icon={Compass} label="By agroecology principle">{priRows}</SheetSection>
                <SheetSection Icon={MapPin} label="By state">{stateRows}</SheetSection>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-line-soft">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={totalActive === 0}
                  className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-deep-teal disabled:opacity-40"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="inline-flex items-center justify-center rounded-full px-6 py-2.5 bg-deep-teal text-paper font-mono text-[11px] uppercase tracking-[0.14em] active:scale-[0.97] transition-transform"
                >
                  Show {resultCount} {resultCount === 1 ? "solution" : "solutions"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function SheetSection({ Icon, label, children }: { Icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <section>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mb-1 px-2.5 inline-flex items-center gap-1.5">
        <Icon size={11} strokeWidth={1.8} aria-hidden />
        {label}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Dropdown({
  label,
  Icon,
  active,
  children,
}: {
  label: string;
  Icon: LucideIcon;
  active: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={
          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out-expo " +
          (active > 0
            ? "border-deep-teal text-deep-teal bg-teal-wash/50"
            : "border-line text-ink-soft hover:border-deep-teal hover:text-deep-teal")
        }
      >
        <Icon size={14} strokeWidth={1.8} aria-hidden />
        <span>{label}</span>
        {active > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-deep-teal text-paper font-mono text-[10px] tabular-nums">
            {active}
          </span>
        )}
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={"transition-transform duration-200 " + (open ? "rotate-180" : "")}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-[266px] max-h-[58vh] overflow-y-auto rounded-[12px] border border-line bg-paper p-1.5 animate-scope-pop"
          style={{
            transformOrigin: "top right",
            boxShadow: "0 18px 44px -18px rgba(26,38,37,0.40), 0 2px 6px rgba(26,38,37,0.08)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Row({
  on,
  onClick,
  icon,
  label,
  count,
}: {
  on: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      onClick={onClick}
      className={
        "w-full flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors " +
        (on ? "bg-teal-wash/70 text-deep-teal" : "text-ink-soft hover:bg-cream")
      }
    >
      <span
        className={
          "shrink-0 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors " +
          (on ? "bg-deep-teal border-deep-teal" : "border-line")
        }
      >
        {on && <Check size={11} strokeWidth={3} className="text-paper" aria-hidden />}
      </span>
      {icon}
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <span className="font-mono text-[10.5px] tabular-nums text-muted">{count}</span>
    </button>
  );
}
