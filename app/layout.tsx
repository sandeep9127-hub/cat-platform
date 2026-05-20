import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BrandBar } from "@/components/layout/BrandBar";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@vercel/analytics/react";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
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
    "A curated, editorial record of credible food systems work in India, by the Consortium for Agroecological Transformations. Programmes are read, not pitched. Limitations sit beside achievements.",
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        <BrandBar />
        <main id="main" className="relative z-10">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
