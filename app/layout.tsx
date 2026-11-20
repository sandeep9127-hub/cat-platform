import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

/**
 * Inter variable (opsz, wght) served locally as WOFF2, subset to Latin,
 * Latin Extended (transliterated Indian names), punctuation, currency (₹ €),
 * arrows and maths symbols. It is the sitewide face: body, UI, headings,
 * numbers. `font-sans`, `font-mono` and `font-serif` all resolve to it.
 */
const inter = localFont({
  src: [
    { path: "../public/fonts/inter/Inter-Variable.woff2", style: "normal", weight: "100 900" },
    { path: "../public/fonts/inter/Inter-Italic-Variable.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Fraunces, used ONLY for the "Transformation Hub" wordmark in the header
 * (`font-wordmark`). Pinned to opsz 18, weight 400-500 and subset to basic
 * Latin, so it is a ~26 KB file. Not preloaded: the wordmark swaps in.
 */
const wordmark = localFont({
  src: [{ path: "../public/fonts/fraunces/Fraunces-Wordmark.woff2", style: "normal", weight: "400 500" }],
  variable: "--font-wordmark",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const PROD_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "https://cat-platform-fawn.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(PROD_URL),
  title: {
    default: "Transformation Hub — A dashboard for sustainable food systems",
    template: "%s · Transformation Hub",
  },
  description:
    "An edited record of food systems work in India — government missions, NGO programmes, farmer federations and research interventions. Run by the Consortium for Agroecological Transformations. Every entry is read by an editor; what didn't work shows up next to what did.",
  openGraph: {
    title: "Transformation Hub — A dashboard for sustainable food systems",
    description:
      "By the Consortium for Agroecological Transformations. Eleven focus landscapes, plus a Solutions Atlas of programmes from across India.",
    type: "website",
    siteName: "Transformation Hub",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transformation Hub",
    description: "A dashboard for sustainable food systems.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${wordmark.variable}`}
      // One typeface: the legacy serif and mono tokens both resolve to Inter
      // (see DESIGN.md, Typography). Only the header wordmark uses Fraunces.
      style={{
        ["--font-jetbrains" as string]: `var(--font-inter)`,
        ["--font-fraunces" as string]: `var(--font-inter)`,
      }}
    >
      <body className="min-h-dvh font-sans">
        {/* Public chrome (BrandBar/Footer/FloatingAsk) lives in
            app/(public)/layout.tsx so it doesn't wrap the /admin console. */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
