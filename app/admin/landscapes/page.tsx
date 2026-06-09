import Link from "next/link";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { listLandscapeDocuments } from "@/lib/landscape/ingest";

export const dynamic = "force-dynamic";

export default async function AdminLandscapesPage() {
  const docs = await listLandscapeDocuments();
  const bySlug = new Map<string, { count: number; chunks: number }>();
  for (const d of docs) {
    const cur = bySlug.get(d.landscape_slug) ?? { count: 0, chunks: 0 };
    cur.count += 1;
    cur.chunks += d.chunk_count;
    bySlug.set(d.landscape_slug, cur);
  }

  const landscapes = Object.values(LANDSCAPES).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <header>
        <span className="mono-label">Knowledge base</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Landscapes
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[64ch] font-light">
          Upload a landscape report and it&apos;s chunked, embedded, and added to the assistant&apos;s
          knowledge — no code, no redeploy. Open a landscape to manage its documents.
        </p>
      </header>

      <div className="rounded-[10px] border border-line overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-cream text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-medium">Landscape</th>
              <th className="px-4 py-3 font-medium">District · State</th>
              <th className="px-4 py-3 font-medium text-right">Documents</th>
              <th className="px-4 py-3 font-medium text-right">Chunks</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {landscapes.map((l) => {
              const s = bySlug.get(l.slug);
              return (
                <tr key={l.slug} className="border-t border-line hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/landscapes/${l.slug}`} className="font-serif text-[16px] text-deep-teal hover:text-teal no-underline">
                      {l.name}
                    </Link>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted mt-0.5">{l.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{l.district} · {l.region}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s?.count ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s?.chunks ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/landscapes/${l.slug}`} className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal no-underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
