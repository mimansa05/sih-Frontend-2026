import type { RiskLevel, RiskZone } from "@/lib/discatra-data";
import { fromPosition, haversineKm, pointToSegmentKm, type LngLat, type Position } from "./geo";
import type { BlockedZone } from "./types";

/**
 * Route-safety validation. Pure geometry + risk data, no UI and no routing
 * provider — the routing service calls it while searching, and the relocation
 * service calls it again on the finished route so nothing reaches the map
 * unvalidated.
 */

/**
 * Avoidance buffer per risk level, in km.
 *
 * `moderate` is 0: a yellow "monitor" observation is not a no-go area, so it
 * never blocks a route. Only red (critical) and orange (high) zones do.
 * These buffers are intentionally tighter than the heatmap's visual radius —
 * they describe the corridor a convoy must not enter, not the extent of the
 * hazard field drawn on the map.
 */
export const BLOCK_RADIUS_KM: Record<RiskLevel, number> = {
  critical: 10,
  high: 6,
  moderate: 0,
};

export const isBlockingLevel = (level: RiskLevel) => BLOCK_RADIUS_KM[level] > 0;

/**
 * Build the no-go set from the live risk layer.
 *
 * `excludeIds` exists for one reason: the evacuation origin is itself a red
 * zone. People are already inside it, so it cannot block its own departure —
 * every *other* red/high zone still does.
 */
export function blockedZonesFrom(zones: RiskZone[], excludeIds: string[] = []): BlockedZone[] {
  const skip = new Set(excludeIds);
  return zones
    .filter((z) => !skip.has(z.id) && isBlockingLevel(z.level))
    .map((z) => ({
      id: z.id,
      name: z.name,
      level: z.level,
      center: { lng: z.lng, lat: z.lat },
      radiusKm: BLOCK_RADIUS_KM[z.level],
    }));
}

/** True when a point sits inside a no-go area. */
export function isPointBlocked(point: LngLat, blocked: BlockedZone[]): BlockedZone | null {
  for (const zone of blocked) {
    if (haversineKm(zone.center, point) < zone.radiusKm) return zone;
  }
  return null;
}

/** Zones a single straight segment cuts through. */
export function segmentBlockers(a: LngLat, b: LngLat, blocked: BlockedZone[]): BlockedZone[] {
  return blocked.filter((z) => pointToSegmentKm(z.center, a, b) < z.radiusKm);
}

export const isSegmentSafe = (a: LngLat, b: LngLat, blocked: BlockedZone[]): boolean =>
  !blocked.some((z) => pointToSegmentKm(z.center, a, b) < z.radiusKm);

export interface RouteSafetyResult {
  isSafe: boolean;
  /** Ids of every no-go zone the path enters. */
  blockedZones: string[];
  /** Names, for display. */
  blockedZoneNames: string[];
}

/**
 * The single source of truth for "may this route be shown to anyone?".
 *
 * Accepts either a polyline of points or GeoJSON `[lng, lat]` positions so both
 * the routing search and the finished route model can be checked with the same
 * function.
 */
export function validateRouteSafety(
  path: LngLat[] | Position[],
  blocked: BlockedZone[],
): RouteSafetyResult {
  const points: LngLat[] = path.map((p) =>
    Array.isArray(p) ? fromPosition(p as Position) : (p as LngLat),
  );
  const hits = new Map<string, string>();
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    for (const zone of segmentBlockers(a, b, blocked)) hits.set(zone.id, zone.name);
  }
  return {
    isSafe: hits.size === 0,
    blockedZones: [...hits.keys()],
    blockedZoneNames: [...hits.values()],
  };
}
