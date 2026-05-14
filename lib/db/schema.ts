import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Everything CAT Platform lives in a dedicated Postgres schema so it can
 * cohabit with unrelated apps in the same database without collisions.
 */
export const catSchema = pgSchema("cat");
const pgTable = catSchema.table.bind(catSchema);
const pgEnum = catSchema.enum.bind(catSchema);

/* ─── Enums ─────────────────────────────────────────── */

export const provenanceEnum = pgEnum("provenance", ["sourced", "self_submitted"]);

export const scaleBandEnum = pgEnum("scale_band", [
  "pilot",
  "block",
  "district",
  "multi_district",
  "state",
  "multi_state",
  "national",
]);

export const entryStatusEnum = pgEnum("entry_status", ["ongoing", "completed", "paused", "archived"]);

export const editorialStatusEnum = pgEnum("editorial_status", [
  "draft",
  "submitted",
  "under_review",
  "published",
  "needs_update",
  "archived",
]);

export const endorsementEnum = pgEnum("endorsement", ["cat_authored", "cat_endorsed", "cat_listed"]);

export const visibilityEnum = pgEnum("visibility", ["public", "private", "internal"]);

export const orgTypeEnum = pgEnum("org_type", [
  "ngo",
  "government",
  "foundation",
  "research",
  "private",
  "network",
  "multilateral",
]);

export const orgRelationshipEnum = pgEnum("org_relationship", [
  "level_1_mentioned",
  "level_2_platform_partner",
]);

export const orgRoleEnum = pgEnum("org_role", [
  "lead_implementer",
  "supporting_implementer",
  "funder",
  "knowledge_partner",
  "government_counterpart",
  "research_collaborator",
]);

export const geoTypeEnum = pgEnum("geo_type", [
  "state",
  "district",
  "block",
  "village",
  "landscape",
  "river_basin",
  "agro_climatic_zone",
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "report",
  "paper",
  "policy_brief",
  "video",
  "photo_gallery",
  "dataset",
  "presentation",
  "external_link",
  "book",
]);

export const languageEnum = pgEnum("language", ["english", "hindi", "regional"]);

export const userRoleEnum = pgEnum("user_role", ["reader", "contributor", "editor", "admin"]);

export const submissionTypeEnum = pgEnum("submission_type", [
  "entry",
  "resource",
  "news_item",
  "entry_update",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending_review",
  "approved",
  "returned_for_edits",
  "rejected",
]);

export const ingestionRunTypeEnum = pgEnum("ingestion_run_type", [
  "registry_crawl",
  "discovery_agent",
  "draft_writer",
  "freshness_sweep",
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "running",
  "succeeded",
  "failed",
  "partial",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "gov_site",
  "ngo_site",
  "research_inst",
  "foundation",
  "news_outlet",
  "partner_report",
  "other",
]);

export const trustTierEnum = pgEnum("trust_tier", [
  "tier_1_authoritative",
  "tier_2_trusted",
  "tier_3_emerging",
]);

export const candidateStatusEnum = pgEnum("candidate_status", [
  "pending_triage",
  "promoted_to_draft",
  "dismissed",
  "duplicate_of_entry",
]);

export const freshnessStatusEnum = pgEnum("freshness_status", [
  "pending_review",
  "redrafted",
  "dismissed_no_change_warranted",
]);

export const revisionTriggerEnum = pgEnum("revision_trigger", [
  "manual_edit",
  "freshness_redraft",
  "submission_approval",
]);

export const chunkKindEnum = pgEnum("chunk_kind", [
  "context",
  "attempted",
  "achieved",
  "worked",
  "did_not_work",
  "tagline",
]);

/* ─── Auth.js core tables (User, Account, Session, VerificationToken) ── */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").default("reader").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) })
);

/* ─── Core editorial entities ───────────────────────── */

export const themes = pgTable(
  "themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    description: text("description").notNull(),
    colourHex: varchar("colour_hex", { length: 7 }).notNull(),
    iconName: varchar("icon_name", { length: 40 }),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ orderIdx: index("themes_order_idx").on(t.displayOrder) })
);

export const geographies = pgTable(
  "geographies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    type: geoTypeEnum("type").notNull(),
    parentId: uuid("parent_id"),
    stateCode: varchar("state_code", { length: 4 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    displayOnMap: boolean("display_on_map").default(true).notNull(),
  },
  (t) => ({
    parentIdx: index("geo_parent_idx").on(t.parentId),
    stateIdx: index("geo_state_idx").on(t.stateCode),
  })
);

export const persons = pgTable("persons", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  organisationId: uuid("organisation_id"),
  roleTitle: varchar("role_title", { length: 120 }),
  email: text("email"),
  phone: text("phone"),
  visibility: visibilityEnum("visibility").default("internal").notNull(),
  linkedinUrl: text("linkedin_url"),
  notes: text("notes"),
});

