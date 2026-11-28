import Link from "next/link";
import { listShareLinks } from "@/lib/share/links";
import { revokeLinkAction } from "./actions";
import { ShareLinkCreator } from "./ShareLinkCreator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investment dashboard · Admin" };

const date = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–";

/**
 * The full investment figures now live in the "All landscapes, Phase 1"
 * dashboard. Editors open it from here and issue private, view-only share
 * links to it. (The older per-landscape table pages are left in place, unlinked.)
 */
export default async function BudgetTables() {
  const links = await listShareLinks();
  const now = Date.now();
  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <h1 className="font-serif text-[28px] text-deep-teal">Investment dashboard</h1>
        <p className="text-[14px] text-muted max-w-[760px]">
          All ten landscapes&apos; Phase 1 investment plans, live from the All-Landscape Phase 1 sheet: overview, costs, lenses, landscape
          profiles, comparisons, every cost line and the Studio. It opens for signed-in editors, and for anyone you send a private share link.
        </p>
        <Link href="/dashboards/landscapes-phase-1"
          className="inline-flex rounded-[6px] bg-teal text-paper px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-deep-teal">
          Open the dashboard
        </Link>
      </header>

      <section className="rounded-[10px] border border-line bg-cream/40 px-5 py-4 space-y-4">
        <h2 className="font-serif text-[19px] text-deep-teal">Private share links</h2>
        <p className="text-[13.5px] text-muted max-w-[720px]">
          A link opens the whole dashboard (all landscapes, all tabs) until it expires or you revoke it. Links are view-only, with no download,
          and every view is logged. Approved access requests send the same kind of link automatically.
        </p>
        <ShareLinkCreator landscape="all" />
        {links.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1.5 pr-3 font-normal">For</th>
                  <th className="py-1.5 pr-3 font-normal">Requested for</th>
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
                      <td className="py-1.5 pr-3">{l.label}</td>
                      <td className="py-1.5 pr-3">{l.scope === "all_landscapes_full_table" ? "All landscapes" : l.landscape_slug}</td>
                      <td className="py-1.5 pr-3">{date(l.created_at)}{l.created_by_email ? <span className="text-muted"> · {l.created_by_email}</span> : null}</td>
                      <td className="py-1.5 pr-3">{l.revoked_at ? `Revoked ${date(l.revoked_at)}` : date(l.expires_at)}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{l.views}</td>
                      <td className="py-1.5 pr-3">{date(l.last_viewed_at)}</td>
                      <td className="py-1.5 text-right">
                        {live && (
                          <form action={revokeLinkAction}>
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="landscape" value="all" />
                            <button className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-red-alert">Revoke</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
