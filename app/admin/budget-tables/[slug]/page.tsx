import Link from "next/link";
import { notFound } from "next/navigation";
import { InteractiveBudgetTable } from "@/components/budget/InteractiveBudgetTable";
import { getInterventions, getRecentlyChanged } from "@/lib/budget/table";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { listShareLinks } from "@/lib/share/links";
import { revokeLinkAction } from "../actions";
import { ShareLinkCreator } from "../ShareLinkCreator";

export const dynamic = "force-dynamic";

const date = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–";

export default async function BudgetTable({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = slug === "all";
  if (!all && !Object.hasOwn(LANDSCAPES, slug)) notFound();
  const name = all ? "All landscapes" : LANDSCAPES[slug].name;
  const [rows, links, changed] = await Promise.all([getInterventions(all ? null : slug), listShareLinks(all ? null : slug), getRecentlyChanged(all ? null : slug)]);
  const now = Date.now();

  return (
    <div className="space-y-7">
      <header>
        <Link href="/admin/budget-tables" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-teal">← Budget tables</Link>
        <h1 className="font-serif text-[28px] text-deep-teal mt-1">{name}: full investment table</h1>
      </header>

      <section className="rounded-[10px] border border-line bg-cream/40 px-5 py-4 space-y-4">
        <h2 className="font-serif text-[19px] text-deep-teal">Private share links</h2>
        <p className="text-[13.5px] text-muted max-w-[720px]">
          Anyone with the link can view this {all ? "set of tables" : "table"} until it expires or you revoke it. Links are view-only (no download), and every
          view is logged. Links never show pending (unapproved) changes.
        </p>
        <ShareLinkCreator landscape={slug} />
        {links.length > 0 && (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1.5 pr-3 font-normal">For</th>
                <th className="py-1.5 pr-3 font-normal">Covers</th>
                <th className="py-1.5 pr-3 font-normal">Created</th>
                <th className="py-1.5 pr-3 font-normal">Expires</th>
                <th className="py-1.5 pr-3 font-normal">Views</th>
                <th className="py-1.5 pr-3 font-normal">Last viewed</th>
                <th className="py-1.5 font-normal" />
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const live = !l.revoked_at && new Date(l.expires_at).getTime() > now;
                return (
                  <tr key={l.id} className={`border-t border-line ${live ? "" : "text-muted"}`}>
                    <td className="py-1.5 pr-3">
                      {l.label}
                    </td>
                    <td className="py-1.5 pr-3">{l.scope === "all_landscapes_full_table" ? "All landscapes" : LANDSCAPES[l.landscape_slug ?? ""]?.name ?? l.landscape_slug}</td>
                    <td className="py-1.5 pr-3">{date(l.created_at)}{l.created_by_email ? <span className="text-muted"> · {l.created_by_email}</span> : null}</td>
                    <td className="py-1.5 pr-3">{l.revoked_at ? `Revoked ${date(l.revoked_at)}` : date(l.expires_at)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{l.views}</td>
                    <td className="py-1.5 pr-3">{date(l.last_viewed_at)}</td>
                    <td className="py-1.5 text-right">
                      {live && (
                        <form action={revokeLinkAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="landscape" value={slug} />
                          <button className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-red-alert">Revoke</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <InteractiveBudgetTable rows={rows} multi={all} landscapeNames={landscapeNames()} changed={changed} />
    </div>
  );
}

function landscapeNames(): Record<string, string> {
  return Object.fromEntries(Object.entries(LANDSCAPES).map(([k, v]) => [k, v.name]));
}
