import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BrandBar } from "@/components/layout/BrandBar";
import { Footer } from "@/components/layout/Footer";
import { FloatingAsk } from "@/components/global/FloatingAsk";
import { Analytics } from "@vercel/analytics/react";

/**
 * Inter variable (opsz, wght) served locally from /public/fonts/inter.
 * Open-source under the SIL Open Font License. Inter is now the sitewide
 * typeface: it is wired as BOTH the sans and the serif token so every
 * `font-serif` and `font-sans` Tailwind class resolves to Inter.
 */
const inter = localFont({
  src: [
    {
      path: "../public/fonts/inter/Inter-Variable.ttf",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../public/fonts/inter/Inter-Italic-Variable.ttf",
      style: "italic",
      weight: "100 900",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
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
      className={`${inter.variable} ${jetbrains.variable}`}
      // Inter is the sitewide typeface. Mirror it on the legacy --font-fraunces
      // CSS variable so every existing `font-serif` Tailwind class also resolves
      // to Inter without touching 100+ markup files.
      style={{ ["--font-fraunces" as string]: `var(--font-inter)` }}
    >
      <body className="min-h-dvh font-sans">
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        <BrandBar />
        <main id="main" className="relative z-10">
          {children}
        </main>
        <Footer />
        <FloatingAsk />
        <Analytics />
      </body>
    </html>
  );
}
