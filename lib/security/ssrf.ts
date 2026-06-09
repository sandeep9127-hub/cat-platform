/**
 * SSRF guard. Validates that a URL is safe to fetch from server-side code
 * before any request is made. Used by the ingestion crawler and the admin
 * blob-ingest path, both of which can receive URLs that originate from LLM
 * proposals or client input.
 *
 * Rejects:
 *  - non-http(s) protocols (file:, gopher:, data:, ftp:, etc.)
 *  - localhost / *.local hostnames
 *  - IP literals in private/loopback/link-local ranges:
 *      IPv4: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16,
 *            169.254.0.0/16 (incl. cloud metadata 169.254.169.254), 0.0.0.0/8
 *      IPv6: ::1 (loopback), fc00::/7 (unique-local), fe80::/10 (link-local),
 *            IPv4-mapped (::ffff:a.b.c.d) re-checked against the IPv4 rules
 */

function ipv4ToParts(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (parts.some((p) => p < 0 || p > 255)) return null;
  return parts;
}

function isPrivateIPv4(parts: number[]): boolean {
  const [a, b] = parts;
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. 169.254.169.254 metadata)
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  return false;
}

function isPrivateIPv6(host: string): boolean {
  // Strip zone id and surrounding brackets if present.
  let h = host.replace(/^\[/, "").replace(/\]$/, "").split("%")[0].toLowerCase();

  // IPv4-mapped / embedded form (::ffff:a.b.c.d or ::a.b.c.d) — re-check the v4 tail.
  const v4Embedded = h.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4Embedded) {
    const parts = ipv4ToParts(v4Embedded[1]);
    if (parts && isPrivateIPv4(parts)) return true;
  }

  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true; // loopback
  if (h === "::" || h === "0:0:0:0:0:0:0:0") return true; // unspecified
  if (h.startsWith("fe80") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb")) {
    return true; // fe80::/10 link-local
  }
  // fc00::/7 unique-local addresses: first byte 0xfc or 0xfd.
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

/**
 * Throws if the given URL is unsafe to fetch from server-side code.
 * Performs literal-host checks only (no DNS resolution); callers should still
 * prefer redirect: "manual" and re-validate redirect Location headers.
 */
export function assertSafeFetchUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Unsafe fetch URL (unparseable): ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsafe fetch URL (protocol ${parsed.protocol} not allowed): ${url}`);
  }

  const host = parsed.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error(`Unsafe fetch URL (localhost): ${url}`);
  }
  if (host.endsWith(".local")) {
    throw new Error(`Unsafe fetch URL (.local host): ${url}`);
  }

  // IPv6 literal (URL hostname keeps the brackets for v6).
  if (host.includes(":") || (url.includes("[") && url.includes("]"))) {
    if (isPrivateIPv6(host)) {
      throw new Error(`Unsafe fetch URL (private/loopback IPv6): ${url}`);
    }
  }

  const v4 = ipv4ToParts(host);
  if (v4 && isPrivateIPv4(v4)) {
    throw new Error(`Unsafe fetch URL (private/loopback IPv4): ${url}`);
  }

  return parsed;
}
