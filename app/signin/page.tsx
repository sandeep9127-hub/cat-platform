import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { CatLogo } from "@/components/layout/CatLogo";
import { rateLimit } from "@/lib/security/ratelimit";

export const metadata = { title: "Sign in · Admin" };
export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) redirect("/signin?error=email");
  // Throttle magic-link requests per IP so the endpoint can't be used to
  // email-bomb a target or burn the Resend quota.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = await rateLimit({ key: "signin", ip, limit: 5, windowSec: 600 });
  if (!limited.ok) redirect("/signin?error=auth");
  try {
    await signIn("resend", { email, redirectTo: "/admin" });
  } catch (err) {
    if (err instanceof AuthError) redirect("/signin?error=auth");
    throw err; // re-throw NEXT_REDIRECT (the verify-request redirect)
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const sent = sp?.sent === "1";
  const error = sp?.error;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream px-5 py-16">
      <div className="w-full max-w-[380px]">
        <div className="mb-6">
          <CatLogo size={40} />
        </div>

        {sent ? (
          <>
            <h1 className="font-sans font-semibold text-[28px] tracking-[-0.03em] leading-[1.05] text-ink">
              Check your inbox.
            </h1>
            <p className="text-[15px] text-ink-soft mt-2.5 leading-[1.55]">
              We sent a one-time sign-in link to your email. It expires shortly.
            </p>
            <a
              href="/signin"
              className="mt-7 inline-flex w-full items-center justify-center rounded-full border border-line bg-paper px-5 py-3.5 text-[14px] text-ink hover:bg-cream active:scale-[0.99] transition-[transform,background-color] duration-150"
            >
              Use a different email
            </a>
          </>
        ) : (
          <>
            <h1 className="font-sans font-semibold text-[28px] tracking-[-0.03em] leading-[1.05] text-ink">
              Team sign in
            </h1>
            <p className="text-[15px] text-ink-soft mt-2.5 leading-[1.55]">
              Enter your work email. If your account has access, you&apos;ll get a one-time
              link. No password to remember.
            </p>
            {error && (
              <p className="mt-4 text-[13.5px] text-red-alert leading-[1.5]">
                {error === "email"
                  ? "Please enter a valid email address."
                  : "That email isn't authorised, or the link couldn't be sent. Contact an administrator."}
              </p>
            )}
            <form action={login} className="flex flex-col gap-2.5 mt-7">
              <input
                type="email"
                name="email"
                required
                placeholder="you@organisation.org"
                autoComplete="email"
                className="w-full px-5 py-3.5 rounded-[12px] bg-paper border border-line text-[15px] text-ink placeholder:text-muted focus:outline-none focus:border-teal focus:bg-paper transition-colors"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-deep-teal text-paper px-5 py-3.5 text-[14px] font-medium hover:bg-teal active:scale-[0.99] transition-[transform,background-color] duration-150 ease-out-expo"
              >
                Send sign-in link
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-[12px] text-muted leading-[1.5]">
          Access is limited to invited CAT team members.{" "}
          <a href="/" className="text-teal hover:text-deep-teal transition-colors">Back to the site</a>
        </p>
      </div>
    </div>
  );
}
