import { handlers } from "@/auth";

// Auth.js route handlers run on Node (the Drizzle adapter uses node-postgres).
export const runtime = "nodejs";
export const { GET, POST } = handlers;
