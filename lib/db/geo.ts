import { sql } from "drizzle-orm";
import { db } from "./index";

function rowsOf<T>(r: unknown): T[] {
  if (!r) return [];
  if (Array.isArray(r)) return r as T[];
  const obj = r as { rows?: T[] };
  return Array.isArray(obj.rows) ? obj.rows : [];
}

export type GeoHit = {
  id: string;
  name: string;
  type: string;
  /** Ancestor names, nearest-first: e.g. ["Patratu block", "Ramgarh", "Jharkhand"]. */
  path: string[];
  /** "Patratu · Ramgarh, Jharkhand" — name + ancestors, ready to render. */
  label: string;
  lgdCode: string | null;
  verified: boolean;
};

type SearchRow = {
  id: string;
  name: string;
  type: string;
  lgd_code: string | null;
  verified: boolean;
  p1: string | null;
  p2: string | null;
  p3: string | null;
};

const TYPES = ["state", "district", "block", "village", "landscape"] as const;

/**
 * Fuzzy, typo-tolerant search over the canonical geography tree (pg_trgm).
 * Returns the best matches with their full ancestor path so duplicates (the many
 * "Rampur"s) are distinguishable. `type` restricts the level; `state` restricts
 * to one state by code. Designed for type-ahead: substring OR trigram match,
 * ranked by similarity.
 */
export async function geoSearch(
  q: string,
  opts: { type?: string; state?: string; limit?: number } = {}
): Promise<GeoHit[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const limit = Math.min(opts.limit ?? 12, 25);
  const type = opts.type && (TYPES as readonly string[]).includes(opts.type) ? opts.type : null;
  const state = opts.state?.trim() || null;
  const contains = `%${query}%`;

  const r = await db.execute(sql`
    SELECT g.id, g.name, g.type, g.lgd_code, g.verified,
           p1.name AS p1, p2.name AS p2, p3.name AS p3
    FROM "cat".geographies g
    LEFT JOIN "cat".geographies p1 ON p1.id = g.parent_id
    LEFT JOIN "cat".geographies p2 ON p2.id = p1.parent_id
    LEFT JOIN "cat".geographies p3 ON p3.id = p2.parent_id
    WHERE (g.name ILIKE ${contains} OR g.name % ${query})
      ${type ? sql`AND g.type = ${type}` : sql``}
      ${state ? sql`AND g.state_code = ${state}` : sql``}
    ORDER BY similarity(g.name, ${query}) DESC, length(g.name) ASC
    LIMIT ${limit}
  `);

  return rowsOf<SearchRow>(r).map((row) => {
    const path = [row.p1, row.p2, row.p3].filter((x): x is string => !!x);
    const label = path.length ? `${row.name} · ${path.join(", ")}` : row.name;
    return { id: row.id, name: row.name, type: row.type, path, label, lgdCode: row.lgd_code, verified: row.verified };
  });
}

export type GeoNode = { id: string; name: string; type: string };

/**
 * Direct children of a node, for the cascade fallback. parentId null → the top
 * level (states). Ordered alphabetically.
 */
export async function geoChildren(parentId: string | null): Promise<GeoNode[]> {
  const r = parentId
    ? await db.execute(sql`
        SELECT id, name, type FROM "cat".geographies
        WHERE parent_id = ${parentId} ORDER BY name ASC`)
    : await db.execute(sql`
        SELECT id, name, type FROM "cat".geographies
        WHERE parent_id IS NULL AND type = 'state' ORDER BY name ASC`);
  return rowsOf<GeoNode>(r);
}

/** Resolve one geography to its display label + path (for showing a stored value). */
export async function geoResolve(id: string): Promise<GeoHit | null> {
  const r = await db.execute(sql`
    SELECT g.id, g.name, g.type, g.lgd_code, g.verified,
           p1.name AS p1, p2.name AS p2, p3.name AS p3
    FROM "cat".geographies g
    LEFT JOIN "cat".geographies p1 ON p1.id = g.parent_id
    LEFT JOIN "cat".geographies p2 ON p2.id = p1.parent_id
    LEFT JOIN "cat".geographies p3 ON p3.id = p2.parent_id
    WHERE g.id = ${id} LIMIT 1
  `);
  const row = rowsOf<SearchRow>(r)[0];
  if (!row) return null;
  const path = [row.p1, row.p2, row.p3].filter((x): x is string => !!x);
  return {
    id: row.id, name: row.name, type: row.type, path,
    label: path.length ? `${row.name} · ${path.join(", ")}` : row.name,
    lgdCode: row.lgd_code, verified: row.verified,
  };
}
