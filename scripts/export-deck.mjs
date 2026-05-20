#!/usr/bin/env node
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const DECK = "file://" + path.resolve("docs/cat-platform-deck.html");
const OUT = path.resolve("docs");
const SLIDES_DIR = path.resolve("docs/deck-slides");
mkdirSync(SLIDES_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto(DECK, { waitUntil: "networkidle", timeout: 30_000 });

// Per-slide PNG export
const slideCount = await page.locator(".slide").count();
console.log(`${slideCount} slides found.`);
for (let i = 0; i < slideCount; i++) {
  const slide = page.locator(".slide").nth(i);
  await slide.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const out = path.join(SLIDES_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`);
  await slide.screenshot({ path: out });
  console.log(`  ✓ ${out}`);
}

// Whole-deck PDF — one slide per page
await page.pdf({
  path: path.join(OUT, "CAT-Platform-deck.pdf"),
  width: "1920px",
  height: "1080px",
  printBackground: true,
  margin: { top: "0", bottom: "0", left: "0", right: "0" },
});
console.log(`\nPDF: ${path.join(OUT, "CAT-Platform-deck.pdf")}`);

await browser.close();
