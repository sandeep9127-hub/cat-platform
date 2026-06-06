import { PrinciplesExplorer } from "@/components/principles/PrinciplesExplorer";
import { solutionsByPrinciple } from "@/lib/factsheet/generate";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata = {
  title: "The 13 Principles of Agroecology — Transformation Hub",
  description:
    "An interactive reference to the 13 HLPE principles of agroecology, organised by operational level, with practical levers and how each principle shows up in Indian landscapes.",
};

export default async function PrinciplesPage() {
  const solutions = await solutionsByPrinciple().catch(() => ({}));
  return <PrinciplesExplorer solutions={solutions} />;
}
