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
    return [
      {
        source: "/:path((?!api/|_next/|moved).*)",
        has: [{ type: "host", value: "(?<vhost>.*\\.vercel\\.app)" }],
        destination: "/moved?from=/:path",
      },
    ];
  },
  async headers() {
    const csp =
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:; frame-src https://www.youtube-nocookie.com https://www.youtube.com; media-src 'self' https:";
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
