import { geoMercator, type GeoProjection } from "d3-geo";

/**
 * Single shared projection so state paths and programme dots align.
 * viewBox is 400×500; the projection is fit at component mount once the
 * GeoJSON is loaded. Same params used for projecting lat/lng dots.
 */
export const PROJECTION_VIEWBOX = { width: 400, height: 500 };

export function makeIndiaProjection(geojson: GeoJSON.FeatureCollection): GeoProjection {
  return geoMercator().fitSize([PROJECTION_VIEWBOX.width, PROJECTION_VIEWBOX.height], geojson);
}

export function scaleHaloRadius(scaleBand: string): number {
  switch (scaleBand) {
    case "pilot": return 8;
    case "block": return 10;
    case "district": return 12;
    case "multi_district": return 16;
    case "state": return 20;
    case "multi_state": return 24;
    case "national": return 30;
    default: return 12;
  }
}

export function scaleCoreRadius(scaleBand: string): number {
  switch (scaleBand) {
    case "pilot": return 3.5;
    case "block": return 3.8;
    case "district": return 4;
    case "multi_district": return 4.5;
    case "state": return 5;
    case "multi_state": return 5.3;
    case "national": return 5.8;
    default: return 4;
  }
}
