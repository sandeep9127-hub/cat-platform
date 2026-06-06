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
  // Contact is public for this directory: organisations registered themselves
  // to be found and contacted by peers and partners.
  contactPerson: string | null;
  designation: string | null;
  email: string | null;
  website: string | null;
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
    SELECT o.id, o.name, o.org_type AS "orgType", o.domains, o.website,
           o.contact_person AS "contactPerson", o.designation, o.contact_email AS "email",
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
    contactPerson: string | null; designation: string | null; email: string | null; website: string | null;
  }>(orgR).map((o) => ({
    id: o.id,
    name: o.name,
    orgType: o.orgType,
    domains: Array.isArray(o.domains) ? (o.domains as string[]) : [],
    locationCount: o.locationCount,
    states: (o.states || []).filter(Boolean),
    contactPerson: o.contactPerson,
    designation: o.designation,
    email: o.email,
    website: o.website || null,
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

export type SubmissionLocation = {
  state?: string;
  district?: string;
  subdistrict?: string;
  block?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type Submission = {
  submissionType: "new" | "edit";
  targetOrgId?: string | null;
  name?: string;
  orgType?: string;
  domains?: string[];
  website?: string;
  /** One organisation can work in many places. */
  locations?: SubmissionLocation[];
  comments?: string;
  contactPerson?: string;
  contactEmail?: string;
  submitterNote?: string;
};

/** Admin: every published org with its (possibly auto-sourced) website. */
export async function listOrgsAdmin(): Promise<
  { id: string; name: string; website: string | null; states: string[] }[]
> {
  const r = await db.execute(sql`
    SELECT o.id, o.name, o.website,
           coalesce(array_agg(DISTINCT l.state) FILTER (WHERE l.state IS NOT NULL), '{}') AS states
    FROM "cat".directory_orgs o
    LEFT JOIN "cat".directory_locations l ON l.org_id = o.id
    WHERE o.is_published
    GROUP BY o.id ORDER BY o.name
  `);
  return rowsOf<{ id: string; name: string; website: string | null; states: string[] }>(r).map((o) => ({
    id: o.id,
    name: o.name,
    website: o.website || null,
    states: (o.states || []).filter(Boolean),
  }));
}

export async function updateOrgWebsite(id: string, website: string | null): Promise<void> {
  await db.execute(
    sql`UPDATE "cat".directory_orgs SET website = ${website} WHERE id = ${id}`
  );
}

export async function insertSubmission(s: Submission): Promise<void> {
  const locs = (s.locations ?? []).filter(
    (l) => l && (l.state || l.district || l.block || l.subdistrict || l.latitude != null)
  );
  // The legacy single-location columns mirror the first location for backward
  // compatibility with the review console; the full set lives in `locations`.
  const first = locs[0] ?? {};
  await db.execute(sql`
    INSERT INTO "cat".org_submissions
      (submission_type, target_org_id, name, org_type, domains, website, state, district,
       subdistrict, block, latitude, longitude, locations, comments, contact_person, contact_email, submitter_note)
    VALUES (
      ${s.submissionType},
      ${s.targetOrgId ?? null},
      ${s.name ?? null},
      ${s.orgType ?? null},
      ${JSON.stringify(s.domains ?? [])}::jsonb,
      ${s.website ?? null},
      ${first.state ?? null},
      ${first.district ?? null},
      ${first.subdistrict ?? null},
      ${first.block ?? null},
      ${first.latitude ?? null},
      ${first.longitude ?? null},
      ${JSON.stringify(locs)}::jsonb,
      ${s.comments ?? null},
      ${s.contactPerson ?? null},
      ${s.contactEmail ?? null},
      ${s.submitterNote ?? null}
    )
  `);
}
