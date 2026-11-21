import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { signOut } from "@/auth";
import { AdminNav } from "@/components/admin/AdminNav";

/**
 * Admin desk shell. Access is gated by Auth.js: requireAdmin() redirects
 * anyone who isn't a signed-in editor/admin to /signin (middleware enforces
 * the same on the edge). The login page lives at /signin, outside this layout,
 * so there's no redirect loop.
 */
export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const email = session.user?.email ?? "";
  const role = (session.user as { role?: string }).role ?? "";

  return (
    <div className="min-h-dvh grid grid-rows-[auto_1fr] bg-paper relative z-10">
      <header className="sticky top-0 z-40 bg-cream border-b border-line">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-7 lg:px-10 py-3 flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <Link href="/admin" className="order-1 font-serif text-[18px] font-medium tracking-[-0.01em] text-deep-teal hover:text-teal">
            CAT <em className="text-teal italic font-normal">desk</em>
          </Link>
          <AdminNav isAdmin={role === "admin"} />
          <div className="order-2 md:order-3 ml-auto flex items-center gap-4">
            <span className="hidden md:inline font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
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
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-teal"
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
