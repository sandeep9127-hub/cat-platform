/**
 * "Private preview" gate: holds a deployment behind a shared access code while
 * it is tested. Switched on only with PREVIEW_GATE=on.
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

/**
 * The gate is used only to hold a deployment private while it is tested (e.g. a
 * new version on its *.vercel.app address). It is on only when PREVIEW_GATE=on;
 * the public site (launched 23 June 2026) runs with it off.
 */
export function previewGateEnabled(): boolean {
  return process.env.PREVIEW_GATE === "on";
}

/** Only allow internal, non-loop redirect targets. */
export function safeFrom(from: string | null | undefined): string {
  if (!from) return "/";
  if (!from.startsWith("/") || from.startsWith("//")) return "/";
  if (from.startsWith("/preview")) return "/";
  return from;
}
