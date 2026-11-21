import type { Metadata } from "next";
import { headers } from "next/headers";
import { FullInterventionTable } from "@/components/budget/FullInterventionTable";
import { getInterventions } from "@/lib/budget/table";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { getClientIp, rateLimit } from "@/lib/security/ratelimit";
import { logShareView, resolveShareToken } from "@/lib/share/links";

/**
 * Private share link for the full investment table. No sign-in: the random
 * token in the URL is the key. Never indexed or cached; the token never leaves
 * the page through a Referer header.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Investment table · CAT Transformation Hub",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-dvh bg-paper grid place-items-center px-6">
      <div className="max-w-[460px] text-center space-y-2">
        <h1 className="font-serif text-[24px] text-deep-teal">{title}</h1>
        <p className="text-[14px] text-muted">{body}</p>
      </div>
    </main>
  );
}

export default async function SharedTable({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const h = await headers();
  const ip = getClientIp({ headers: h } as unknown as Request);
  const limited = await rateLimit({ key: "share", ip, limit: 60, windowSec: 60 });
  if (!limited.ok) return <Message title="Too many requests" body="Please wait a minute and reload." />;

  const link = await resolveShareToken(token);
  if (!link) {
    return <Message title="This link isn't available" body="It may have expired or been revoked. Ask the person who shared it for a new one." />;
  }
  await logShareView(link.id, ip, h.get("user-agent"), "view");

  const all = link.scope === "all_landscapes_full_table";
  const rows = await getInterventions(all ? null : link.landscape_slug);
  const groups: Record<string, typeof rows> = {};
  for (const r of rows) (groups[r.landscape_slug] ??= []).push(r);
  const expires = new Date(link.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-dvh bg-paper px-4 sm:px-8 py-8 space-y-6">
      <header className="max-w-[1400px] space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">CAT Transformation Hub · shared investment table</p>
        <h1 className="font-serif text-[28px] text-deep-teal">
          {all ? "All landscapes" : LANDSCAPES[link.landscape_slug ?? ""]?.name ?? link.landscape_slug}: full investment table
        </h1>
        <p className="text-[13.5px] text-muted">
          Shared with {link.label}. Approved figures from the landscape investment plans. This link expires on {expires}.
        </p>
      </header>
      {Object.entries(groups).map(([slug, rs]) => (
        <section key={slug} className="space-y-2">
          {all && <h2 className="font-serif text-[20px] text-deep-teal">{LANDSCAPES[slug]?.name ?? slug}</h2>}
          <FullInterventionTable rows={rs} />
        </section>
      ))}
      <p className="text-[12px] text-muted">Amounts in Indian rupees. Phase 1 and Phase 2 follow each landscape investment plan.</p>
    </main>
  );
}