export const organisations = pgTable(
  "organisations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    shortName: varchar("short_name", { length: 30 }),
    type: orgTypeEnum("type").notNull(),
    relationshipLevel: orgRelationshipEnum("relationship_level")
      .default("level_1_mentioned")
      .notNull(),
    headquartersGeographyId: uuid("headquarters_geography_id").references(
      () => geographies.id,
      { onDelete: "set null" }
    ),
    description: text("description").notNull(),
    foundedYear: integer("founded_year"),
    website: text("website"),
    verifiedContactPersonId: uuid("verified_contact_person_id").references(
      () => persons.id,
      { onDelete: "set null" }
    ),
    logoUrl: text("logo_url"),
    catRelationshipNotes: text("cat_relationship_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ slugIdx: uniqueIndex("orgs_slug_idx").on(t.slug) })
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    tagline: varchar("tagline", { length: 240 }).notNull(),
    provenance: provenanceEnum("provenance").default("sourced").notNull(),
    scaleBand: scaleBandEnum("scale_band").notNull(),
    primaryThemeId: uuid("primary_theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "restrict" }),
    primaryGeographyId: uuid("primary_geography_id")
      .notNull()
      .references(() => geographies.id, { onDelete: "restrict" }),
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year"),
    status: entryStatusEnum("status").default("ongoing").notNull(),

    context: text("context").notNull(),
    whatWasAttempted: text("what_was_attempted").notNull(),
    whatWasAchieved: text("what_was_achieved").notNull(),
    whatWorked: text("what_worked").notNull(),
    whatDidNotWork: text("what_did_not_work"),

    headlineMetrics: jsonb("headline_metrics").$type<
      { label: string; value: string; unit: string }[]
    >(),
    investmentQuantumInrCr: real("investment_quantum_inr_cr"),
    investmentVisibility: visibilityEnum("investment_visibility").default("public").notNull(),

    coverImageUrl: text("cover_image_url"),
    galleryImageUrls: jsonb("gallery_image_urls").$type<string[]>().default(sql`'[]'::jsonb`),

    publicContactPersonId: uuid("public_contact_person_id").references(() => persons.id, {
      onDelete: "set null",
    }),
    externalLinks: jsonb("external_links").$type<{ label: string; url: string }[]>().default(
      sql`'[]'::jsonb`
    ),

    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    submissionDate: timestamp("submission_date").defaultNow().notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    publishedDate: timestamp("published_date"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    needsUpdateReason: text("needs_update_reason"),
    editorialStatus: editorialStatusEnum("editorial_status").default("draft").notNull(),
    editorialNotes: text("editorial_notes"),
    catEndorsement: endorsementEnum("cat_endorsement").default("cat_listed").notNull(),
    aiDraftSourceId: uuid("ai_draft_source_id"),
  },
  (t) => ({
    slugIdx: uniqueIndex("entries_slug_idx").on(t.slug),
    statusIdx: index("entries_status_idx").on(t.editorialStatus),
    publishedIdx: index("entries_published_idx").on(t.publishedDate),
    primaryThemeIdx: index("entries_primary_theme_idx").on(t.primaryThemeId),
    primaryGeoIdx: index("entries_primary_geo_idx").on(t.primaryGeographyId),
  })
);

/* ─── Join tables ───────────────────────────────────── */

export const entryThemes = pgTable(
  "entry_themes",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.entryId, t.themeId] }) })
);

export const entryGeographies = pgTable(
  "entry_geographies",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    geographyId: uuid("geography_id")
      .notNull()
      .references(() => geographies.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.entryId, t.geographyId] }) })
);

export const entryOrganisations = pgTable(
  "entry_organisations",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    role: orgRoleEnum("role").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.entryId, t.organisationId, t.role] }) })
);

/* ─── Resources ─────────────────────────────────────── */

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  type: resourceTypeEnum("type").notNull(),
  description: text("description").notNull(),
  fileUrl: text("file_url"),
  externalUrl: text("external_url"),
  fileSizeBytes: integer("file_size_bytes"),
  language: languageEnum("language").default("english").notNull(),
  publicationYear: integer("publication_year").notNull(),
  publisherOrganisationId: uuid("publisher_organisation_id").references(
    () => organisations.id,
    { onDelete: "set null" }
  ),
  authorFreeText: text("author_free_text"),
  coverImageUrl: text("cover_image_url"),
  submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  editorialStatus: editorialStatusEnum("editorial_status").default("draft").notNull(),
});

