import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

/**
 * Inter variable (opsz, wght) served locally — the sitewide SANS for all body
 * copy, UI chrome, and most headings (font-sans / font-mono both resolve here).
 */
const inter = localFont({
  src: [
    { path: "../public/fonts/inter/Inter-Variable.ttf", style: "normal", weight: "100 900" },
    { path: "../public/fonts/inter/Inter-Italic-Variable.ttf", style: "italic", weight: "100 900" },
  ],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Fraunces — warm, soft editorial display serif (opsz/wght variable), served
 * locally for CSP (font-src 'self'). Used ONLY via the `font-serif` token,
 * which the app applies to editorial moments — page titles, display headings,
 * pull quotes, and the big budget numbers — never to body copy (that stays
 * Inter). preload:false: it's a heading face with display:swap, so it loads
 * async and never blocks LCP. Restores the serif/sans pairing the design
 * system was built around (Arva/Anthropic editorial standard).
 */
const fraunces = localFont({
  src: [{ path: "../public/fonts/fraunces/Fraunces-Variable.ttf", style: "normal", weight: "100 900" }],
  variable: "--font-fraunces",
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
      className={`${inter.variable} ${fraunces.variable}`}
      // Serif (font-serif) → Fraunces. Mono (font-mono) still resolves to Inter
      // — no separate mono face is loaded; mono usage is just tracked/uppercased
      // Inter labels.
      style={{
        ["--font-jetbrains" as string]: `var(--font-inter)`,
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
