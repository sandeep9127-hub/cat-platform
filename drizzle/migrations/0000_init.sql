CREATE SCHEMA "cat";
--> statement-breakpoint
CREATE TYPE "cat"."candidate_status" AS ENUM('pending_triage', 'promoted_to_draft', 'dismissed', 'duplicate_of_entry');--> statement-breakpoint
CREATE TYPE "cat"."chunk_kind" AS ENUM('context', 'attempted', 'achieved', 'worked', 'did_not_work', 'tagline');--> statement-breakpoint
CREATE TYPE "cat"."editorial_status" AS ENUM('draft', 'submitted', 'under_review', 'published', 'needs_update', 'archived');--> statement-breakpoint
CREATE TYPE "cat"."endorsement" AS ENUM('cat_authored', 'cat_endorsed', 'cat_listed');--> statement-breakpoint
CREATE TYPE "cat"."entry_status" AS ENUM('ongoing', 'completed', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "cat"."freshness_status" AS ENUM('pending_review', 'redrafted', 'dismissed_no_change_warranted');--> statement-breakpoint
CREATE TYPE "cat"."geo_type" AS ENUM('state', 'district', 'block', 'village', 'landscape', 'river_basin', 'agro_climatic_zone');--> statement-breakpoint
CREATE TYPE "cat"."ingestion_run_type" AS ENUM('registry_crawl', 'discovery_agent', 'draft_writer', 'freshness_sweep');--> statement-breakpoint
CREATE TYPE "cat"."ingestion_status" AS ENUM('running', 'succeeded', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "cat"."language" AS ENUM('english', 'hindi', 'regional');--> statement-breakpoint
CREATE TYPE "cat"."org_relationship" AS ENUM('level_1_mentioned', 'level_2_platform_partner');--> statement-breakpoint
CREATE TYPE "cat"."org_role" AS ENUM('lead_implementer', 'supporting_implementer', 'funder', 'knowledge_partner', 'government_counterpart', 'research_collaborator');--> statement-breakpoint
CREATE TYPE "cat"."org_type" AS ENUM('ngo', 'government', 'foundation', 'research', 'private', 'network', 'multilateral');--> statement-breakpoint
CREATE TYPE "cat"."provenance" AS ENUM('sourced', 'self_submitted');--> statement-breakpoint
CREATE TYPE "cat"."resource_type" AS ENUM('report', 'paper', 'policy_brief', 'video', 'photo_gallery', 'dataset', 'presentation', 'external_link', 'book');--> statement-breakpoint
CREATE TYPE "cat"."revision_trigger" AS ENUM('manual_edit', 'freshness_redraft', 'submission_approval');--> statement-breakpoint
CREATE TYPE "cat"."scale_band" AS ENUM('pilot', 'block', 'district', 'multi_district', 'state', 'multi_state', 'national');--> statement-breakpoint
CREATE TYPE "cat"."source_type" AS ENUM('gov_site', 'ngo_site', 'research_inst', 'foundation', 'news_outlet', 'partner_report', 'other');--> statement-breakpoint
CREATE TYPE "cat"."submission_status" AS ENUM('pending_review', 'approved', 'returned_for_edits', 'rejected');--> statement-breakpoint
CREATE TYPE "cat"."submission_type" AS ENUM('entry', 'resource', 'news_item', 'entry_update');--> statement-breakpoint
CREATE TYPE "cat"."trust_tier" AS ENUM('tier_1_authoritative', 'tier_2_trusted', 'tier_3_emerging');--> statement-breakpoint
CREATE TYPE "cat"."user_role" AS ENUM('reader', 'contributor', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "cat"."visibility" AS ENUM('public', 'private', 'internal');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."agent_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(64) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"was_refused" boolean DEFAULT false NOT NULL,
	"refusal_reason" text,
	"cited_entry_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."agent_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"turn_index" integer NOT NULL,
	"user_message" text NOT NULL,
	"assistant_message" text NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb,
	"cited_entry_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."discovery_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposed_title" varchar(200) NOT NULL,
	"proposed_summary" text NOT NULL,
	"proposed_themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proposed_geography_name" varchar(120),
	"proposed_state_code" varchar(4),
	"proposed_lead_organisation_name" varchar(200),
	"source_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" real,
	"status" "cat"."candidate_status" DEFAULT 'pending_triage' NOT NULL,
	"duplicate_of_entry_id" uuid,
	"discovered_in_run_id" uuid,
	"triaged_by_user_id" uuid,
	"triaged_at" timestamp,
	"dismissal_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."draft_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"tagline" varchar(240),
	"primary_theme_slug" varchar(80),
	"primary_geography_name" varchar(120),
	"primary_state_code" varchar(4),
	"scale_band" "cat"."scale_band",
	"start_year" integer,
	"end_year" integer,
	"context" text,
	"what_was_attempted" text,
	"what_was_achieved" text,
	"what_worked" text,
	"what_did_not_work" text,
	"lead_organisation_name" varchar(200),
	"source_passages" jsonb DEFAULT '[]'::jsonb,
	"citation_map" jsonb DEFAULT '[]'::jsonb,
	"drafted_in_run_id" uuid,
	"draft_confidence" real,
	"editor_notes" text,
	"approved_for_publication_at" timestamp,
	"approved_by_user_id" uuid,
	"promoted_from_candidate_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"tagline" varchar(240) NOT NULL,
	"provenance" "cat"."provenance" DEFAULT 'sourced' NOT NULL,
	"scale_band" "cat"."scale_band" NOT NULL,
	"primary_theme_id" uuid NOT NULL,
	"primary_geography_id" uuid NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer,
	"status" "cat"."entry_status" DEFAULT 'ongoing' NOT NULL,
	"context" text NOT NULL,
	"what_was_attempted" text NOT NULL,
	"what_was_achieved" text NOT NULL,
	"what_worked" text NOT NULL,
	"what_did_not_work" text,
	"headline_metrics" jsonb,
	"investment_quantum_inr_cr" real,
	"investment_visibility" "cat"."visibility" DEFAULT 'public' NOT NULL,
	"cover_image_url" text,
	"gallery_image_urls" jsonb DEFAULT '[]'::jsonb,
	"public_contact_person_id" uuid,
	"external_links" jsonb DEFAULT '[]'::jsonb,
	"submitted_by_user_id" uuid,
	"submission_date" timestamp DEFAULT now() NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"published_date" timestamp,
	"last_reviewed_at" timestamp,
	"needs_update_reason" text,
	"editorial_status" "cat"."editorial_status" DEFAULT 'draft' NOT NULL,
	"editorial_notes" text,
	"cat_endorsement" "cat"."endorsement" DEFAULT 'cat_listed' NOT NULL,
	"ai_draft_source_id" uuid,
	CONSTRAINT "entries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."entry_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_kind" "cat"."chunk_kind" NOT NULL,
	"embedding" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."entry_geographies" (
	"entry_id" uuid NOT NULL,
	"geography_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "entry_geographies_entry_id_geography_id_pk" PRIMARY KEY("entry_id","geography_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."entry_organisations" (
	"entry_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"role" "cat"."org_role" NOT NULL,
	CONSTRAINT "entry_organisations_entry_id_organisation_id_role_pk" PRIMARY KEY("entry_id","organisation_id","role")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."entry_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"revised_at" timestamp DEFAULT now() NOT NULL,
	"revised_by_user_id" uuid,
	"fields_changed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"before_snapshot" jsonb,
	"after_snapshot" jsonb,
	"trigger" "cat"."revision_trigger" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."entry_themes" (
	"entry_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "entry_themes_entry_id_theme_id_pk" PRIMARY KEY("entry_id","theme_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."freshness_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"detected_in_run_id" uuid,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"source_url" text NOT NULL,
	"diff_summary" text NOT NULL,
	"status" "cat"."freshness_status" DEFAULT 'pending_review' NOT NULL,
	"reviewed_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."geographies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"type" "cat"."geo_type" NOT NULL,
	"parent_id" uuid,
	"state_code" varchar(4),
	"latitude" double precision,
	"longitude" double precision,
	"display_on_map" boolean DEFAULT true NOT NULL,
	CONSTRAINT "geographies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_type" "cat"."ingestion_run_type" NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" "cat"."ingestion_status" DEFAULT 'running' NOT NULL,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"items_yielded" integer DEFAULT 0 NOT NULL,
	"cost_usd" real,
	"error_log" text,
	"triggered_by" varchar(16) DEFAULT 'cron' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."news_geographies" (
	"news_id" uuid NOT NULL,
	"geography_id" uuid NOT NULL,
	CONSTRAINT "news_geographies_news_id_geography_id_pk" PRIMARY KEY("news_id","geography_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."news_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"headline" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"summary" text NOT NULL,
	"source_url" text NOT NULL,
	"source_organisation_id" uuid,
	"publication_date" timestamp NOT NULL,
	"linked_entry_id" uuid,
	"linked_organisation_id" uuid,
	"cover_image_url" text,
	"submitted_by_user_id" uuid,
	"editorial_status" "cat"."editorial_status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "news_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."news_themes" (
	"news_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	CONSTRAINT "news_themes_news_id_theme_id_pk" PRIMARY KEY("news_id","theme_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"short_name" varchar(30),
	"type" "cat"."org_type" NOT NULL,
	"relationship_level" "cat"."org_relationship" DEFAULT 'level_1_mentioned' NOT NULL,
	"headquarters_geography_id" uuid,
	"description" text NOT NULL,
	"founded_year" integer,
	"website" text,
	"verified_contact_person_id" uuid,
	"logo_url" text,
	"cat_relationship_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"organisation_id" uuid,
	"role_title" varchar(120),
	"email" text,
	"phone" text,
	"visibility" "cat"."visibility" DEFAULT 'internal' NOT NULL,
	"linkedin_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."resource_authors" (
	"resource_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "resource_authors_resource_id_person_id_pk" PRIMARY KEY("resource_id","person_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."resource_entries" (
	"resource_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	CONSTRAINT "resource_entries_resource_id_entry_id_pk" PRIMARY KEY("resource_id","entry_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."resource_geographies" (
	"resource_id" uuid NOT NULL,
	"geography_id" uuid NOT NULL,
	CONSTRAINT "resource_geographies_resource_id_geography_id_pk" PRIMARY KEY("resource_id","geography_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."resource_themes" (
	"resource_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	CONSTRAINT "resource_themes_resource_id_theme_id_pk" PRIMARY KEY("resource_id","theme_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"type" "cat"."resource_type" NOT NULL,
	"description" text NOT NULL,
	"file_url" text,
	"external_url" text,
	"file_size_bytes" integer,
	"language" "cat"."language" DEFAULT 'english' NOT NULL,
	"publication_year" integer NOT NULL,
	"publisher_organisation_id" uuid,
	"author_free_text" text,
	"cover_image_url" text,
	"submitted_by_user_id" uuid,
	"submission_date" timestamp DEFAULT now() NOT NULL,
	"editorial_status" "cat"."editorial_status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "resources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."source_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"source_type" "cat"."source_type" NOT NULL,
	"trust_tier" "cat"."trust_tier" DEFAULT 'tier_2_trusted' NOT NULL,
	"crawl_frequency_days" integer DEFAULT 7 NOT NULL,
	"last_fetched_at" timestamp,
	"last_content_hash" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "source_registry_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_type" "cat"."submission_type" NOT NULL,
	"submitted_object_id" uuid NOT NULL,
	"submitter_user_id" uuid NOT NULL,
	"submitter_organisation_id" uuid,
	"submitted_date" timestamp DEFAULT now() NOT NULL,
	"status" "cat"."submission_status" DEFAULT 'pending_review' NOT NULL,
	"reviewer_user_id" uuid,
	"review_notes" text,
	"decision_date" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"colour_hex" varchar(7) NOT NULL,
	"icon_name" varchar(40),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "themes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"role" "cat"."user_role" DEFAULT 'reader' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cat"."verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "cat"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."agent_turns" ADD CONSTRAINT "agent_turns_conversation_id_agent_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "cat"."agent_conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."discovery_candidates" ADD CONSTRAINT "discovery_candidates_duplicate_of_entry_id_entries_id_fk" FOREIGN KEY ("duplicate_of_entry_id") REFERENCES "cat"."entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."discovery_candidates" ADD CONSTRAINT "discovery_candidates_discovered_in_run_id_ingestion_runs_id_fk" FOREIGN KEY ("discovered_in_run_id") REFERENCES "cat"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."discovery_candidates" ADD CONSTRAINT "discovery_candidates_triaged_by_user_id_users_id_fk" FOREIGN KEY ("triaged_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."draft_entries" ADD CONSTRAINT "draft_entries_drafted_in_run_id_ingestion_runs_id_fk" FOREIGN KEY ("drafted_in_run_id") REFERENCES "cat"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."draft_entries" ADD CONSTRAINT "draft_entries_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."draft_entries" ADD CONSTRAINT "draft_entries_promoted_from_candidate_id_discovery_candidates_id_fk" FOREIGN KEY ("promoted_from_candidate_id") REFERENCES "cat"."discovery_candidates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entries" ADD CONSTRAINT "entries_primary_theme_id_themes_id_fk" FOREIGN KEY ("primary_theme_id") REFERENCES "cat"."themes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entries" ADD CONSTRAINT "entries_primary_geography_id_geographies_id_fk" FOREIGN KEY ("primary_geography_id") REFERENCES "cat"."geographies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entries" ADD CONSTRAINT "entries_public_contact_person_id_persons_id_fk" FOREIGN KEY ("public_contact_person_id") REFERENCES "cat"."persons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entries" ADD CONSTRAINT "entries_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_embeddings" ADD CONSTRAINT "entry_embeddings_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "cat"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_geographies" ADD CONSTRAINT "entry_geographies_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "cat"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_geographies" ADD CONSTRAINT "entry_geographies_geography_id_geographies_id_fk" FOREIGN KEY ("geography_id") REFERENCES "cat"."geographies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_organisations" ADD CONSTRAINT "entry_organisations_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "cat"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_organisations" ADD CONSTRAINT "entry_organisations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "cat"."organisations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_revisions" ADD CONSTRAINT "entry_revisions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "cat"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_revisions" ADD CONSTRAINT "entry_revisions_revised_by_user_id_users_id_fk" FOREIGN KEY ("revised_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_themes" ADD CONSTRAINT "entry_themes_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "cat"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."entry_themes" ADD CONSTRAINT "entry_themes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "cat"."themes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."freshness_flags" ADD CONSTRAINT "freshness_flags_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "cat"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."freshness_flags" ADD CONSTRAINT "freshness_flags_detected_in_run_id_ingestion_runs_id_fk" FOREIGN KEY ("detected_in_run_id") REFERENCES "cat"."ingestion_runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."freshness_flags" ADD CONSTRAINT "freshness_flags_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_geographies" ADD CONSTRAINT "news_geographies_news_id_news_items_id_fk" FOREIGN KEY ("news_id") REFERENCES "cat"."news_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_geographies" ADD CONSTRAINT "news_geographies_geography_id_geographies_id_fk" FOREIGN KEY ("geography_id") REFERENCES "cat"."geographies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_items" ADD CONSTRAINT "news_items_source_organisation_id_organisations_id_fk" FOREIGN KEY ("source_organisation_id") REFERENCES "cat"."organisations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_items" ADD CONSTRAINT "news_items_linked_entry_id_entries_id_fk" FOREIGN KEY ("linked_entry_id") REFERENCES "cat"."entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_items" ADD CONSTRAINT "news_items_linked_organisation_id_organisations_id_fk" FOREIGN KEY ("linked_organisation_id") REFERENCES "cat"."organisations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_items" ADD CONSTRAINT "news_items_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_themes" ADD CONSTRAINT "news_themes_news_id_news_items_id_fk" FOREIGN KEY ("news_id") REFERENCES "cat"."news_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."news_themes" ADD CONSTRAINT "news_themes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "cat"."themes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."organisations" ADD CONSTRAINT "organisations_headquarters_geography_id_geographies_id_fk" FOREIGN KEY ("headquarters_geography_id") REFERENCES "cat"."geographies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."organisations" ADD CONSTRAINT "organisations_verified_contact_person_id_persons_id_fk" FOREIGN KEY ("verified_contact_person_id") REFERENCES "cat"."persons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_authors" ADD CONSTRAINT "resource_authors_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "cat"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_authors" ADD CONSTRAINT "resource_authors_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "cat"."persons"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_entries" ADD CONSTRAINT "resource_entries_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "cat"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_entries" ADD CONSTRAINT "resource_entries_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "cat"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_geographies" ADD CONSTRAINT "resource_geographies_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "cat"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_geographies" ADD CONSTRAINT "resource_geographies_geography_id_geographies_id_fk" FOREIGN KEY ("geography_id") REFERENCES "cat"."geographies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_themes" ADD CONSTRAINT "resource_themes_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "cat"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resource_themes" ADD CONSTRAINT "resource_themes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "cat"."themes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resources" ADD CONSTRAINT "resources_publisher_organisation_id_organisations_id_fk" FOREIGN KEY ("publisher_organisation_id") REFERENCES "cat"."organisations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."resources" ADD CONSTRAINT "resources_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "cat"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."source_registry" ADD CONSTRAINT "source_registry_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."submissions" ADD CONSTRAINT "submissions_submitter_user_id_users_id_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "cat"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."submissions" ADD CONSTRAINT "submissions_submitter_organisation_id_organisations_id_fk" FOREIGN KEY ("submitter_organisation_id") REFERENCES "cat"."organisations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cat"."submissions" ADD CONSTRAINT "submissions_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "cat"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entries_slug_idx" ON "cat"."entries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_status_idx" ON "cat"."entries" USING btree ("editorial_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_published_idx" ON "cat"."entries" USING btree ("published_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_primary_theme_idx" ON "cat"."entries" USING btree ("primary_theme_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_primary_geo_idx" ON "cat"."entries" USING btree ("primary_geography_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_parent_idx" ON "cat"."geographies" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_state_idx" ON "cat"."geographies" USING btree ("state_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orgs_slug_idx" ON "cat"."organisations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_active_idx" ON "cat"."source_registry" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "themes_order_idx" ON "cat"."themes" USING btree ("display_order");