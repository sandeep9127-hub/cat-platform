# Geographic reference data

`district-centroids-2011.json`: one point per Census 2011 district (641), computed as the
area-weighted centroid of each district polygon in datameet's
[`Districts/Census_2011/2011_Dist`](https://github.com/datameet/maps/tree/master/Districts/Census_2011)
shapefile (downloaded 21 Nov 2026). Fields: `state` and `district` as spelled in the source,
`census` (census code), `lat`, `lon` (WGS84, 5 decimals).

Loaded into `cat.district_centroids` by `scripts/load-districts.ts`. Used to place Solutions Atlas fact
sheets at district level (`drizzle/sql/2026-11-21_factsheet_geo.sql`). Telangana's districts
appear under Andhra Pradesh in the 2011 data; the loader assigns them to TG.
