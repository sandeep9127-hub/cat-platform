import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Email editors a plain-text digest after a Drive sync that changed
 * something: new report versions (with their change summaries), sheet
 * changes waiting for approval, and anything that needs attention.
 *
 * Plain text on purpose: summaries are AI-written from document text, so
 * nothing is rendered as HTML. Sends only when SYNC_EMAIL=on and Resend is
 * configured; otherwise the digest is just returned (and logged by callers).
 */

export type SyncSummary = {
  runId: string;
  triggeredBy: "cron" | "manual";
  newVersions: { landscape: string; title: string; label: string; summaryMd: string | null }[];
  sheetChanges: { landscape: string; added: number; updated: number; removed: number }[];
  problems: string[];
  costUsd: number;
};

export function buildDigest(s: SyncSummary): { subject: string; text: string } | null {
  const pending = s.sheetChanges.reduce((n, c) => n + c.added + c.updated + c.removed, 0);
  if (!s.newVersions.length && !pending && !s.problems.length) return null;

  const parts: string[] = [];
  if (s.newVersions.length) {
    parts.push("UPDATED REPORTS (now live in the Hub)");
    for (const v of s.newVersions) {
      parts.push(`\n${v.landscape}: ${v.title} (${v.label})`);
      if (v.summaryMd) parts.push(v.summaryMd.replace(/\*\*/g, "").split("\n").map((l) => `  ${l}`).join("\n"));
    }
  }
  if (pending) {
    parts.push("\nINVESTMENT-TABLE CHANGES WAITING FOR APPROVAL");
    for (const c of s.sheetChanges.filter((c) => c.added + c.updated + c.removed))
      parts.push(`  ${c.landscape}: ${c.updated} changed, ${c.added} new, ${c.removed} removed`);
    parts.push("  Approve them in the Hub admin under Triage. Nothing changes on the site until you do.");
  }
  if (s.problems.length) parts.push(`\nNEEDS ATTENTION\n${s.problems.map((p) => `  - ${p}`).join("\n")}`);
  parts.push(`\nSync ${s.runId.slice(0, 8)} (${s.triggeredBy}), AI cost $${s.costUsd.toFixed(2)}.`);

  const bits = [s.newVersions.length && `${s.newVersions.length} report update${s.newVersions.length > 1 ? "s" : ""}`, pending && `${pending} table change${pending > 1 ? "s" : ""} to approve`, s.problems.length && `${s.problems.length} issue${s.problems.length > 1 ? "s" : ""}`].filter(Boolean);
  return { subject: `CAT Hub sync: ${bits.join(", ")}`, text: parts.join("\n") };
}

export async function sendDigest(s: SyncSummary): Promise<"sent" | "disabled" | "nothing"> {
  const digest = buildDigest(s);
  if (!digest) return "nothing";
  if (process.env.SYNC_EMAIL !== "on" || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return "disabled";
  const to = ((await db.execute(sql`SELECT email FROM "cat".users WHERE role IN ('admin','editor') AND email IS NOT NULL`)) as unknown as {
    rows: { email: string }[];
  }).rows.map((r) => r.email);
  if (!to.length) return "nothing";
  const { Resend } = await import("resend");
  await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.RESEND_FROM_EMAIL, to, subject: digest.subject, text: digest.text });
  return "sent";
}
