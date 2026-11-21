import { LANDSCAPES } from "@/lib/data/landscapes";
import { RequestAccessForm } from "./RequestAccessForm";

export const metadata = {
  title: "Request access to the full investment tables",
  description: "Ask CAT for view-only access to a landscape's full investment table.",
};

export default async function RequestAccess({ searchParams }: { searchParams: Promise<{ landscape?: string }> }) {
  const sp = await searchParams;
  const initial = sp.landscape && LANDSCAPES[sp.landscape] ? sp.landscape : "all";
  const landscapes = Object.entries(LANDSCAPES).map(([slug, l]) => ({ slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <main className="max-w-[880px] mx-auto px-5 sm:px-8 py-12 space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Investment plans</p>
        <h1 className="font-serif text-[34px] leading-tight text-deep-teal">Request access to the full investment tables</h1>
        <p className="text-[16px] text-ink-soft max-w-[640px]">
          Each landscape&apos;s Budget page shows the summary. The full table, with every intervention, unit cost, phase
          and source of funds, is shared on request. Tell us who you are and how you&apos;ll use it. If the CAT team
          approves, you&apos;ll get a personal, view-only link by email.
        </p>
      </header>
      <RequestAccessForm landscapes={landscapes} initial={initial} />
    </main>
  );
}
