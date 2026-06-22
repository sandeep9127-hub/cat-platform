/**
 * Pre-launch "private preview" gate. Temporary: the whole public site is held
 * behind a shared password until the London Climate Week launch, after which
 * this is removed (or PREVIEW_GATE=off is set) and the Hub is public.
 *
 * Edge-safe: constants only (the middleware imports this on the edge runtime).
 * The plaintext password is NOT stored here — only its SHA-256 hash. The unlock
 * route (Node) hashes the submitted password and compares.
 */

export const PREVIEW_COOKIE = "cat_preview";

// Opaque unlock token written to the cookie on success and checked by the
// middleware. Rotating this value invalidates every existing unlock.
export const PREVIEW_TOKEN = "f017796de3003275a381f520eac8bc9fecdc33cf04438004";

// SHA-256 (hex) of the shared preview password.
export const PREVIEW_PASSWORD_SHA256 =
  "05dc5618b8339437b19e52eefc926e884fdf050c33045bd994dfc361ead08478";

export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Launch target: 23 June 2026, 10:00 IST (10:00 AM India, +05:30). The gate
// AUTO-LIFTS at this moment (see previewGateEnabled) and the countdown hits zero.
export const LAUNCH_DATE = "2026-06-23T10:00:00+05:30";

const LAUNCH_MS = new Date(LAUNCH_DATE).getTime();

/**
 * The gate is on UNTIL the launch moment, then auto-lifts — evaluated per request
 * in edge middleware (never cached), so the site flips public exactly at
 * LAUNCH_DATE with no deploy or manual step. `PREVIEW_GATE=off` is a manual
 * kill-switch to lift it early; `PREVIEW_GATE=on` forces it to stay (overrides
 * the date) if a launch ever needs to be held.
 */
export function previewGateEnabled(): boolean {
  if (process.env.PREVIEW_GATE === "off") return false;
  if (process.env.PREVIEW_GATE === "on") return true;
  return Date.now() < LAUNCH_MS;
}

/** Only allow internal, non-loop redirect targets. */
export function safeFrom(from: string | null | undefined): string {
  if (!from) return "/";
  if (!from.startsWith("/") || from.startsWith("//")) return "/";
  if (from.startsWith("/preview")) return "/";
  return from;
}
