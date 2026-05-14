import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BrandBar } from "@/components/layout/BrandBar";
import { Footer } from "@/components/layout/Footer";

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

export const metadata: Metadata = {
  title: {
    default: "CAT Platform — A dashboard for sustainable food systems",
    template: "%s · CAT Platform",
  },
  description:
    "A curated, editorial record of credible food systems work in India. Programmes are read, not pitched. Limitations sit beside achievements.",
  openGraph: {
    title: "CAT Platform",
    description: "A dashboard for sustainable food systems.",
    type: "website",
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
      </body>
    </html>
  );
}
