import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { hashPassword, verifyPassword, passwordProblem } from "@/lib/auth/password";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function changePassword(formData: FormData) {
  "use server";
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/signin");

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (next !== confirm) redirect("/admin/account?error=match");
  const weak = passwordProblem(next);
  if (weak) redirect("/admin/account?error=weak");

  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, uid!)).limit(1);
  if (!u) redirect("/signin");
  // If a password already exists, require the current one. First-time set skips this.
  if (u.passwordHash && !verifyPassword(current, u.passwordHash)) {
    redirect("/admin/account?error=current");
  }

  await db.update(schema.users).set({ passwordHash: hashPassword(next) }).where(eq(schema.users.id, uid!));
  await writeAudit({
    actorUserId: uid ?? null,
    actorEmail: session?.user?.email ?? null,
    action: "account.password_changed",
    entityType: "user",
    entityId: uid ?? null,
  });
  redirect("/admin/account?ok=1");
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const email = session?.user?.email ?? "";
  const uid = (session?.user as { id?: string } | undefined)?.id;
  const [u] = uid
    ? await db.select().from(schema.users).where(eq(schema.users.id, uid)).limit(1)
    : [];
  const hasPassword = Boolean(u?.passwordHash);

  const input =
    "w-full px-4 py-2.5 rounded-[8px] bg-paper border border-line text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-teal transition-colors";

  return (
    <div className="space-y-6 max-w-[440px]">
      <header>
        <span className="mono-label">Account</span>
        <h1 className="font-serif text-[32px] sm:text-[40px] font-normal tracking-[-0.02em] text-ink mt-2">
          {hasPassword ? "Change password" : "Set a password"}
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-2">{email}</p>
      </header>

      {sp.ok ? (
        <div className="rounded-[8px] border border-teal/30 bg-teal/10 text-deep-teal px-4 py-3 text-[13.5px]">
          Password updated. Use it next time you sign in.
        </div>
      ) : null}
      {sp.error ? (
        <div className="rounded-[8px] border border-red-alert/30 bg-red-alert/10 text-red-alert px-4 py-3 text-[13.5px]">
          {sp.error === "match"
            ? "The two passwords do not match."
            : sp.error === "weak"
              ? "Password must be at least 8 characters."
              : "Your current password is wrong."}
        </div>
      ) : null}

      <form action={changePassword} className="flex flex-col gap-3">
        {hasPassword ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Current password</span>
            <input type="password" name="current" autoComplete="current-password" className={input} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">New password</span>
          <input type="password" name="next" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Confirm new password</span>
          <input type="password" name="confirm" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        <button className="mt-1 w-fit rounded-full bg-deep-teal text-paper px-6 py-2.5 text-[13px] font-medium hover:bg-teal active:scale-[0.98] transition-[transform,background-color] duration-150">
          {hasPassword ? "Update password" : "Set password"}
        </button>
      </form>
    </div>
  );
}
