import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/ask/session";
import { findMessageForSession } from "@/lib/ask/store";
import { buildNotePdf } from "@/lib/ask/note-pdf";
import { rateLimit, getClientIp } from "@/lib/security/ratelimit";

/**
 * GET /api/agent/note?m=<messageId> → the note card as an A4 PDF.
 * Off unless NOTE_PDF=on: whether notes may be downloaded is Sandeep's call
 * (reports themselves are shared on request only, never downloaded).
 * Only the reader whose session owns the conversation can fetch it, and the
 * PDF is built from the stored note, never from anything the client sends.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NoteArtifact = { type: "note"; title: string; date: string; bullets: { text: string; sources: number[] }[]; cited: number[] };

export async function GET(req: NextRequest) {
  if (process.env.ASK_V2 !== "on" || process.env.NOTE_PDF !== "on") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const limited = await rateLimit({ key: "ask_note_pdf", ip: getClientIp(req), limit: 20, windowSec: 60 });
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const tokenHash = readSession(req);
  const id = req.nextUrl.searchParams.get("m") ?? "";
  const msg = tokenHash ? await findMessageForSession(id, tokenHash) : null;
  const note = msg?.artifacts?.find((a) => a.type === "note") as NoteArtifact | undefined;
  if (!msg || !note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const labels = new Map((msg.citations ?? []).map((c) => [c.index, c.label]));
  const pdf = await buildNotePdf(
    {
      title: note.title,
      date: note.date,
      bullets: note.bullets,
      sources: (note.cited ?? []).filter((n) => labels.has(n)).map((n) => ({ n, label: labels.get(n)! })),
    },
    `${req.nextUrl.origin}/agent`,
  );
  const slug = note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "note";
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cat-note-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
