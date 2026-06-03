import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { signOut } from "@/auth";

export const metadata = { title: "Admin · Transformation Hub" };
export const dynamic = "force-dynamic";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/review", label: "Review queue" },
  { href: "/admin/landscapes", label: "Landscapes" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const email = session.user?.email ?? "";
  const role = (session.user as { role?: string }).role ?? "";

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--cream)]">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-7 py-3 flex items-center gap-6">
          <Link href="/admin" className="font-[var(--font-fraunces)] font-semibold text-[17px] tracking-[-0.01em] no-underline text-[var(--ink)]">
            Transformation Hub <span className="text-[var(--teal)]">Admin</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-[6px] text-[13px] text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--teal)] transition-colors no-underline"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {email} · {role}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="sm:hidden flex items-center gap-1 px-5 pb-3 overflow-x-auto">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap px-3 py-1.5 rounded-[6px] text-[13px] text-[var(--ink-soft)] no-underline">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-[1180px] mx-auto px-5 sm:px-7 py-8">{children}</main>
    </div>
  );
}
