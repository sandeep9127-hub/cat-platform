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
  // One official link only: bounce the old Vercel domain(s) to the custom
  // domain with a permanent redirect, so funders only ever see hub.agroecologyindia.org.
  async redirects() {
    return [
      {
        // Every user-facing path EXCEPT /api/* (so Vercel cron + API still run
        // on the platform host) bounces to the canonical domain.
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "(?<vhost>.*\\.vercel\\.app)" }],
        destination: "https://hub.agroecologyindia.org/:path",
        permanent: true,
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
