import type { Metadata } from "next";
import { resolveApprovalToken } from "@/lib/access/requests";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { DecideForm } from "./DecideForm";

/**
 * Confirmation page behind the one-click links in approver emails. Opening the
 * link (GET) changes nothing, so email scanners that pre-open links can't approve
 * anything; the decision is the button press (a Server Action).
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Access request · CAT Transformation Hub",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function Decide({ params, searchParams }: {
  params: Promise<{ token: string }>; searchParams: Promise<{ do?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const info = await resolveApprovalToken(token);
  if (!info) {
    return (
      <main className="min-h-dvh bg-paper grid place-items-center px-6">
        <div className="max-w-[460px] text-center space-y-2">
          <h1 className="font-serif text-[24px] text-deep-teal">This link isn&apos;t active</h1>
          <p className="text-[14px] text-muted">It has expired, was already used, or someone has already decided this request. Check Access requests in the Hub admin.</p>
        </div>
      </main>
    );
  }
  const r = info.request;
  const scope = r.landscape_slug ? LANDSCAPES[r.landscape_slug]?.name ?? r.landscape_slug : "All landscapes";
  return (
    <main className="min-h-dvh bg-paper px-5 py-12">
      <div className="max-w-[640px] mx-auto space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">CAT Transformation Hub · access request</p>
        <h1 className="font-serif text-[28px] leading-tight text-deep-teal">{r.name} asks to view the full investment table</h1>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[14.5px]">
          <dt className="text-muted">Organisation</dt><dd>{r.organisation}{r.role ? `, ${r.role}` : ""}</dd>
          <dt className="text-muted">Email</dt><dd>{r.email}</dd>
          <dt className="text-muted">Landscape</dt><dd>{scope}</dd>
          <dt className="text-muted">Asked on</dt><dd>{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
          <dt className="text-muted">Purpose</dt><dd className="whitespace-pre-line">{r.purpose}</dd>
        </dl>
        <p className="text-[13.5px] text-muted">
          Approving emails {r.name} a personal, view-only link to the table. You&apos;re deciding as {info.approverEmail}.
        </p>
        <DecideForm token={token} initial={sp.do === "decline" ? "decline" : "approve"} />
      </div>
    </main>
  );
}
