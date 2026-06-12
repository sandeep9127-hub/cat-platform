"use client";

import { Mountain, Users, Coins, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export type LedgerProps = {
  landscapeName: string;
  area: string;
  villages: string;
  agroclimaticZone: string;
  population: string;
  households: string;
  lipStatus: "published" | "in_preparation";
  /** Present only when an investment plan is ingested. */
  totalCostInr?: number;
  investmentRequiredInr?: number;
};

function groupIN(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  const neg = n < 0 ? "-" : "";
  if (s.length <= 3) return neg + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return neg + rest + "," + last3;
}
function inrShort(n: number): string {
  if (!n || !isFinite(n)) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 0 : 1)} cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${groupIN(n)}`;
}

function parseIndianNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/,/g, "").replace(/\s/g, "").toLowerCase();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (cleaned.includes("crore") || cleaned.endsWith("cr")) return num * 1e7;
  if (cleaned.includes("lakh") || cleaned.endsWith("l")) return num * 1e5;
  return num;
}

function shortZone(zone: string): string {
  const head = zone.split(/[,.]/)[0]?.trim() ?? zone;
  return head.length > 30 ? head.slice(0, 28) + "…" : head;
}

type Row = { label: string; value: string; muted?: boolean };

/**
 * The landscape facts ledger — three always-visible column groups (Land /
 * People / Investment), each toned by the official CAT ramp. No lens toggling:
 * every number is on the page at once, counting up on first view. Adaptive —
 * the Investment group reads "In preparation" when no plan is ingested.
 */
export function LandscapeLedger(props: LedgerProps) {
  const hasMoney = props.totalCostInr != null && props.totalCostInr > 0;
  const hh = parseIndianNumber(props.households);
  const pop = parseIndianNumber(props.population);
  const avg = hh && pop ? (pop / hh).toFixed(1) : "—";

  const groups: { key: string; label: string; Icon: LucideIcon; accent: string; rows: Row[] }[] = [
    {
      key: "land",
      label: "Land",
      Icon: Mountain,
      accent: "#5e6990",
      rows: [
        { label: "Geographical area", value: props.area },
        { label: "Inhabited villages", value: props.villages },
        { label: "Agroclimatic zone", value: shortZone(props.agroclimaticZone) },
      ],
    },
    {
      key: "people",
      label: "People",
      Icon: Users,
      accent: "#2e7573",
      rows: [
        { label: "Population", value: props.population },
        { label: "Households", value: props.households },
        { label: "Avg household size", value: avg },
      ],
    },
    {
      key: "money",
      label: "Investment",
      Icon: Coins,
      accent: "#946616",
      rows: hasMoney
        ? [
            { label: "Total plan size", value: inrShort(props.totalCostInr!) },
            { label: "External investment", value: inrShort(props.investmentRequiredInr ?? 0) },
            { label: "Programme horizon", value: "7 years" },
          ]
        : [{ label: "Investment plan", value: "In preparation", muted: true }],
    },
  ];

  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-10 lg:mt-14">
      <div className="mb-5">
        <span className="eyebrow">The landscape</span>
        <h2 className="font-serif text-[26px] sm:text-[30px] tracking-[-0.018em] text-ink mt-2 leading-[1.15]">
          {props.landscapeName} at a glance
        </h2>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line rounded-[14px] overflow-hidden border border-line list-none p-0 m-0">
        {groups.map((g) => (
          <li key={g.key} className="relative bg-paper px-6 py-6 sm:px-7 sm:py-7">
            <span aria-hidden className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: g.accent }} />
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] font-semibold mb-5" style={{ color: g.accent }}>
              <g.Icon size={13} strokeWidth={1.9} aria-hidden />
              {g.label}
            </div>
            <dl className="flex flex-col gap-0 m-0">
              {g.rows.map((r, i) => (
                <div
                  key={r.label}
                  className={"flex items-baseline justify-between gap-4 py-2.5" + (i < g.rows.length - 1 ? " border-b border-line/70" : "")}
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted">{r.label}</dt>
                  <dd
                    className={
                      "font-serif tabular-nums tracking-[-0.015em] text-right " +
                      (r.muted ? "text-[15px] italic text-amber-deep" : "text-[19px] sm:text-[21px] text-deep-teal font-medium")
                    }
                  >
                    {r.muted ? r.value : <AnimatedNumber value={r.value} />}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
