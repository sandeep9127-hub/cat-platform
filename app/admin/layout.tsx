import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { signOut } from "@/auth";

/**
 * Admin desk shell. Access is gated by Auth.js: requireAdmin() redirects
 * anyone who isn't a signed-in editor/admin to /signin (middleware enforces
 * the same on the edge). The login page lives at /signin, outside this layout,
 * so there's no redirect loop.
 */
export const metadata = { title: "Admin · Transformation Hub" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const email = session.user?.email ?? "";
  const role = (session.user as { role?: string }).role ?? "";

  return (
    <div className="min-h-dvh grid grid-rows-[auto_1fr] bg-paper relative z-10">
      <header className="sticky top-0 z-40 bg-cream border-b border-line">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-7 lg:px-10 py-3 flex items-center gap-6">
          <Link href="/admin" className="font-serif text-[18px] font-medium tracking-[-0.01em] text-deep-teal hover:text-teal">
            CAT <em className="text-teal italic font-normal">desk</em>
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[10.5px] uppercase tracking-[0.14em]">
            <Link href="/admin" className="text-ink-soft hover:text-teal">Queues</Link>
            <Link href="/admin/sources" className="text-ink-soft hover:text-teal">Sources</Link>
            <Link href="/admin/runs" className="text-ink-soft hover:text-teal">Runs</Link>
            <Link href="/admin/audit" className="text-ink-soft hover:text-teal">Audit</Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {email} · {role}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-teal"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto px-5 sm:px-7 lg:px-10 py-8 w-full">{children}</main>
    </div>
  );
}
