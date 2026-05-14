import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ReviewSplit } from "@/components/admin/ReviewSplit";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const [draft] = await db
    .select()
    .from(schema.draftEntries)
    .where(eq(schema.draftEntries.id, id))
    .limit(1);
  if (!draft) notFound();

  return (
    <div className="space-y-6">
      <header>
        <span className="mono-label">Review · AI draft</span>
        <h1 className="font-serif text-[28px] sm:text-[34px] font-normal tracking-[-0.02em] text-ink mt-2">
          {draft.title}
        </h1>
        <div className="flex gap-4 flex-wrap font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mt-2">
          <span>{draft.primaryStateCode ?? "—"}</span>
          <span>· {draft.primaryThemeSlug ?? "—"}</span>
          <span>· {draft.scaleBand?.replace("_", " ") ?? "—"}</span>
          <span>
            ·{" "}
            {draft.draftConfidence != null
              ? `${Math.round(draft.draftConfidence * 100)}% confidence`
              : "Confidence unknown"}
          </span>
        </div>
      </header>

      <ReviewSplit draft={draft} />
    </div>
  );
}
