"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

/**
 * Admin desk navigation, grouped so the desk reads as five places instead of
 * one long scrolling row: Inbox, then Content, Budgets, Directory and System.
 *
 * From md up, each group is a small menu. Below md, one "Menu" button opens
 * every group as a list. Hrefs must stay as they are: other branches link to
 * them, and the merge check compares this list with release/hub-v2.
 */
type Item = { href: string; label: string; adminOnly?: boolean };
type Group = { label: string; items: Item[] };

const INBOX: Item = { href: "/admin/inbox", label: "Inbox" };

const GROUPS: Group[] = [
  {
    label: "Content",
    items: [
      { href: "/admin/factsheets", label: "Fact sheets" },
      { href: "/admin/documents", label: "Documents" },
      { href: "/admin/briefs", label: "Briefs" },
      { href: "/admin/report-changes", label: "Report changes" },
      { href: "/admin/landscapes", label: "Landscapes" },
      { href: "/admin/sources", label: "Sources" },
    ],
  },
  {
    label: "Budgets",
    items: [
      { href: "/admin/budget-changes", label: "Budget changes" },
      { href: "/admin/budget-tables", label: "Budget tables" },
      { href: "/admin/access-requests", label: "Access requests" },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/admin/organizations", label: "Organisations" },
      { href: "/admin/submissions", label: "Submissions" },
      { href: "/admin/candidates", label: "Discovery" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/quality", label: "Quality" },
      { href: "/admin/audit", label: "Audit" },
      { href: "/admin/team", label: "Team", adminOnly: true },
      { href: "/admin/account", label: "Account" },
    ],
  },
];

const isOn = (path: string, href: string) => path === href || path.startsWith(href + "/");

const LINK = "font-mono text-[11px] uppercase tracking-[0.14em]";

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState<string | null>(null); // desktop group menu
  const [sheet, setSheet] = useState(false); // mobile menu
  const ref = useRef<HTMLElement>(null);

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || isAdmin),
  }));

  // Close menus on navigation, outside click and Escape.
  useEffect(() => {
    setOpen(null);
    setSheet(false);
  }, [path]);
  useEffect(() => {
    if (!open && !sheet) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(null);
        setSheet(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setSheet(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, sheet]);

  const linkCls = (on: boolean) =>
    `${LINK} ${on ? "text-deep-teal font-semibold" : "text-ink-soft hover:text-teal"}`;

  return (
    <nav ref={ref} aria-label="Admin" className="order-3 md:order-2 w-full md:w-auto relative">
      {/* md and up: Inbox plus four group menus */}
      <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0">
        <li>
          <Link
            href={INBOX.href}
            aria-current={isOn(path, INBOX.href) ? "page" : undefined}
            className={`${linkCls(isOn(path, INBOX.href))} inline-flex items-center min-h-10 px-2.5`}
          >
            {INBOX.label}
          </Link>
        </li>
        {groups.map((g) => {
          const here = g.items.some((i) => isOn(path, i.href));
          const expanded = open === g.label;
          const id = `admin-menu-${g.label.toLowerCase()}`;
          return (
            <li key={g.label} className="relative">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={id}
                onClick={() => setOpen(expanded ? null : g.label)}
                className={`${linkCls(here)} inline-flex items-center gap-1 min-h-10 px-2.5 rounded-tight ${
                  expanded ? "bg-paper" : ""
                }`}
              >
                {g.label}
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  aria-hidden
                  className={`transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded && (
                <ul
                  id={id}
                  className="absolute left-0 top-full mt-1 min-w-[200px] list-none m-0 p-1.5 bg-paper border border-line rounded-card shadow-[0_8px_24px_-12px_rgba(26,38,37,0.25)] z-50"
                >
                  {g.items.map((i) => {
                    const on = isOn(path, i.href);
                    return (
                      <li key={i.href}>
                        <Link
                          href={i.href}
                          aria-current={on ? "page" : undefined}
                          className={`flex items-center min-h-10 px-3 rounded-tight text-[14px] ${
                            on ? "bg-teal/10 text-deep-teal font-medium" : "text-ink-soft hover:bg-cream hover:text-teal"
                          }`}
                        >
                          {i.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Below md: Inbox plus one menu with every group */}
      <div className="md:hidden flex items-center gap-2">
        <Link
          href={INBOX.href}
          aria-current={isOn(path, INBOX.href) ? "page" : undefined}
          className={`${linkCls(isOn(path, INBOX.href))} inline-flex items-center min-h-11 pr-3`}
        >
          {INBOX.label}
        </Link>
        <button
          type="button"
          aria-expanded={sheet}
          aria-controls="admin-menu-all"
          onClick={() => setSheet((s) => !s)}
          className={`${LINK} text-ink-soft inline-flex items-center gap-1.5 min-h-11 px-3 border border-line rounded-card bg-paper`}
        >
          {sheet ? <X size={14} strokeWidth={2} aria-hidden /> : <Menu size={14} strokeWidth={2} aria-hidden />}
          {groups.flatMap((g) => g.items).find((i) => isOn(path, i.href))?.label ?? "Menu"}
        </button>
      </div>
      {sheet && (
        <div
          id="admin-menu-all"
          className="md:hidden mt-2 grid grid-cols-2 gap-x-4 gap-y-4 bg-paper border border-line rounded-card p-4"
        >
          {groups.map((g) => (
            <div key={g.label}>
              <p className={`${LINK} text-muted m-0 mb-1`}>{g.label}</p>
              <ul className="list-none m-0 p-0">
                {g.items.map((i) => {
                  const on = isOn(path, i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={on ? "page" : undefined}
                        className={`flex items-center min-h-10 text-[14px] ${
                          on ? "text-deep-teal font-semibold" : "text-ink-soft hover:text-teal"
                        }`}
                      >
                        {i.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
