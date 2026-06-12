"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Currency = "INR" | "USD" | "EUR";

// Indicative conversion — INR per 1 unit of the currency. These are the FALLBACK
// values; on mount CurrencyProvider fetches live ECB rates from /api/rates and
// mutates this object in place, so formatMoney() picks up the live numbers. The
// brief/dashboard label these as indicative, not transactional rates.
export const INR_PER: Record<Currency, number> = { INR: 1, USD: 95, EUR: 100 };
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

type Rates = Record<Currency, number>;

const Ctx = createContext<{
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates;
  ratesLive: boolean;
}>({
  currency: "INR",
  setCurrency: () => {},
  rates: INR_PER,
  ratesLive: false,
});

/**
 * Holds the chosen display currency, persisted to localStorage so it carries
 * across the Profile / Budget / Insights tabs. Server + first client render are
 * always INR (hydration-safe); the stored choice is applied after mount.
 *
 * On mount it also fetches live FX rates from /api/rates (ECB daily) and mutates
 * the shared INR_PER object + bumps context, so every formatMoney() consumer
 * re-renders with the live numbers. Conversion only ever runs after the user
 * toggles to USD/EUR — which is always post-hydration — so there is no SSR
 * mismatch risk from the async rate update.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCur] = useState<Currency>("INR");
  const [rates, setRates] = useState<Rates>(INR_PER);
  const [ratesLive, setRatesLive] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("cat-currency");
      if (s === "USD" || s === "EUR" || s === "INR") setCur(s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/rates");
        if (!res.ok) return;
        const d = (await res.json()) as Partial<Rates> & { live?: boolean };
        if (cancelled) return;
        const next: Rates = {
          INR: 1,
          USD: typeof d.USD === "number" && d.USD > 0 ? d.USD : INR_PER.USD,
          EUR: typeof d.EUR === "number" && d.EUR > 0 ? d.EUR : INR_PER.EUR,
        };
        // Mutate the shared object so the pure formatMoney() reads live values…
        INR_PER.USD = next.USD;
        INR_PER.EUR = next.EUR;
        // …and bump context so consumers re-render with the new numbers.
        setRates(next);
        setRatesLive(Boolean(d.live));
      } catch {
        /* keep fallback rates */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCur(c);
    try {
      localStorage.setItem("cat-currency", c);
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <Ctx.Provider value={{ currency, setCurrency, rates, ratesLive }}>{children}</Ctx.Provider>
  );
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
