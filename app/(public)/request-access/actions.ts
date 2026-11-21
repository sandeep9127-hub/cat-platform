"use server";

import { headers } from "next/headers";
import { submitAccessRequest } from "@/lib/access/requests";
import { getClientIp, rateLimit } from "@/lib/security/ratelimit";

export type RequestState = { ok?: boolean; error?: string };

// Server Action: Next.js checks the request's origin, so other sites can't post here.
export async function requestAccessAction(_prev: RequestState, form: FormData): Promise<RequestState> {
  // Honeypot: people never see this field; bots tend to fill it. Pretend success.
  if (String(form.get("website") ?? "")) return { ok: true };
  const ip = getClientIp({ headers: await headers() } as unknown as Request);
  const limited = await rateLimit({ key: "access-request", ip, limit: 5, windowSec: 3600 });
  if (!limited.ok) return { error: "Too many requests from this connection. Please try again later or email CAT." };
  if (form.get("consent") !== "on") return { error: "Please confirm how you'll use the figures." };
  try {
    const r = await submitAccessRequest({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      organisation: String(form.get("organisation") ?? ""),
      role: String(form.get("role") ?? ""),
      purpose: String(form.get("purpose") ?? ""),
      landscape: String(form.get("landscape") ?? "all"),
      ip,
    });
    return r.error ? { error: r.error } : { ok: true };
  } catch (e) {
    console.error("[access-request] failed", (e as Error).message);
    return { error: "Something went wrong. Please try again, or email CAT." };
  }
}
