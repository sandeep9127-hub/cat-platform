import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * Admin desk shell. Until Auth.js + role check is wired (batch 9), we
 * gate access by an env flag in production. Local dev (.env.local) opens
 * the admin to the developer; this is acceptable for the development phase.
 */
function isAdminAccessAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ADMIN_BYPASS === "1";
}

export const metadata = { title: "Admin · Transformation Hub" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminAccessAllowed()) notFound();

  return (
    <div className="min-h-dvh grid grid-rows-[auto_1fr] bg-paper relative z-10">
      <header className="sticky top-0 z-40 bg-cream border-b border-line">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-7 lg:px-10 py-3 flex items-center gap-6">
          <Link href="/admin" className="font-serif text-[18px] font-medium tracking-[-0.01em] text-deep-teal hover:text-teal">
            CAT <em className="text-teal italic font-normal">desk</em>
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[10.5px] uppercase tracking-[0.14em]">
            <Link href="/admin" className="text-ink-soft hover:text-teal">
              Queues
            </Link>
            <Link href="/admin/sources" className="text-ink-soft hover:text-teal">
              Sources
            </Link>
            <Link href="/admin/runs" className="text-ink-soft hover:text-teal">
              Runs
            </Link>
          </nav>
          <Link
            href="/"
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted hover:text-teal"
          >
            ← Back to public site
          </Link>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto px-5 sm:px-7 lg:px-10 py-8 w-full">{children}</main>
    </div>
  );
}
