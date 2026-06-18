"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Layers, Compass, MapPin, Check, type LucideIcon } from "lucide-react";
import { categoryIconFor } from "@/components/ui/CategoryIcon";

type Opt = { value: string; label: string; count: number };
type PrincipleOpt = Opt & { n: number };

/**
 * The Solutions Atlas filter bar: three multi-select dropdowns (Intervention ·
 * Principle · State), right-aligned. Selections live in the URL (deep-linkable,
 * shareable); toggling uses router.replace with scroll:false so the page
 * re-filters server-side without closing the open dropdown. Within an axis,
 * selections are OR'd; the three axes intersect (AND) — handled on the server.
 */
export function MapFilterBar({
  categories,
  principles,
  states,
}: {
  categories: Opt[];
  principles: PrincipleOpt[];
  states: Opt[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
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

  const totalActive = selCat.length + selPri.length + selState.length;

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {totalActive > 0 && (
        <button
          type="button"
          onClick={() => router.replace("/map", { scroll: false })}
          className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-deep-teal hover:text-ink transition-colors mr-1"
        >
          Clear ({totalActive}) ×
        </button>
      )}
      <Dropdown label="Intervention" Icon={Layers} active={selCat.length}>
        {categories.map((o) => {
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
        })}
      </Dropdown>
      <Dropdown label="Principle" Icon={Compass} active={selPri.length}>
        {principles.map((o) => (
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
        ))}
      </Dropdown>
      <Dropdown label="State" Icon={MapPin} active={selState.length}>
        {states.map((o) => (
          <Row
            key={o.value}
            on={selState.includes(o.value)}
            onClick={() => toggle("state", selState, o.value)}
            label={o.label}
            count={o.count}
          />
        ))}
      </Dropdown>
    </div>
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