export const resourceThemes = pgTable(
  "resource_themes",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "restrict" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.themeId] }) })
);

export const resourceEntries = pgTable(
  "resource_entries",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.entryId] }) })
);

export const resourceGeographies = pgTable(
  "resource_geographies",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    geographyId: uuid("geography_id")
      .notNull()
      .references(() => geographies.id, { onDelete: "restrict" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.geographyId] }) })
);

export const resourceAuthors = pgTable(
  "resource_authors",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "restrict" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.personId] }) })
);

/* ─── News ──────────────────────────────────────────── */

export const newsItems = pgTable("news_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  headline: varchar("headline", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceOrganisationId: uuid("source_organisation_id").references(() => organisations.id, {
    onDelete: "set null",
  }),
  publicationDate: timestamp("publication_date").notNull(),
  linkedEntryId: uuid("linked_entry_id").references(() => entries.id, {
    onDelete: "set null",
  }),
  linkedOrganisationId: uuid("linked_organisation_id").references(() => organisations.id, {
    onDelete: "set null",
  }),
  coverImageUrl: text("cover_image_url"),
  submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  editorialStatus: editorialStatusEnum("editorial_status").default("draft").notNull(),
});

export const newsThemes = pgTable(
  "news_themes",
  {
    newsId: uuid("news_id")
      .notNull()
      .references(() => newsItems.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "restrict" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.newsId, t.themeId] }) })
);

export const newsGeographies = pgTable(
  "news_geographies",
  {
    newsId: uuid("news_id")
      .notNull()
      .references(() => newsItems.id, { onDelete: "cascade" }),
    geographyId: uuid("geography_id")
      .notNull()
      .references(() => geographies.id, { onDelete: "restrict" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.newsId, t.geographyId] }) })
);

/* ─── Submissions ───────────────────────────────────── */

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionType: submissionTypeEnum("submission_type").notNull(),
  submittedObjectId: uuid("submitted_object_id").notNull(),
  submitterUserId: uuid("submitter_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  submitterOrganisationId: uuid("submitter_organisation_id").references(
    () => organisations.id,
    { onDelete: "set null" }
  ),
  submittedDate: timestamp("submitted_date").defaultNow().notNull(),
  status: submissionStatusEnum("status").default("pending_review").notNull(),
  reviewerUserId: uuid("reviewer_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewNotes: text("review_notes"),
  decisionDate: timestamp("decision_date"),
});

/* ─── Ingestion pipeline ───────────────────────────── */

export const sourceRegistry = pgTable(
  "source_registry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull().unique(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    trustTier: trustTierEnum("trust_tier").default("tier_2_trusted").notNull(),
    crawlFrequencyDays: integer("crawl_frequency_days").default(7).notNull(),
    lastFetchedAt: timestamp("last_fetched_at"),
    lastContentHash: varchar("last_content_hash", { length: 64 }),
    isActive: boolean("is_active").default(true).notNull(),
    addedByUserId: uuid("added_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ activeIdx: index("source_active_idx").on(t.isActive) })
);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  runType: ingestionRunTypeEnum("run_type").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: ingestionStatusEnum("status").default("running").notNull(),
  itemsProcessed: integer("items_processed").default(0).notNull(),
  itemsYielded: integer("items_yielded").default(0).notNull(),
  costUsd: real("cost_usd"),
  errorLog: text("error_log"),
  triggeredBy: varchar("triggered_by", { length: 16 }).default("cron").notNull(),
});

