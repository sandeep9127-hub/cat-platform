import Link from "next/link";
import { auth } from "@/auth";
import { listShareLinks } from "@/lib/share/links";
import { getSnapshot, listSnapshots, loadPublished, summarize, type SnapshotSummary } from "@/lib/dashboards/landscapes-phase1/snapshot";
import { revokeLinkAction } from "./actions";
import { ShareLinkCreator } from "./ShareLinkCreator";
import { PublishSnapshot, RestoreSnapshot, UpdateFromSheet } from "./SnapshotButtons";

export const dynamic = "force-dynamic";
// Publishing re-embeds Ask's budget passages (a few hundred), which can take a minute.
export const maxDuration = 300;

const cr = (v: number | null | undefined) => (v == null ? "—" : `Rs ${(v / 1e7).toFixed(2)} cr`);
const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

function Compare({ before, after }: { before: SnapshotSummary | null; after: SnapshotSummary }) {
  const names = [...new Set([...(before?.perLandscape ?? []).map((x) => x.name), ...after.perLandscape.map((x) => x.name)])].sort();
  const diff = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? false : Math.round(a) !== Math.round(b));
  const cell = (a: string, b: string, changed: boolean) => (
    <td className={`py-1.5 pr-3 tabular-nums ${changed ? "text-deep-teal font-medium" : ""}`}>{a === b ? b : <>{a} → {b}</>}</td>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] min-w-[720px]">
        <thead>
          <tr className="text-left text-muted">
            <th className="py-1.5 pr-3 font-normal">Landscape</th>
            <th className="py-1.5 pr-3 font-normal">Lines</th>
            <th className="py-1.5 pr-3 font-normal">7-year total</th>
            <th className="py-1.5 pr-3 font-normal">Phase 1</th>
          </tr>
        </thead>
        <tbody>
          {names.map((n) => {
            const a = before?.perLandscape.find((x) => x.name === n);
            const b = after.perLandscape.find((x) => x.name === n);
            return (
              <tr key={n} className="border-t border-line">
                <td className="py-1.5 pr-3">{n}</td>
                {cell(String(a?.lines ?? "—"), String(b?.lines ?? "—"), (a?.lines ?? -1) !== (b?.lines ?? -1))}
                {cell(cr(a?.total), cr(b?.total), diff(a?.total, b?.total))}
                {cell(cr(a?.phase1), cr(b?.phase1), diff(a?.phase1, b?.phase1))}
              </tr>
            );
          })}
          <tr className="border-t-2 border-line font-medium">
            <td className="py-1.5 pr-3">All lines</td>
            {cell(String(before?.lines ?? "—"), String(after.lines), before?.lines !== after.lines)}
            {cell(cr(before?.totalCost), cr(after.totalCost), diff(before?.totalCost, after.totalCost))}
            {cell(cr(before?.phase1Lines), cr(after.phase1Lines), diff(before?.phase1Lines, after.phase1Lines))}
          </tr>
        </tbody>
      </table>
      <p className="text-[13px] mt-3">
        Dashboard tab, all landscapes: Phase 1 {cr(before?.allPhase1)} → <b>{cr(after.allPhase1)}</b>; net grant + returnable grant{" "}
        {before?.netGrant ?? "—"}% → <b>{after.netGrant ?? "—"}%</b>.
      </p>
    </div>
  );
}
export const metadata = { title: "Investment dashboard · Admin" };

const date = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–";

/**
 * The full investment figures now live in the "All landscapes, Phase 1"
 * dashboard. Editors open it from here and issue private, view-only share
 * links to it. (The older per-landscape table pages are left in place, unlinked.)
 */
export default async function BudgetTables({ searchParams }: { searchParams: Promise<{ draft?: string; published?: string; restored?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const [links, live, history, draft] = await Promise.all([
    listShareLinks(), loadPublished(), listSnapshots(15), sp.draft ? getSnapshot(sp.draft) : Promise.resolve(null),
  ]);
  const liveSummary = live ? summarize(live.data) : null;
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

      <section className="rounded-[10px] border border-line px-5 py-4 space-y-4">
        <h2 className="font-serif text-[19px] text-deep-teal">Figures on the Hub</h2>
        <p className="text-[13.5px] text-muted max-w-[760px]">
          The dashboard, every landscape&apos;s Budget and Insights tabs, the landscape pages and Ask all use the published copy of the
          All-Landscape Phase 1 sheet. The sheet is read only when an admin updates it here.
        </p>
        <p className="text-[13.5px]">
          {live ? (
            <>Live: <b>{live.meta.line_count} lines</b>, read {when(live.meta.fetched_at)}{live.meta.fetched_by_email ? ` by ${live.meta.fetched_by_email}` : ""},
              published {when(live.meta.published_at)}{live.meta.published_by_email ? ` by ${live.meta.published_by_email}` : ""}. 7-year total {cr(liveSummary?.totalCost)}, Phase 1 {cr(liveSummary?.allPhase1)}.</>
          ) : (
            <b>Nothing published yet: the dashboard and Budget tabs show no figures until an admin publishes the sheet.</b>
          )}
        </p>
        {sp.published && <p className="text-[13.5px] text-deep-teal font-medium" role="status">Published. The site and Ask now use the new figures.</p>}
        {sp.restored && <p className="text-[13.5px] text-deep-teal font-medium" role="status">Restored. The site and Ask now use that earlier copy.</p>}
        {isAdmin ? <UpdateFromSheet /> : <p className="text-[13px] text-muted">Only admins can update the figures.</p>}

        {draft && draft.meta.status === "draft" && (
          <div className="rounded-[8px] border border-teal/30 bg-teal/5 px-4 py-3 space-y-3">
            <h3 className="font-serif text-[17px] text-deep-teal">Check the update before publishing</h3>
            <p className="text-[13px] text-muted">Read from the sheet {when(draft.meta.fetched_at)}. Changed figures are highlighted (before → after).</p>
            <Compare before={liveSummary} after={summarize(draft.data)} />
            {isAdmin && <PublishSnapshot id={draft.meta.id} />}
          </div>
        )}

        {history.length > 0 && (
          <details className="text-[13px]">
            <summary className="cursor-pointer text-muted">Earlier copies ({history.length})</summary>
            <table className="w-full mt-2 min-w-[600px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1.5 pr-3 font-normal">Read from the sheet</th>
                  <th className="py-1.5 pr-3 font-normal">Lines</th>
                  <th className="py-1.5 pr-3 font-normal">Status</th>
                  <th className="py-1.5 font-normal" />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-line">
                    <td className="py-1.5 pr-3">{when(h.fetched_at)}{h.fetched_by_email ? <span className="text-muted"> · {h.fetched_by_email}</span> : null}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{h.line_count}</td>
                    <td className="py-1.5 pr-3">{h.status === "published" ? "Live" : h.status === "superseded" ? `Was live from ${when(h.published_at)}` : "Not published"}</td>
                    <td className="py-1.5 text-right">
                      {isAdmin && h.status === "superseded" && <RestoreSnapshot id={h.id} />}
                      {isAdmin && h.status === "draft" && <Link className="font-mono text-[11px] uppercase tracking-[0.1em] text-teal" href={`/admin/budget-tables?draft=${h.id}`}>Review</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </section>

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
