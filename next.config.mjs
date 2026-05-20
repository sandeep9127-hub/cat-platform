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
};

export default nextConfig;
