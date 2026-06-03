import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "@/auth.config";

/**
 * Full server-side Auth.js instance. Adds the Drizzle adapter (for user +
 * verification-token persistence) and an allowlist sign-in check on top of the
 * edge-safe `authConfig`. Imported only from Node contexts (route handlers,
 * server components), never from middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // The email provider + adapter live only here (Node runtime), not in the
  // edge middleware config — see the note in auth.config.ts.
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    ...authConfig.callbacks,
    // Allowlist: a magic link only grants access to accounts that have been
    // pre-provisioned with an editor or admin role. Everyone else is denied,
    // even though the adapter may have created a stray reader row.
    async signIn({ user }) {
      if (!user?.email) return false;
      const rows = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);
      const role = rows[0]?.role;
      return role === "admin" || role === "editor";
    },
  },
});
