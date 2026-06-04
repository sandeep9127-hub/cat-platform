/**
 * Feature flags. Keep additive, removable surfaces gated here so they can be
 * switched off in one line without touching routes or nav wiring.
 *
 * INSIGHTS_ENABLED — the /insights "data room" window (landscape analytics).
 * Built additively on existing tables; flip to false to hide the nav link and
 * 404 the route. Nothing else depends on it.
 */
export const INSIGHTS_ENABLED = true;
