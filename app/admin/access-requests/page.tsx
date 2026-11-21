import { listAccessRequests } from "@/lib/access/requests";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { PendingRequest, RecordEmailRequest } from "./RequestCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Access requests · Admin" };

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–");

export default async function AccessRequests() {
  const all = await listAccessRequests();
  const pending = all.filter((r) => r.status === "pending");
  const decided = all.filter((r) => r.status !== "pending");
  const landscapes = Object.entries(LANDSCAPES).map(([slug, l]) => ({ slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name));
  const now = Date.now();

  return (
    <div className="space-y-7">
      <header className="space-y-1">
        <h1 className="font-serif text-[28px] text-deep-teal">Access requests</h1>
        <p className="text-[14px] text-muted max-w-[760px]">
          Requests to view the full investment tables, from the public form at /request-access or recorded from email.
          Approving creates a personal, view-only link that expires, and emails it to the person. Every view is logged.
        </p>
      </header>

      <RecordEmailRequest landscapes={landscapes} />

      <section className="space-y-3">
        <h2 className="font-serif text-[20px] text-deep-teal">Waiting ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-[14px] text-muted">No requests waiting.</p> : (
          <ul className="space-y-3">{pending.map((r) => <PendingRequest key={r.id} r={r} landscapes={landscapes} />)}</ul>
        )}
      </section>

      {decided.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif text-[20px] text-deep-teal">Decided</h2>
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-muted">
              <th className="font-normal py-1.5 pr-3">Person</th><th className="font-normal pr-3">Landscape</th>
              <th className="font-normal pr-3">Decision</th><th className="font-normal pr-3">Link</th><th className="font-normal">Views</th>
            </tr></thead>
            <tbody>
              {decided.map((r) => {
                const live = r.share_link_id && !r.link_revoked_at && r.link_expires_at && new Date(r.link_expires_at).getTime() > now;
                return (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3">{r.name}<span className="text-muted"> · {r.organisation} · {r.email}</span></td>
                    <td className="py-1.5 pr-3">{r.landscape_slug ? LANDSCAPES[r.landscape_slug]?.name ?? r.landscape_slug : "All"}</td>
                    <td className="py-1.5 pr-3">
                      {r.status === "approved" ? "Approved" : "Declined"} {date(r.decided_at)}
                      {r.decided_by_email ? <span className="text-muted"> · {r.decided_by_email}</span> : null}
                      {r.decision_note ? <span className="block text-muted">{r.decision_note}</span> : null}
                    </td>
                    <td className="py-1.5 pr-3">
                      {r.status !== "approved" ? "–" : r.link_revoked_at ? "Revoked" : live ? `Until ${date(r.link_expires_at)}` : "Expired"}
                      {r.status === "approved" && !r.emailed_at ? <span className="block text-amber">not emailed</span> : null}
                    </td>
                    <td className="py-1.5 tabular-nums">{r.link_views ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[12.5px] text-muted">To revoke a link, open the landscape under Budget tables.</p>
        </section>
      )}
    </div>
  );
}
