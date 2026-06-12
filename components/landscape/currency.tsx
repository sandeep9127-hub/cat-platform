"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Currency = "INR" | "USD" | "EUR";

// Indicative conversion — INR per 1 unit of the currency. Approximate (2026);
// the brief and dashboard label these as indicative, not transactional rates.
export const INR_PER: Record<Currency, number> = { INR: 1, USD: 86, EUR: 93 };
const SYMBOL: Record<Currency, string> = { INR: "₹", USD: "$", EUR: "€" };

function groupIN(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  const neg = n < 0 ? "-" : "";
  if (s.length <= 3) return neg + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return neg + rest + "," + last3;
}

/**
 * Format an INR amount in the chosen currency. INR uses crore / lakh; USD and
 * EUR use M / K. Deterministic (no toLocaleString) so it is SSR-safe.
 */
export function formatMoney(inr: number, cur: Currency, precise = false): string {
  if (!inr || !isFinite(inr)) return "—";
  if (cur === "INR") {
    if (inr >= 1e7) return `₹${(inr / 1e7).toFixed(precise ? 2 : inr >= 1e8 ? 0 : 1)} cr`;
    if (inr >= 1e5) return `₹${(inr / 1e5).toFixed(precise ? 2 : 1)} ${precise ? "lakh" : "L"}`;
    return `₹${groupIN(inr)}`;
  }
  const v = inr / INR_PER[cur];
  const s = SYMBOL[cur];
  if (v >= 1e6) return `${s}${(v / 1e6).toFixed(precise ? 2 : 1)}M`;
  if (v >= 1e3) return `${s}${(v / 1e3).toFixed(precise ? 1 : 0)}K`;
  return `${s}${groupIN(v)}`;
}

/** Plain count grouping (households, hectares) — never currency-converted. */
export function countIN(n: number): string {
  const v = Math.round(Number(n) || 0);
  if (v <= 0) return "—";
  const s = Math.abs(v).toString();
  if (s.length <= 3) return (v < 0 ? "-" : "") + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (v < 0 ? "-" : "") + rest + "," + last3;
}

const Ctx = createContext<{ currency: Currency; setCurrency: (c: Currency) => void }>({
  currency: "INR",
  setCurrency: () => {},
});

/**
 * Holds the chosen display currency, persisted to localStorage so it carries
 * across the Profile / Budget / Insights tabs. Server + first client render are
 * always INR (hydration-safe); the stored choice is applied after mount.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCur] = useState<Currency>("INR");
  useEffect(() => {
    try {
      const s = localStorage.getItem("cat-currency");
      if (s === "USD" || s === "EUR" || s === "INR") setCur(s);
    } catch {
      /* ignore */
    }
  }, []);
  const setCurrency = useCallback((c: Currency) => {
    setCur(c);
    try {
      localStorage.setItem("cat-currency", c);
    } catch {
      /* ignore */
    }
  }, []);
  return <Ctx.Provider value={{ currency, setCurrency }}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  return useContext(Ctx);
}

export function CurrencyToggle({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const opts: Currency[] = ["INR", "USD", "EUR"];
  return (
    <div
      role="group"
      aria-label="Display currency"
      className={"inline-flex border border-line rounded-full overflow-hidden bg-paper " + className}
    >
      {opts.map((c) => {
        const active = currency === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={active}
            className={
              "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] border-r border-line last:border-r-0 transition-colors " +
              (active ? "bg-deep-teal text-paper font-semibold" : "text-deep-teal hover:bg-line-soft")
            }
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
