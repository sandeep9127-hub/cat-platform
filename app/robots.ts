import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.AUTH_URL ?? "https://cat-platform.example.org";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/agent"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
