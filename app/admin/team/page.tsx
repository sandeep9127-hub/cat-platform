import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/admin");
  return session;
}

type Sess = { user?: { id?: string; email?: string | null } } | null;
function actor(session: Sess) {
  return {
    actorUserId: session?.user?.id ?? null,
    actorEmail: session?.user?.email ?? null,
  };
}

async function addMember(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "editor");
  const password = String(formData.get("password") || "");
  if (!email || !email.includes("@")) redirect("/admin/team?error=email");
  if (role !== "editor" && role !== "admin") redirect("/admin/team?error=role");
  const weak = passwordProblem(password);
  if (weak) redirect("/admin/team?error=weak");

  const hash = hashPassword(password);
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) {
    await db.update(schema.users)
      .set({ role: role as "editor" | "admin", passwordHash: hash })
      .where(eq(schema.users.id, existing.id));
  } else {
    await db.insert(schema.users).values({ email, role: role as "editor" | "admin", passwordHash: hash });
  }
  await writeAudit({ ...(await actor(session)), action: "team.member_added", entityType: "user", entityId: email });
  redirect("/admin/team?ok=added");
}

async function resetMemberPassword(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "");
  if (!id) redirect("/admin/team");
  const weak = passwordProblem(password);
  if (weak) redirect("/admin/team?error=weak");
  await db.update(schema.users).set({ passwordHash: hashPassword(password) }).where(eq(schema.users.id, id));
  await writeAudit({ ...(await actor(session)), action: "team.password_reset", entityType: "user", entityId: id });
  redirect("/admin/team?ok=reset");
}

async function removeMember(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const id = String(formData.get("id") || "");
  const selfId = (session?.user as { id?: string } | undefined)?.id;
  if (!id || id === selfId) redirect("/admin/team?error=self"); // never lock yourself out
  await db.update(schema.users).set({ role: "reader", passwordHash: null }).where(eq(schema.users.id, id));
  await writeAudit({ ...(await actor(session)), action: "team.member_removed", entityType: "user", entityId: id });
  redirect("/admin/team?ok=removed");
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await requireAdmin();
  const selfId = (session?.user as { id?: string } | undefined)?.id;
  const sp = await searchParams;

  const members = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role, passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(inArray(schema.users.role, ["admin", "editor"]));

  const input =
    "px-3 py-2 rounded-[8px] bg-paper border border-line text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-teal transition-colors";

  return (
    <div className="space-y-6 max-w-[860px]">
      <header>
        <span className="mono-label">Team</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">Members</h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[64ch] font-light">
          Admins and editors who can sign in to the desk. Add a colleague with a temporary
          password, then share it with them. They can change it under Account.
        </p>
      </header>

      {sp.ok ? (
        <div className="rounded-[8px] border border-teal/30 bg-teal/10 text-deep-teal px-4 py-3 text-[13.5px]">
          {sp.ok === "added" ? "Member added. Share their temporary password so they can sign in." :
           sp.ok === "reset" ? "Password reset." : "Member removed."}
        </div>
      ) : null}
      {sp.error ? (
        <div className="rounded-[8px] border border-red-alert/30 bg-red-alert/10 text-red-alert px-4 py-3 text-[13.5px]">
          {sp.error === "weak" ? "Password must be at least 8 characters." :
           sp.error === "email" ? "Enter a valid email." :
           sp.error === "self" ? "You can't remove your own access." : "Invalid role."}
        </div>
      ) : null}

      {/* Add member */}
      <form action={addMember} className="rounded-[10px] border border-line p-5 flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Email</span>
          <input type="email" name="email" required placeholder="editor@organisation.org" className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Role</span>
          <select name="role" className={input} defaultValue="editor">
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Temporary password</span>
          <input type="text" name="password" required minLength={8} placeholder="min 8 characters" className={input} />
        </label>
        <button className="rounded-full bg-deep-teal text-paper px-5 py-2.5 text-[13px] font-medium hover:bg-teal active:scale-[0.98] transition-[transform,background-color] duration-150">
          Add member
        </button>
      </form>

      {/* Member list */}
      <div className="rounded-[10px] border border-line overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-cream text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Password</th>
              <th className="px-4 py-3 font-medium">Reset password</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-line align-middle">
                <td className="px-4 py-3 text-ink">{m.email}{m.id === selfId ? <span className="text-muted"> (you)</span> : null}</td>
                <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-teal">{m.role}</td>
                <td className="px-4 py-3 text-muted">{m.passwordHash ? "set" : "not set"}</td>
                <td className="px-4 py-3">
                  <form action={resetMemberPassword} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="text" name="password" required minLength={8} placeholder="new password" className="px-2.5 py-1.5 rounded-[6px] bg-paper border border-line text-[13px] w-[150px] focus:outline-none focus:border-teal" />
                    <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-deep-teal hover:text-teal">Set</button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  {m.id === selfId ? null : (
                    <form action={removeMember}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-red-alert">Remove</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
