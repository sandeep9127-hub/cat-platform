import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_SCALE_BANDS = new Set([
  "pilot",
  "block",
  "district",
  "multi_district",
  "state",
  "multi_state",
  "national",
]);

const TEXT_CAP = 8000;

type Body = {
  email: string;
  organisation: string;
  title: string;
  tagline: string;
  themeSlug: string;
  stateCode: string;
  scaleBand: string;
  startYear: string;
  context: string;
  whatWasAttempted: string;
  whatWasAchieved: string;
  whatWorked: string;
  whatDidNotWork: string;
  sourceUrls: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body.email ||
    !body.title ||
    !body.tagline ||
    !body.themeSlug ||
    !body.stateCode ||
    !body.scaleBand ||
    !body.startYear ||
    !body.context ||
    !body.whatWasAttempted ||
    !body.whatWasAchieved ||
    !body.whatWorked
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate scaleBand against the allowed enum set.
  if (!ALLOWED_SCALE_BANDS.has(body.scaleBand)) {
    return NextResponse.json({ error: "Invalid scaleBand" }, { status: 400 });
  }

  // Bound startYear to a sane integer range.
  const startYear = Number(body.startYear);
  const currentYear = new Date().getFullYear();
  if (
    !Number.isInteger(startYear) ||
    startYear < 1900 ||
    startYear > currentYear + 1
  ) {
    return NextResponse.json({ error: "Invalid startYear" }, { status: 400 });
  }

  // Find or create a contributor user record (lightweight; Auth.js full
  // magic-link login wires through in Phase 6).
  let user;
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, body.email))
    .limit(1);
  if (existingUser) {
    user = existingUser;
  } else {
    const [created] = await db
      .insert(schema.users)
      .values({ email: body.email, role: "contributor" })
      .returning();
    user = created;
  }

  // Resolve theme + geography
  const [theme] = await db
    .select()
    .from(schema.themes)
    .where(eq(schema.themes.slug, body.themeSlug))
    .limit(1);
  if (!theme) return NextResponse.json({ error: "Unknown theme" }, { status: 400 });

  const [geo] = await db
    .select()
    .from(schema.geographies)
    .where(eq(schema.geographies.stateCode, body.stateCode))
    .limit(1);
  if (!geo) return NextResponse.json({ error: "Unknown state" }, { status: 400 });

  // Create the entry as a submitted (not published) row so the editor sees
  // it in the contributor-submissions queue.
  const slug =
    slugify(body.title) + "-" + Math.random().toString(36).slice(2, 6);

  const externalLinks = body.sourceUrls
    .split(/\n/)
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url) => ({ label: "Source", url }));

  const [entry] = await db
    .insert(schema.entries)
    .values({
      slug,
      title: body.title.slice(0, 120),
      tagline: body.tagline.slice(0, 240),
      provenance: "self_submitted",
      scaleBand: body.scaleBand as schema.Entry["scaleBand"],
      primaryThemeId: theme.id,
      primaryGeographyId: geo.id,
      startYear,
      status: "ongoing",
      context: body.context.slice(0, TEXT_CAP),
      whatWasAttempted: body.whatWasAttempted.slice(0, TEXT_CAP),
      whatWasAchieved: body.whatWasAchieved.slice(0, TEXT_CAP),
      whatWorked: body.whatWorked.slice(0, TEXT_CAP),
      whatDidNotWork: body.whatDidNotWork ? body.whatDidNotWork.slice(0, TEXT_CAP) : null,
      externalLinks,
      submittedByUserId: user.id,
      editorialStatus: "submitted",
      catEndorsement: "cat_listed",
    })
    .returning();

  await db.insert(schema.entryThemes).values({
    entryId: entry.id,
    themeId: theme.id,
    isPrimary: true,
  });
  await db.insert(schema.entryGeographies).values({
    entryId: entry.id,
    geographyId: geo.id,
    isPrimary: true,
  });

  await db.insert(schema.submissions).values({
    submissionType: "entry",
    submittedObjectId: entry.id,
    submitterUserId: user.id,
    status: "pending_review",
  });

  // Email the editor (optional; only if Resend is configured)
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const resend = await import("resend").then((m) => new m.Resend(process.env.RESEND_API_KEY));
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: body.email,
        subject: "Your Transformation Hub submission",
        text: `Thank you. Your submission for "${body.title}" is in the editorial queue. We will write when we decide. Typical turnaround is two weeks.

— The editors, Transformation Hub (by the Consortium for Agroecological Transformation)`,
      });
    } catch {
      // Non-fatal; the submission is recorded regardless.
    }
  }

  return NextResponse.json({ ok: true, entryId: entry.id });
}
