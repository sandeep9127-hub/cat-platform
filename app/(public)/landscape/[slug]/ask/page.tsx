import { redirect } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";

// ISR: cache the rendered page at the edge (revalidate every 5 min). These
// pages read DB data only (no per-request searchParams/cookies/headers), so
// static-with-revalidation is correct and avoids the slow per-request SSR that
// gave ~5s TTFB. New publishes appear within the window.
export const revalidate = 300;

// Prerender all known landscapes at build (the slug set is a fixed Record) so
// Vercel serves them as cached ISR pages, not per-request dynamic renders.
export function generateStaticParams() {
  return Object.keys(LANDSCAPES).map((slug) => ({ slug }));
}

/**
 * The per-landscape Ask tab is consolidated into the global assistant at
 * `/agent`. We preserve the deep-link by routing the scope through.
 * Anyone bookmarking `/landscape/patratu/ask` lands on `/agent?scope=patratu`
 * with the Patratu source pre-applied.
 */
export default async function LandscapeAskRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (LANDSCAPES[slug]) {
    redirect(`/agent?scope=${slug}`);
  } else {
    redirect(`/agent`);
  }
}
