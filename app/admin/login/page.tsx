import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export const metadata = { title: "Sign in · Admin" };
export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) redirect("/admin/login?error=email");
  try {
    await signIn("resend", { email, redirectTo: "/admin" });
  } catch (err) {
    if (err instanceof AuthError) redirect("/admin/login?error=auth");
    throw err; // re-throw NEXT_REDIRECT (the verify-request redirect)
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const sent = sp?.sent === "1";
  const error = sp?.error;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--paper)] px-5">
      <div className="w-full max-w-[400px]">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--teal)]">
          Transformation Hub
        </div>
        <h1 className="font-[var(--font-fraunces)] text-[30px] font-semibold tracking-[-0.02em] mt-1.5 text-[var(--ink)]">
          Team sign in
        </h1>

        {sent ? (
          <div className="mt-6 rounded-[10px] border border-[var(--line)] bg-[var(--cream)] p-5">
            <p className="text-[14.5px] text-[var(--ink)] leading-[1.6]">
              Check your inbox. We sent a one-time sign-in link to your email. It expires shortly.
            </p>
            <a href="/admin/login" className="inline-block mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--teal)]">
              ← Use a different email
            </a>
          </div>
        ) : (
          <>
            <p className="text-[14px] text-[var(--ink-soft)] mt-2 mb-5 leading-[1.6]">
              Enter your work email. If your account has access, you&apos;ll get a one-time sign-in
              link. No password to remember.
            </p>
            {error && (
              <p className="mb-4 text-[13px] text-[var(--red-alert)]">
                {error === "email"
                  ? "Please enter a valid email address."
                  : "That email isn't authorised, or the link couldn't be sent. Contact an administrator."}
              </p>
            )}
            <form action={login} className="flex flex-col gap-3">
              <input
                type="email"
                name="email"
                required
                placeholder="you@organisation.org"
                autoComplete="email"
                className="px-4 py-3 rounded-[8px] border border-[var(--line)] bg-[var(--cream)] text-[15px] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
              />
              <button
                type="submit"
                className="px-4 py-3 rounded-[8px] bg-[var(--deep-teal)] text-[var(--paper)] font-mono text-[11px] uppercase tracking-[0.12em] hover:opacity-90 transition-opacity"
              >
                Send sign-in link
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-[11.5px] text-[var(--muted)]">
          Access is limited to invited CAT team members.
        </p>
      </div>
    </div>
  );
}
