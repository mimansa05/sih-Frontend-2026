import { availableCapacity, type PlanSite, type RelocationPlan } from "./types";

/**
 * Plan → map geometry. Kept out of the map component so the layers are a pure
 * projection of the validated plan: if a route is not in the plan it cannot
 * appear on the map.
 */

export const routeFeatureId = (planSite: PlanSite) =>
  `${planSite.route?.source ?? "?"}->${planSite.site.id}`;

/** BLUE relocation routes. Only validated safe routes are emitted. */
export function planRoutesGeoJSON(plan: RelocationPlan | null) {
  const features = (plan?.sites ?? [])
    .filter((s) => s.route?.isSafe)
    .map((s) => ({
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: s.route!.coordinates },
      properties: {
        routeId: routeFeatureId(s),
        siteId: s.site.id,
        siteName: s.site.name,
        allocation: s.allocation,
        distance: s.route!.distance,
        estimatedTime: s.route!.estimatedTime,
        assigned: s.allocation > 0,
        direct: s.route!.direct,
        originId: s.origin.id,
        originName: s.origin.name,
      },
    }));
  return { type: "FeatureCollection" as const, features };
}

/** Safe-site markers for every site considered in the plan. */
export function planSitesGeoJSON(plan: RelocationPlan | null) {
  const features = (plan?.sites ?? []).map((s) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [s.site.lng, s.site.lat] },
    properties: {
      id: s.site.id,
      routeId: routeFeatureId(s),
      name: s.site.name,
      kind: s.site.kind,
      district: s.site.district,
      state: s.site.state,
      totalCapacity: s.site.totalCapacity,
      occupiedCapacity: s.site.occupiedCapacity,
      availableCapacity: availableCapacity(s.site),
      safetyScore: s.site.safetyScore,
      helpline: s.site.helpline,
      allocation: s.allocation,
      distance: s.route?.distance ?? s.distance,
      estimatedTime: s.route?.estimatedTime ?? 0,
      status: s.status,
      routeStatus:
        s.status === "no_safe_route"
          ? "NO SAFE ROUTE"
          : s.allocation > 0
            ? "SAFE"
            : "SAFE (standby)",
    },
  }));
  return { type: "FeatureCollection" as const, features };
}

/**
 * Departure points for the batches that actually received people — drawn so the
 * map shows each group leaving from its own part of the hazard zone.
 */
export function planOriginsGeoJSON(plan: RelocationPlan | null) {
  const seen = new Set<string>();
  const features = (plan?.sites ?? [])
    .filter((s) => s.allocation > 0 && s.route?.isSafe)
    .filter((s) => !seen.has(s.origin.id) && seen.add(s.origin.id) !== undefined)
    .map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [s.origin.lng, s.origin.lat] },
      properties: {
        id: s.origin.id,
        routeId: routeFeatureId(s),
        name: s.origin.name,
        allocation: s.allocation,
        siteName: s.site.name,
      },
    }));
  return { type: "FeatureCollection" as const, features };
}

export const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection" as const, features: [] };
