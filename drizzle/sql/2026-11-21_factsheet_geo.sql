-- Solutions Atlas placement (CAT database only).
--
-- Each fact sheet gets:
--   geo_precision  'district' | 'state' | 'national'
--   geo_points     [{lat, lon, district | state}] (empty for national)
--   latitude/longitude = the first point, when there is one
-- National and multi-state programmes have no points: the Atlas lists them in a
-- "Nationwide" strip instead of dropping a misleading dot on a state centre.
--
-- Placement is done by a trigger, so every writer (generator, admin editor,
-- scripts) stays correct without app changes. District centroids are reference
-- data in their own table (cat.geographies is left as it is), loaded by
-- scripts/load-districts.ts from data/geo/district-centroids-2011.json.

ALTER TABLE "cat".solution_factsheets
  ADD COLUMN IF NOT EXISTS geo_precision text
    CHECK (geo_precision IN ('district', 'state', 'national')),
  ADD COLUMN IF NOT EXISTS geo_points jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION "cat".geo_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(coalesce(t, '')), '[^a-z]', '', 'g')
$$;

-- One row per Census 2011 district (datameet boundaries), plus alias rows for
-- other spellings and post-2011 districts pointing at a 2011 centroid.
CREATE TABLE IF NOT EXISTS "cat".district_centroids (
  state_code  text NOT NULL,
  name_norm   text NOT NULL,           -- geo_norm(name or alias)
  name        text NOT NULL,           -- 2011 district name the point belongs to
  census_code text,
  is_alias    boolean NOT NULL DEFAULT false,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  source      text NOT NULL DEFAULT 'datameet-census-2011',
  PRIMARY KEY (state_code, name_norm)
);

CREATE OR REPLACE FUNCTION "cat".place_factsheet() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  part  text;
  g     record;
  pts   jsonb := '[]'::jsonb;
  codes text[];
BEGIN
  IF NEW.state_code IS NULL OR NEW.scale_band IN ('national', 'multi_state') THEN
    NEW.geo_precision := 'national';
    NEW.geo_points := '[]'::jsonb;
    RETURN NEW;
  END IF;

  -- Telangana's districts sit under Andhra Pradesh in the 2011 boundaries.
  codes := CASE WHEN NEW.state_code IN ('TG', 'AP') THEN ARRAY['TG', 'AP'] ELSE ARRAY[NEW.state_code] END;

  -- "Akola (HQ); also Amravati, Buldhana" -> Akola | Amravati | Buldhana
  FOREACH part IN ARRAY regexp_split_to_array(
      regexp_replace(coalesce(NEW.district, ''), '\([^)]*\)', '', 'g'),
      '\s*(,|;|/|&|\mand\M|\malso\M)\s*')
  LOOP
    CONTINUE WHEN "cat".geo_norm(part) = '';
    SELECT d.name, d.latitude, d.longitude INTO g
      FROM "cat".district_centroids d
     WHERE d.state_code = ANY (codes) AND d.name_norm = "cat".geo_norm(part)
     ORDER BY d.is_alias
     LIMIT 1;
    IF FOUND AND NOT pts @> jsonb_build_array(jsonb_build_object('district', g.name)) THEN
      pts := pts || jsonb_build_array(jsonb_build_object('district', g.name, 'lat', g.latitude, 'lon', g.longitude));
    END IF;
  END LOOP;

  IF jsonb_array_length(pts) = 0 THEN
    SELECT gg.name, gg.latitude, gg.longitude INTO g
      FROM "cat".geographies gg
     WHERE gg.type = 'state' AND gg.state_code = NEW.state_code AND gg.latitude IS NOT NULL
     LIMIT 1;
    IF NOT FOUND THEN
      NEW.geo_precision := 'national';
      NEW.geo_points := '[]'::jsonb;
      RETURN NEW;
    END IF;
    pts := jsonb_build_array(jsonb_build_object('state', g.name, 'lat', g.latitude, 'lon', g.longitude));
    NEW.geo_precision := 'state';
  ELSE
    NEW.geo_precision := 'district';
  END IF;

  NEW.geo_points := pts;
  NEW.latitude := (pts->0->>'lat')::double precision;
  NEW.longitude := (pts->0->>'lon')::double precision;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS solution_factsheets_place ON "cat".solution_factsheets;
CREATE TRIGGER solution_factsheets_place
  BEFORE INSERT OR UPDATE OF state_code, district, scale_band ON "cat".solution_factsheets
  FOR EACH ROW EXECUTE FUNCTION "cat".place_factsheet();
