-- Unified editor inbox (CAT database only): every waiting item can be assigned
-- and snoozed through cat.triage_items, not just intervention changes.
ALTER TABLE "cat".triage_items DROP CONSTRAINT IF EXISTS triage_items_kind_check;
ALTER TABLE "cat".triage_items ADD CONSTRAINT triage_items_kind_check
  CHECK (kind IN ('discovery_candidate','org_submission','contribution','factsheet_review',
                  'intervention_change','access_request','source_change'));
