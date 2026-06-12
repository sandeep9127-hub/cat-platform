import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Cache the upstream fetch for 6h so we don't hammer the FX API per visitor.
export const revalidate = 21600;

// INR per 1 unit of the currency. Fallback if the live fetch fails — kept
// roughly current so the dashboard never shows a wildly stale number.
const FALLBACK = { INR: 1, USD: 95, EUR: 100 } as const;

/**
 * Live indicative FX rates as "INR per 1 unit". Source: Frankfurter (ECB daily
 * reference rates, free, no key). Returns { INR:1, USD, EUR, asOf } where USD/EUR
 * are INR-per-unit, rounded to 2 dp. Falls back to FALLBACK on any error so the
 * client always gets a usable shape.
 */
export async function GET() {
  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=INR&symbols=USD,EUR",
      { next: { revalidate }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as { date?: string; rates?: { USD?: number; EUR?: number } };
    const usdPerInr = data.rates?.USD;
    const eurPerInr = data.rates?.EUR;
    if (!usdPerInr || !eurPerInr) throw new Error("missing rates");

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return NextResponse.json({
      INR: 1,
      USD: round2(1 / usdPerInr),
      EUR: round2(1 / eurPerInr),
      asOf: data.date ?? null,
      live: true,
    });
  } catch {
    return NextResponse.json({ ...FALLBACK, asOf: null, live: false });
  }
}
