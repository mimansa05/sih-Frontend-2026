import { haversineKm, pathLengthKm, ringAround, type LngLat } from "../geo";
import { isPointBlocked, isSegmentSafe, validateRouteSafety } from "../route-safety";
import type { BlockedZone } from "../types";

/**
 * Geometric safe-path search, shared by every routing provider.
 *
 * It answers "which way round the hazards?" on a visibility graph:
 *
 *   nodes  = source, destination, and a ring of waypoints just outside every
 *            blocking zone near the corridor
 *   edges  = every node pair whose straight segment clears all blocked zones
 *   answer = Dijkstra shortest path over those edges
 *
 * Because an edge only exists when it is safe, any path this returns is safe by
 * construction, and being a shortest path it is the shortest safe alternative
 * rather than an arbitrary detour.
 *
 * The development router uses the path as-is. The road router uses its interior
 * points as via-points, which is how a real road route is steered around a red
 * zone instead of through it.
 */

/**
 * Waypoints sit this fraction outside a zone's avoidance buffer.
 *
 * The straight-line router wants them tight (a short detour). A road router
 * wants them pushed further out, because a via-point hugging the buffer snaps
 * straight back onto the same hazardous road — see `roadClearances` below.
 */
const CLEARANCE = 1.08;
/** Waypoints sampled per blocking zone. More = smoother detours, slower search. */
const RING_POINTS = 24;
/** Zones further than this beyond the direct line are irrelevant to the corridor. */
const CORRIDOR_MARGIN_KM = 60;

/** Hazards close enough to the source→destination corridor to matter. */
export function relevantZones(
  source: LngLat,
  destination: LngLat,
  zones: BlockedZone[],
): BlockedZone[] {
  const direct = haversineKm(source, destination);
  return zones.filter(
    (z) =>
      haversineKm(z.center, source) + haversineKm(z.center, destination) <=
      direct + 2 * (CORRIDOR_MARGIN_KM + z.radiusKm),
  );
}

function buildNodes(
  source: LngLat,
  destination: LngLat,
  zones: BlockedZone[],
  clearance: number,
): LngLat[] {
  const nodes: LngLat[] = [source, destination];
  for (const zone of zones) {
    for (const point of ringAround(zone.center, zone.radiusKm * clearance, RING_POINTS)) {
      // Drop waypoints that fall inside a *different* zone — they would be
      // unusable and only slow the search down.
      if (!isPointBlocked(point, zones)) nodes.push(point);
    }
  }
  return nodes;
}

/** Plain O(n²) Dijkstra — n is a few hundred nodes at most. */
function dijkstra(nodes: LngLat[], zones: BlockedZone[]): LngLat[] | null {
  const n = nodes.length;
  const at = (i: number) => nodes[i] as LngLat;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  dist[0] = 0;

  for (;;) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && (dist[i] as number) < best) {
        best = dist[i] as number;
        u = i;
      }
    }
    if (u === -1) break;
    if (u === 1) break; // reached the destination
    done[u] = true;

    const du = dist[u] as number;
    for (let v = 0; v < n; v++) {
      if (done[v] || v === u) continue;
      const step = haversineKm(at(u), at(v));
      if (du + step >= (dist[v] as number)) continue;
      if (!isSegmentSafe(at(u), at(v), zones)) continue;
      dist[v] = du + step;
      prev[v] = u;
    }
  }

  if (!Number.isFinite(dist[1] as number)) return null;
  const path: LngLat[] = [];
  for (let i = 1; i !== -1; i = prev[i] as number) path.unshift(at(i));
  return path;
}

export interface SafePathResult {
  path: LngLat[];
  distance: number;
  /** True when the straight line was already clear. */
  direct: boolean;
  /** Zones the straight line would have crossed. */
  avoidedZones: string[];
}

/** Shortest hazard-free polyline, or null when the destination is unreachable. */
export function findSafePolyline(
  source: LngLat,
  destination: LngLat,
  blockedZones: BlockedZone[],
  clearance: number = CLEARANCE,
): SafePathResult | null {
  const zones = relevantZones(source, destination, blockedZones);
  if (isPointBlocked(destination, zones)) return null;

  const straight = validateRouteSafety([source, destination], zones);
  if (straight.isSafe) {
    return {
      path: [source, destination],
      distance: haversineKm(source, destination),
      direct: true,
      avoidedZones: [],
    };
  }

  const path = dijkstra(buildNodes(source, destination, zones, clearance), zones);
  if (!path || !validateRouteSafety(path, zones).isSafe) return null;

  return {
    path,
    distance: pathLengthKm(path),
    direct: false,
    avoidedZones: straight.blockedZones,
  };
}

/**
 * Interior points of the safe polyline — the via-points a road router should be
 * steered through. Empty when the straight corridor is already clear.
 */
export function safeDetourWaypoints(
  source: LngLat,
  destination: LngLat,
  blockedZones: BlockedZone[],
  clearance: number = CLEARANCE,
): LngLat[] {
  const result = findSafePolyline(source, destination, blockedZones, clearance);
  if (!result || result.direct) return [];
  return result.path.slice(1, -1);
}

/**
 * Clearances to try when steering a *road* route around a hazard, widest last.
 * A tight via-point usually snaps back onto the blocked road; pushing it out
 * forces the router onto a genuinely different road, if one exists.
 */
export const ROAD_CLEARANCES = [1.15, 1.6, 2.4] as const;
