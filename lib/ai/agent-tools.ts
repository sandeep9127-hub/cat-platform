import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { searchEntries } from "@/lib/db/search";

/**
 * Tool definitions for the public agent preview. The agent must operate
 * STRICTLY within the CAT library; tool descriptions reflect that.
 */
export const AGENT_TOOLS = [
  {
    name: "search_entries",
    description:
      "Search the CAT Platform library of published programme entries by free-text query and optional filters. Returns a ranked list of matching entries with their slug, title, tagline, state, scale, themes, and endorsement tier. Use this for any reader question about specific programmes, geographies, themes, or types of work.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Free-text query. Required. Example: 'millet procurement', 'soil organic carbon Andhra'.",
        },
        themes: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional theme slugs to filter by. Valid slugs: soil-land, water, seeds-biodiversity, climate-resilience, women-collectives, markets-value-chains, policy-governance, knowledge-capacity.",
        },
        states: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional ISO-style 2-letter state codes to filter by (e.g. AP, OD, MH, WB, RJ).",
        },
        limit: {
          type: "integer",
          description: "Max results, default 6, hard cap 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_entry",
    description:
      "Get the full narrative of a single entry by slug, including context, what was attempted, what was achieved, what worked, what did not work, organisations, and metrics. Use this to answer detail questions about a specific programme.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Entry slug, e.g. 'ap-community-natural-farming'." },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_themes",
    description:
      "List the eight controlled-vocabulary themes the platform uses, with one-line descriptions. Use this when the reader is exploring or asks 'what areas do you cover'.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_landscapes",
    description:
      "List CAT's eleven focus landscapes with their parent state. Use this when the reader asks about CAT's own landscape-based work.",
    input_schema: { type: "object" as const, properties: {} },
  },
];

export type ToolName =
  | "search_entries"
  | "get_entry"
  | "list_themes"
  | "list_landscapes";

export async function runTool(name: string, input: Record<string, unknown>) {
  switch (name as ToolName) {
    case "search_entries": {
      const hits = await searchEntries(
        {
          q: String(input.query ?? ""),
          themes: Array.isArray(input.themes) ? (input.themes as string[]) : [],
          states: Array.isArray(input.states) ? (input.states as string[]) : [],
        },
        Math.min(Number(input.limit ?? 6) || 6, 10)
      );
      return hits.map((h) => ({
        slug: h.slug,
        title: h.title,
        tagline: h.tagline,
        state: h.stateName,
        scale: h.scaleBand,
        primary_theme: h.themeName,
        endorsement: h.catEndorsement,
        years: h.endYear ? `${h.startYear}-${h.endYear}` : `${h.startYear}-ongoing`,
      }));
    }

    case "get_entry": {
      const slug = String(input.slug ?? "");
      const [row] = await db
        .select()
        .from(schema.entries)
        .where(eq(schema.entries.slug, slug))
        .limit(1);
      if (!row || row.editorialStatus !== "published") {
        return { error: "Entry not found or not published" };
      }
      return {
        slug: row.slug,
        title: row.title,
        tagline: row.tagline,
        years: row.endYear ? `${row.startYear}-${row.endYear}` : `${row.startYear}-ongoing`,
        scale: row.scaleBand,
        endorsement: row.catEndorsement,
        context: row.context,
        what_was_attempted: row.whatWasAttempted,
        what_was_achieved: row.whatWasAchieved,
        what_worked: row.whatWorked,
        what_did_not_work: row.whatDidNotWork,
        headline_metrics: row.headlineMetrics,
      };
    }

    case "list_themes": {
      const rows = await db.select().from(schema.themes).orderBy(asc(schema.themes.displayOrder));
      return rows.map((t) => ({ slug: t.slug, name: t.name, description: t.description }));
    }

    case "list_landscapes": {
      const rows = await db
        .select({
          slug: schema.geographies.slug,
          name: schema.geographies.name,
          state: schema.geographies.stateCode,
        })
        .from(schema.geographies)
        .where(eq(schema.geographies.type, "landscape"))
        .orderBy(asc(schema.geographies.name));
      return rows;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
