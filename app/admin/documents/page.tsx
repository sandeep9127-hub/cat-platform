import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { UploadForm } from "./UploadForm";

export const dynamic = "force-dynamic";
// Server Actions on this page process uploads; long reports need the time.
export const maxDuration = 300;
export const metadata = { title: "Documents · Admin" };

type Doc = { id: string; title: string; landscape_slug: string | null; source: string; label: string | null; pages: number | null; chunks: number; updated_at: string };
type Job = { id: string; status: string; title: string; error: string | null; message: string | null; created_at: string };

const date = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function Documents() {
  const [docs, jobs] = await Promise.all([
    db.execute(sql`
      SELECT d.id, d.title, d.landscape_slug, d.source, v.label, v.page_count AS pages, d.updated_at,
             (SELECT count(*)::int FROM "cat".chunks c WHERE c.version_id = v.id AND c.is_current) AS chunks
      FROM "cat".documents d LEFT JOIN "cat".document_versions v ON v.id = d.current_version_id
      ORDER BY d.source, d.landscape_slug NULLS LAST, d.title`).then((r) => (r as unknown as { rows: Doc[] }).rows),
    db.execute(sql`
      SELECT id, status, payload->>'title' AS title, error, result->>'message' AS message, created_at
      FROM "cat".jobs WHERE kind = 'ingest_upload' AND status <> 'cancelled'
      ORDER BY created_at DESC LIMIT 15`).then((r) => (r as unknown as { rows: Job[] }).rows),
  ]);
  const landscapes = Object.entries(LANDSCAPES).map(([slug, l]) => ({ slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Documents</h1>
        <p className="text-[14px] text-muted max-w-[760px] mt-1">
          Everything Ask can cite. Landscape reports come from the Drive Final folder and update nightly; other documents are added here.
        </p>
      </header>

      <UploadForm landscapes={landscapes} />

      {jobs.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif text-[19px] text-deep-teal">Recent uploads</h2>
          <ul className="text-[13px] space-y-1">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap gap-x-3">
                <span className={j.status === "done" ? "text-teal" : j.status === "failed" ? "text-red-alert" : "text-amber"}>
                  {j.status === "done" ? "Published" : j.status === "failed" ? "Failed" : j.status === "running" ? "Processing" : "Waiting for tonight's sync"}
                </span>
                <span>{j.title}</span>
                <span className="text-muted">{date(j.created_at)}</span>
                {j.message && <span className="text-muted">{j.message}</span>}
                {j.status === "failed" && j.error && <span className="text-red-alert">{j.error}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-serif text-[19px] text-deep-teal">In the library ({docs.length})</h2>
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-muted">
            <th className="font-normal py-1.5 pr-3">Document</th><th className="font-normal pr-3">Landscape</th>
            <th className="font-normal pr-3">Source</th><th className="font-normal pr-3">Version</th>
            <th className="font-normal pr-3 text-right">Pages</th><th className="font-normal text-right">Passages</th>
          </tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-line">
                <td className="py-1.5 pr-3">{d.title}</td>
                <td className="py-1.5 pr-3">{d.landscape_slug ? LANDSCAPES[d.landscape_slug]?.name ?? d.landscape_slug : "–"}</td>
                <td className="py-1.5 pr-3 text-muted">{d.source === "drive" ? "Drive (nightly)" : "Uploaded"}</td>
                <td className="py-1.5 pr-3 text-muted">{d.label ?? "–"}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{d.pages ?? "–"}</td>
                <td className="py-1.5 text-right tabular-nums">{d.chunks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
