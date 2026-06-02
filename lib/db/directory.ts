import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

function rowsOf<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === "object" && "rows" in r) return (r as { rows: T[] }).rows;
  return [];
}

export type DirectoryOrg = {
  id: string;
  name: string;
  orgType: string;
  domains: string[];
  locationCount: number;
  states: string[];
};

export type DirectoryLocation = {
  orgId: string;
  lat: number;
  lng: number;
  state: string | null;
  district: string | null;
};

/**
 * Public directory payload. PII columns (contact_person, contact_email) are
 * never selected here — they exist only for the moderated edit/verify flow.
 */
export async function getDirectory(): Promise<{
  orgs: DirectoryOrg[];
  locations: DirectoryLocation[];
}> {
  const orgR = await db.execute(sql`
    SELECT o.id, o.name, o.org_type AS "orgType", o.domains,
           count(l.id)::int AS "locationCount",
           coalesce(array_agg(DISTINCT l.state) FILTER (WHERE l.state IS NOT NULL), '{}') AS states
    FROM "cat".directory_orgs o
    LEFT JOIN "cat".directory_locations l ON l.org_id = o.id
    WHERE o.is_published
    GROUP BY o.id
    ORDER BY o.name
  `);
  const locR = await db.execute(sql`
    SELECT org_id AS "orgId", latitude AS lat, longitude AS lng, state, district
    FROM "cat".directory_locations
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `);

  const orgs = rowsOf<{
    id: string; name: string; orgType: string; domains: unknown; locationCount: number; states: string[];
  }>(orgR).map((o) => ({
    id: o.id,
    name: o.name,
    orgType: o.orgType,
    domains: Array.isArray(o.domains) ? (o.domains as string[]) : [],
    locationCount: o.locationCount,
    states: (o.states || []).filter(Boolean),
  }));

  const locations = rowsOf<DirectoryLocation>(locR).map((l) => ({
    orgId: l.orgId,
    lat: Number(l.lat),
    lng: Number(l.lng),
    state: l.state,
    district: l.district,
  }));

  return { orgs, locations };
}

export type Submission = {
  submissionType: "new" | "edit";
  targetOrgId?: string | null;
  name?: string;
  orgType?: string;
  domains?: string[];
  state?: string;
  district?: string;
  subdistrict?: string;
  block?: string;
  latitude?: number | null;
  longitude?: number | null;
  comments?: string;
  contactPerson?: string;
  contactEmail?: string;
  submitterNote?: string;
};

export async function insertSubmission(s: Submission): Promise<void> {
  await db.execute(sql`
    INSERT INTO "cat".org_submissions
      (submission_type, target_org_id, name, org_type, domains, state, district,
       subdistrict, block, latitude, longitude, comments, contact_person, contact_email, submitter_note)
    VALUES (
      ${s.submissionType},
      ${s.targetOrgId ?? null},
      ${s.name ?? null},
      ${s.orgType ?? null},
      ${JSON.stringify(s.domains ?? [])}::jsonb,
      ${s.state ?? null},
      ${s.district ?? null},
      ${s.subdistrict ?? null},
      ${s.block ?? null},
      ${s.latitude ?? null},
      ${s.longitude ?? null},
      ${s.comments ?? null},
      ${s.contactPerson ?? null},
      ${s.contactEmail ?? null},
      ${s.submitterNote ?? null}
    )
  `);
}
