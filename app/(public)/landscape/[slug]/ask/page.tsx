import { redirect } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const dynamic = "force-dynamic";

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
