import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;

  const [draft] = await db
    .select()
    .from(schema.draftEntries)
    .where(eq(schema.draftEntries.id, id))
    .limit(1);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  // Apply the form edits to the draft row before any action.
  await db
    .update(schema.draftEntries)
    .set({
      tagline: body.tagline ?? draft.tagline,
      context: body.context ?? draft.context,
      whatWasAttempted: body.whatWasAttempted ?? draft.whatWasAttempted,
      whatWasAchieved: body.whatWasAchieved ?? draft.whatWasAchieved,
      whatWorked: body.whatWorked ?? draft.whatWorked,
      whatDidNotWork: body.whatDidNotWork ?? draft.whatDidNotWork,
    })
    .where(eq(schema.draftEntries.id, id));

  if (action === "save") {
    return NextResponse.json({ ok: true, action });
  }

  if (action === "return") {
    await db
      .update(schema.draftEntries)
      .set({ editorNotes: (draft.editorNotes ?? "") + "\nReturned for edits." })
      .where(eq(schema.draftEntries.id, id));
    return NextResponse.json({ ok: true, action });
  }

  if (action === "approve") {
    // Materialise draft into a live Entry.
    const slug = slugify(draft.title);
    const [theme] = await db
      .select()
      .from(schema.themes)
      .where(eq(schema.themes.slug, draft.primaryThemeSlug ?? ""))
      .limit(1);
    const [geo] = draft.primaryGeographyName
      ? await db
          .select()
          .from(schema.geographies)
          .where(eq(schema.geographies.name, draft.primaryGeographyName))
          .limit(1)
      : [null];
    if (!theme || !geo) {
      return NextResponse.json(
        { error: "Cannot publish: theme or geography not found in database" },
        { status: 400 }
      );
    }

    const [entry] = await db
      .insert(schema.entries)
      .values({
        slug,
        title: draft.title,
        tagline: (body.tagline ?? draft.tagline ?? draft.title).slice(0, 240),
        provenance: "sourced",
        scaleBand: (draft.scaleBand ?? "block") as schema.Entry["scaleBand"],
        primaryThemeId: theme.id,
        primaryGeographyId: geo.id,
        startYear: draft.startYear ?? new Date().getFullYear(),
        endYear: draft.endYear,
        context: body.context ?? draft.context ?? "",
        whatWasAttempted: body.whatWasAttempted ?? draft.whatWasAttempted ?? "",
        whatWasAchieved: body.whatWasAchieved ?? draft.whatWasAchieved ?? "",
        whatWorked: body.whatWorked ?? draft.whatWorked ?? "",
        whatDidNotWork: body.whatDidNotWork ?? draft.whatDidNotWork,
        catEndorsement: "cat_authored",
        editorialStatus: "published",
        publishedDate: new Date(),
        lastReviewedAt: new Date(),
        aiDraftSourceId: draft.id,
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

    await db
      .update(schema.draftEntries)
      .set({ approvedForPublicationAt: new Date() })
      .where(eq(schema.draftEntries.id, id));

    return NextResponse.json({ ok: true, action, entryId: entry.id, slug });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
