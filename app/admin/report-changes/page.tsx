import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report changes · Admin" };

type Diff = {
  id: string; landscape_slug: string | null; title: string; from_label: string | null; to_label: string | null;
  summary_md: string; changes: { area?: string; section?: string; before?: string; after?: string }[]; created_at: string;
};

/** Minimal, safe rendering of the stored summary: "- " bullets and **bold**, as text nodes only. */
function Summary({ md }: { md: string }) {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  const bold = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-medium text-ink">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);
  return (
    <ul className="space-y-1.5 text-[14px] text-ink-soft list-disc pl-5">
      {lines.map((l, i) => <li key={i}>{bold(l.replace(/^[-*]\s+/, ""))}</li>)}
    </ul>
  );
}

export default async function ReportChanges() {
  const diffs = (await db.execute(sql`
    SELECT vd.id, d.landscape_slug, d.title, vd.from_label, v.label AS to_label, vd.summary_md, vd.changes, vd.created_at
    FROM "cat".version_diffs vd
    JOIN "cat".documents d ON d.id = vd.document_id
    LEFT JOIN "cat".document_versions v ON v.id = vd.to_version_id
    ORDER BY vd.created_at DESC
    LIMIT 100`) as unknown as { rows: Diff[] }).rows;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Report changes</h1>
        <p className="text-[14px] text-muted max-w-[760px] mt-1">
          When a landscape report is replaced in the Drive Final folder, the Hub compares the new version with the old one,
          keeps this summary, and removes the old version. Newest first.
        </p>
      </header>
      {diffs.length === 0 && <p className="text-[14px] text-muted">No report has changed yet.</p>}
      {diffs.map((d) => (
        <details key={d.id} className="rounded-[10px] border border-line bg-paper px-5 py-4" open={diffs.length <= 4}>
          <summary className="cursor-pointer flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-serif text-[19px] text-deep-teal">{d.landscape_slug ? LANDSCAPES[d.landscape_slug]?.name ?? d.landscape_slug : d.title}</span>
            <span className="text-[13px] text-muted">{d.from_label ?? "earlier version"} → {d.to_label ?? "current"}</span>
            <span className="ml-auto font-mono text-[11px] text-muted">
              {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {d.changes.length} changes
            </span>
          </summary>
          <div className="mt-3 space-y-4">
            <Summary md={d.summary_md} />
            {d.changes.length > 0 && (
              <table className="w-full text-[12.5px]">
                <thead><tr className="text-left text-muted">
                  <th className="font-normal py-1 pr-3">Section</th><th className="font-normal pr-3">Before</th><th className="font-normal">After</th>
                </tr></thead>
                <tbody>
                  {d.changes.map((c, i) => (
                    <tr key={i} className="border-t border-line align-top">
                      <td className="py-1.5 pr-3 text-muted min-w-[160px]">{c.section ?? c.area ?? "–"}</td>
                      <td className="py-1.5 pr-3 text-ink-soft">{c.before ?? "–"}</td>
                      <td className="py-1.5 text-ink">{c.after ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
