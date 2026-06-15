import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { listLandscapeDocuments, deleteLandscapeDocument } from "@/lib/landscape/ingest";
import { LandscapeUpload } from "@/components/admin/LandscapeUpload";
import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function removeDocument(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const slug = String(formData.get("slug") || "");
  if (!id) return;
  const session = await auth();
  await deleteLandscapeDocument(id);
  await writeAudit({
    actorUserId: (session?.user as { id?: string })?.id ?? null,
    actorEmail: session?.user?.email ?? null,
    action: "landscape.report.removed",
    entityType: "landscape",
    entityId: slug,
    meta: { documentId: id },
  });
  revalidatePath(`/admin/landscapes/${slug}`);
}

export default async function LandscapeAdminDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landscape = LANDSCAPES[slug];
  if (!landscape) notFound();

  const docs = await listLandscapeDocuments(slug);
  const totalChunks = docs.reduce((n, d) => n + d.chunk_count, 0);

  return (
    <div className="space-y-7 max-w-[820px]">
      <header>
        <Link href="/admin/landscapes" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-teal no-underline">
          ← All landscapes
        </Link>
        <h1 className="font-serif text-[32px] sm:text-[40px] font-normal tracking-[-0.02em] text-ink mt-2">
          {landscape.name}
        </h1>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted mt-1">
          {landscape.district} · {landscape.region} · {slug}
        </p>
        <p className="text-[13.5px] text-ink-soft mt-3">
          {docs.length} document{docs.length === 1 ? "" : "s"} · {totalChunks} chunks in the knowledge base.{" "}
          <Link href={`/landscape/${slug}/ask`} className="text-teal" target="_blank">
            Test the assistant ↗
          </Link>
        </p>
      </header>

      <LandscapeUpload slug={slug} />

      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-2">Ingested documents</div>
        {docs.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/seeder-field.png"
              alt=""
              aria-hidden
              width={160}
              height={120}
              className="w-40 h-auto opacity-90 mb-3"
            />
            <p className="text-[13.5px] text-muted max-w-[34ch]">
              No documents yet. Upload a landscape report above to add it to the assistant.
            </p>
          </div>
        ) : (
          <ul className="rounded-[10px] border border-line divide-y divide-line list-none p-0 m-0">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[15px] text-ink truncate">{d.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted mt-0.5">
                    {d.type}{d.publication_year ? ` · ${d.publication_year}` : ""} · {d.chunk_count} chunks
                  </div>
                </div>
                <form action={removeDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-red-alert transition-colors"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