export const discoveryCandidates = pgTable("discovery_candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  proposedTitle: varchar("proposed_title", { length: 200 }).notNull(),
  proposedSummary: text("proposed_summary").notNull(),
  proposedThemes: jsonb("proposed_themes").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  proposedGeographyName: varchar("proposed_geography_name", { length: 120 }),
  proposedStateCode: varchar("proposed_state_code", { length: 4 }),
  proposedLeadOrganisationName: varchar("proposed_lead_organisation_name", { length: 200 }),
  sourceUrls: jsonb("source_urls").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  confidenceScore: real("confidence_score"),
  status: candidateStatusEnum("status").default("pending_triage").notNull(),
  duplicateOfEntryId: uuid("duplicate_of_entry_id").references(() => entries.id, {
    onDelete: "set null",
  }),
  discoveredInRunId: uuid("discovered_in_run_id").references(() => ingestionRuns.id, {
    onDelete: "set null",
  }),
  triagedByUserId: uuid("triaged_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  triagedAt: timestamp("triaged_at"),
  dismissalReason: text("dismissal_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const draftEntries = pgTable("draft_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Mirrors entries: title, tagline, narrative fields, etc.
  title: varchar("title", { length: 120 }).notNull(),
  tagline: varchar("tagline", { length: 240 }),
  primaryThemeSlug: varchar("primary_theme_slug", { length: 80 }),
  primaryGeographyName: varchar("primary_geography_name", { length: 120 }),
  primaryStateCode: varchar("primary_state_code", { length: 4 }),
  scaleBand: scaleBandEnum("scale_band"),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  context: text("context"),
  whatWasAttempted: text("what_was_attempted"),
  whatWasAchieved: text("what_was_achieved"),
  whatWorked: text("what_worked"),
  whatDidNotWork: text("what_did_not_work"),
  leadOrganisationName: varchar("lead_organisation_name", { length: 200 }),
  sourcePassages: jsonb("source_passages")
    .$type<{ source_url: string; passage: string; position_anchor: string }[]>()
    .default(sql`'[]'::jsonb`),
  citationMap: jsonb("citation_map")
    .$type<{ sentence_id: string; passage_ids: string[] }[]>()
    .default(sql`'[]'::jsonb`),
  draftedInRunId: uuid("drafted_in_run_id").references(() => ingestionRuns.id, {
    onDelete: "set null",
  }),
  draftConfidence: real("draft_confidence"),
  editorNotes: text("editor_notes"),
  approvedForPublicationAt: timestamp("approved_for_publication_at"),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  promotedFromCandidateId: uuid("promoted_from_candidate_id").references(
    () => discoveryCandidates.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const freshnessFlags = pgTable("freshness_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  detectedInRunId: uuid("detected_in_run_id").references(() => ingestionRuns.id, {
    onDelete: "set null",
  }),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  sourceUrl: text("source_url").notNull(),
  diffSummary: text("diff_summary").notNull(),
  status: freshnessStatusEnum("status").default("pending_review").notNull(),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const entryRevisions = pgTable("entry_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  revisedAt: timestamp("revised_at").defaultNow().notNull(),
  revisedByUserId: uuid("revised_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  fieldsChanged: jsonb("fields_changed").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  beforeSnapshot: jsonb("before_snapshot"),
  afterSnapshot: jsonb("after_snapshot"),
  trigger: revisionTriggerEnum("trigger").notNull(),
});

/* ─── Agent (public preview + future v2) ────────────── */

export const agentConversations = pgTable("agent_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: varchar("session_token", { length: 64 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  turnCount: integer("turn_count").default(0).notNull(),
  totalInputTokens: integer("total_input_tokens").default(0).notNull(),
  totalOutputTokens: integer("total_output_tokens").default(0).notNull(),
  costUsd: real("cost_usd").default(0).notNull(),
  wasRefused: boolean("was_refused").default(false).notNull(),
  refusalReason: text("refusal_reason"),
  citedEntryIds: jsonb("cited_entry_ids").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
});

export const agentTurns = pgTable("agent_turns", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => agentConversations.id, { onDelete: "cascade" }),
  turnIndex: integer("turn_index").notNull(),
  userMessage: text("user_message").notNull(),
  assistantMessage: text("assistant_message").notNull(),
  toolCalls: jsonb("tool_calls").default(sql`'[]'::jsonb`),
  citedEntryIds: jsonb("cited_entry_ids").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ─── Vector store ─────────────────────────────────── */
/* pgvector column managed via raw migration; declared here as jsonb fallback. */

export const entryEmbeddings = pgTable("entry_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  chunkText: text("chunk_text").notNull(),
  chunkKind: chunkKindEnum("chunk_kind").notNull(),
  embedding: jsonb("embedding").$type<number[]>(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

/* ─── Relations ────────────────────────────────────── */

export const entriesRelations = relations(entries, ({ one, many }) => ({
  primaryTheme: one(themes, {
    fields: [entries.primaryThemeId],
    references: [themes.id],
  }),
  primaryGeography: one(geographies, {
    fields: [entries.primaryGeographyId],
    references: [geographies.id],
  }),
  themes: many(entryThemes),
  geographies: many(entryGeographies),
  organisations: many(entryOrganisations),
  resources: many(resourceEntries),
}));

export const themesRelations = relations(themes, ({ many }) => ({
  entries: many(entryThemes),
}));

export const organisationsRelations = relations(organisations, ({ one, many }) => ({
  headquarters: one(geographies, {
    fields: [organisations.headquartersGeographyId],
    references: [geographies.id],
  }),
  entries: many(entryOrganisations),
}));

export const geographiesRelations = relations(geographies, ({ many }) => ({
  entries: many(entryGeographies),
}));

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Theme = typeof themes.$inferSelect;
export type Geography = typeof geographies.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
