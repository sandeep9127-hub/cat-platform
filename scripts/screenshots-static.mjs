#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("docs/deck-assets");
mkdirSync(OUT, { recursive: true });

const MOCKUP = "file:///Users/sandeepnayak/Desktop/cat-landing.html";

const shots = [
  { name: "01-landing-hero", viewport: { width: 1440, height: 900 }, scrollY: 0 },
  { name: "02-landing-stats", viewport: { width: 1440, height: 900 }, scrollY: 480 },
  { name: "03-landing-atlas", viewport: { width: 1440, height: 900 }, scrollY: 900 },
  { name: "04-landing-themes", viewport: { width: 1440, height: 900 }, scrollY: 2400 },
  { name: "05-landing-featured-entry", viewport: { width: 1440, height: 900 }, scrollY: 3200 },
  { name: "06-landing-footer", viewport: { width: 1440, height: 900 }, scrollY: 4400 },
  { name: "60-mobile-hero", viewport: { width: 390, height: 844 }, scrollY: 0 },
  { name: "61-mobile-atlas", viewport: { width: 390, height: 844 }, scrollY: 1500 },
  { name: "62-mobile-entries", viewport: { width: 390, height: 844 }, scrollY: 2500 },
  { name: "63-mobile-themes", viewport: { width: 390, height: 844 }, scrollY: 4200 },
];

const browser = await chromium.launch();
let ok = 0, fail = 0;
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try {
    await page.goto(MOCKUP, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(300);
    if (s.scrollY) {
      await page.evaluate((y) => window.scrollTo(0, y), s.scrollY);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: false });
    console.log(`✓ ${s.name}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${s.name}: ${e.message}`);
    fail++;
  } finally {
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${ok} OK · ${fail} failed`);
