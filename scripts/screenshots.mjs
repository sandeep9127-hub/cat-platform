#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL || "http://localhost:3003";
const OUT = path.resolve("docs/deck-assets");
mkdirSync(OUT, { recursive: true });

/**
 * Each shot: { path, file, viewport, scrollY?, fullPage?, click?, wait? }
 */
const shots = [
  // Desktop 1440x900
  { name: "01-landing-hero", path: "/", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "02-landing-stats-and-legend", path: "/", viewport: { width: 1440, height: 900 }, scrollY: 380 },
  { name: "03-landing-atlas", path: "/", viewport: { width: 1440, height: 900 }, scrollY: 800 },
  { name: "04-landing-atlas-filtered", path: "/", viewport: { width: 1440, height: 900 }, scrollY: 800, click: '[data-code="AP"]' },
  { name: "05-landing-themes-grid", path: "/", viewport: { width: 1440, height: 900 }, scrollY: 2300 },
  { name: "06-landing-featured-entry", path: "/", viewport: { width: 1440, height: 900 }, scrollY: 2800 },
  { name: "07-landing-footer", path: "/", viewport: { width: 1440, height: 900 }, scrollY: 4200 },

  { name: "10-entry-detail-header", path: "/entry/ap-community-natural-farming", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "11-entry-detail-narrative", path: "/entry/ap-community-natural-farming", viewport: { width: 1440, height: 900 }, scrollY: 700 },
  { name: "12-entry-what-did-not-work", path: "/entry/ap-community-natural-farming", viewport: { width: 1440, height: 900 }, scrollY: 1500 },
  { name: "13-entry-sundarbans-failure", path: "/entry/sundarbans-climate-resilient-farming", viewport: { width: 1440, height: 900 }, scrollY: 1300 },

  { name: "20-landscapes-index", path: "/landscapes", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "21-landscapes-grid", path: "/landscapes", viewport: { width: 1440, height: 900 }, scrollY: 500 },
  { name: "22-landscape-detail-dantewada", path: "/landscape/dantewada", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "23-landscape-levers", path: "/landscape/dantewada", viewport: { width: 1440, height: 900 }, scrollY: 700 },

  { name: "30-map-deep-view", path: "/map", viewport: { width: 1440, height: 900 }, scrollY: 400 },
  { name: "31-theme-water", path: "/theme/water", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "32-organisation-ryss", path: "/organisation/ryss", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "33-resources-library", path: "/resources", viewport: { width: 1440, height: 900 }, scrollY: 200 },
  { name: "34-news-feed", path: "/news", viewport: { width: 1440, height: 900 }, scrollY: 200 },
  { name: "35-search-results", path: "/search?q=millet", viewport: { width: 1440, height: 900 }, scrollY: 200 },
  { name: "36-agent-preview", path: "/agent", viewport: { width: 1440, height: 900 }, scrollY: 0 },

  { name: "40-about-mission", path: "/about", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "41-about-three-levers", path: "/about", viewport: { width: 1440, height: 900 }, scrollY: 1700 },
  { name: "42-editorial-process", path: "/editorial-process", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "43-editorial-steps", path: "/editorial-process", viewport: { width: 1440, height: 900 }, scrollY: 600 },

  { name: "50-admin-queue", path: "/admin?dev=1", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "51-contribute-form", path: "/contribute", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "52-not-found", path: "/totally-not-a-real-page", viewport: { width: 1440, height: 900 }, scrollY: 0 },

  // Mobile 375x812
  { name: "60-mobile-hero", path: "/", viewport: { width: 375, height: 812 }, scrollY: 0 },
  { name: "61-mobile-atlas", path: "/", viewport: { width: 375, height: 812 }, scrollY: 1500 },
  { name: "62-mobile-entry", path: "/entry/ap-community-natural-farming", viewport: { width: 375, height: 812 }, scrollY: 0 },
  { name: "63-mobile-landscape", path: "/landscape/dantewada", viewport: { width: 375, height: 812 }, scrollY: 0 },
  { name: "64-mobile-agent", path: "/agent", viewport: { width: 375, height: 812 }, scrollY: 0 },
  { name: "65-mobile-nav-open", path: "/", viewport: { width: 375, height: 812 }, scrollY: 0, click: 'button[aria-label="Open menu"]' },
];

const browser = await chromium.launch();
let ok = 0, fail = 0;

for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: s.viewport,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  try {
    const url = BASE + s.path;
    console.log(`→ ${s.name}  ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    if (s.click) {
      try { await page.click(s.click, { timeout: 4000 }); } catch {}
      await page.waitForTimeout(400);
    }
    if (s.scrollY) {
      await page.evaluate((y) => window.scrollTo(0, y), s.scrollY);
      await page.waitForTimeout(600);
    } else {
      await page.waitForTimeout(300);
    }
    const out = path.join(OUT, `${s.name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    ok++;
  } catch (e) {
    console.error(`  ✗ ${s.name}: ${e.message}`);
    fail++;
  } finally {
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${ok} OK · ${fail} failed · output: ${OUT}`);
