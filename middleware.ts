import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware: uses only the adapter-free config so it can read the JWT
// session from the cookie and run the `authorized` callback without a DB call.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
