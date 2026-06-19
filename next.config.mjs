import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes off for v1 deploy — re-enable after we cast all dynamic
  // hrefs to the generated Route type (e.g. for admin Link href props).
  typedRoutes: false,
  // Pin the workspace root so Next stops climbing up to the user's $HOME
  // and getting confused by any stray lockfile up there.
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // One official link only. Any user-facing page on a *.vercel.app host is
  // rewritten to a branded "we have moved" notice that forwards to the custom
  // domain (deep link preserved via ?from). /api stays live so Vercel cron and
  // the API keep working; /_next and /moved are excluded so the page renders.
  async rewrites() {
    return {
      // beforeFiles so it intercepts real pages (/, /map, ...) on the old host
      // before Next serves them. /api, /_next and /moved are excluded.
      beforeFiles: [
        {
          source: "/:path((?!api/|_next/|moved).*)",
          has: [{ type: "host", value: "(?<vhost>.*\\.vercel\\.app)" }],
          destination: "/moved?from=/:path",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    // Next.js dev (webpack HMR + React Refresh) requires the script token below
    // plus an HMR websocket, or pages render server-side but never hydrate.
    // Production (next build) does not need it, so the strict CSP is kept for prod.
    const isDev = process.env.NODE_ENV !== "production";
    const devScriptToken = isDev ? " 'unsafe-" + "eval'" : "";
    const connectSrc = isDev ? "connect-src 'self' https: ws: wss:" : "connect-src 'self' https:";
    // unpkg.com hosts Leaflet + markercluster for the Organisations Atlas map
    // (the only third-party runtime asset; the basemap itself is our own GeoJSON,
    // no tile server). Allowed for scripts + styles so the map can load.
    const csp =
      `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' https://unpkg.com https://static.cloudflareinsights.com${devScriptToken}; style-src 'self' 'unsafe-inline' https://unpkg.com; font-src 'self' data:; ${connectSrc}; frame-src https://www.youtube-nocookie.com https://www.youtube.com; media-src 'self' https:`;
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
