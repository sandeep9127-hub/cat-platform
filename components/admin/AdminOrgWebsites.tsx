"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";

type Org = { id: string; name: string; website: string | null; states: string[] };

export function AdminOrgWebsites({ orgs }: { orgs: Org[] }) {
  const [rows, setRows] = useState<Org[]>(orgs);
  const [filter, setFilter] = useState<"all" | "has" | "missing">("all");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<Record<string, "saving" | "saved" | undefined>>({});

  const withSite = rows.filter((o) => o.website).length;

  const shown = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((o) => {
      if (filter === "has" && !o.website) return false;
      if (filter === "missing" && o.website) return false;
      if (ql && !o.name.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [rows, filter, q]);

  function setLocal(id: string, website: string) {
    setRows((r) => r.map((o) => (o.id === id ? { ...o, website } : o)));
  }

  async function save(id: string, website: string) {
    setSaving((s) => ({ ...s, [id]: "saving" }));
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, website }),
      });
      const data = await res.json();
      if (res.ok) {
        setRows((r) => r.map((o) => (o.id === id ? { ...o, website: data.website } : o)));
        setSaving((s) => ({ ...s, [id]: "saved" }));
        setTimeout(() => setSaving((s) => ({ ...s, [id]: undefined })), 1400);
      } else {
        setSaving((s) => ({ ...s, [id]: undefined }));
      }
    } catch {
      setSaving((s) => ({ ...s, [id]: undefined }));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search organisations…"
          className="px-3 py-2 border border-line bg-paper text-[14px] min-w-[240px] focus:outline-none focus:border-rule"
        />
        <div className="inline-flex border border-line">
          {(["all", "has", "missing"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] ${
                filter === f ? "bg-deep-teal text-paper" : "text-ink-soft hover:bg-cream"
              }`}
            >
              {f === "all" ? "All" : f === "has" ? "Has site" : "Missing"}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted ml-auto">
          {withSite}/{rows.length} have a website
        </span>
      </div>

      <div className="border border-line">
        {shown.map((o, i) => (
          <div
            key={o.id}
            className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-2 sm:gap-4 items-center px-4 py-3 ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-ink leading-tight truncate">{o.name}</div>
              {o.states.length > 0 && (
                <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted mt-0.5 truncate">
                  {o.states.slice(0, 3).join(", ")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={o.website ?? ""}
                onChange={(e) => setLocal(o.id, e.target.value)}
                onBlur={(e) => save(o.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder="No website — paste one to add"
                inputMode="url"
                className="w-full px-2.5 py-1.5 border border-line bg-paper text-[13px] text-ink focus:outline-none focus:border-rule"
              />
              {o.website && (
                <a
                  href={o.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-teal hover:text-deep-teal"
                  title="Open"
                >
                  <ExternalLink size={14} strokeWidth={1.9} />
                </a>
              )}
            </div>
            <div className="w-[64px] text-right">
              {saving[o.id] === "saving" ? (
                <Loader2 size={14} className="animate-spin text-muted inline" />
              ) : saving[o.id] === "saved" ? (
                <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-teal">
                  <Check size={12} strokeWidth={2.2} /> Saved
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            No organisations match.
          </div>
        )}
      </div>
    </div>
  );
}
