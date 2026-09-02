import { roundTo, type LngLat, type Position } from "../geo";
import { isPointBlocked, validateRouteSafety } from "../route-safety";
import type { BlockedZone } from "../types";
import { relevantZones, ROAD_CLEARANCES, safeDetourWaypoints } from "./safe-path";
import type { RouteCandidate, RouteRequest, RoutingService } from "./types";

/**
 * Road routing provider (OSRM HTTP API).
 *
 * Returns real road geometry from the OpenStreetMap road network rather than a
 * straight line, and still guarantees the safety rule: every candidate the
 * backend returns is validated against the hazard buffers before it can be
 * used, and an unsafe road route is rejected, never displayed.
 *
 * Strategy, in order:
 *   1. ask for the plain road route plus alternatives, keep the shortest SAFE one
 *   2. if every alternative crosses a hazard, compute safe via-points from the
 *      geometric search and ask the road network to route *through* them
 *   3. if that is still unsafe, give up — `null` means NO SAFE ROUTE
 *
 * Network failures fall through to `fallback` (the straight-line provider) so
 * the dashboard still works offline; the returned candidate reports which
 * provider actually produced it so the UI never passes an estimate off as a
 * road route.
 */

export interface OsrmOptions {
  /** OSRM base URL. The public demo server is used by default. */
  endpoint: string;
  profile: string;
  /** Alternatives to request on the first attempt. */
  alternatives: number;
  timeoutMs: number;
  /** Used when the routing backend cannot be reached. */
  fallback: RoutingService | null;
}

export const DEFAULT_OSRM: OsrmOptions = {
  endpoint: "https://router.project-osrm.org",
  profile: "driving",
  alternatives: 3,
  timeoutMs: 12000,
  fallback: null,
};

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: { coordinates: Position[] };
}

/** Same request, same answer — keeps repeat planning off the network. */
const cache = new Map<string, OsrmRoute[] | null>();

const coordList = (points: LngLat[]) =>
  points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");

async function fetchRoutes(
  points: LngLat[],
  options: OsrmOptions,
  alternatives: number,
): Promise<OsrmRoute[] | null> {
  const url =
    `${options.endpoint}/route/v1/${options.profile}/${coordList(points)}` +
    `?overview=full&geometries=geojson&alternatives=${alternatives}`;

  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const body = (await response.json()) as { code: string; routes?: OsrmRoute[] };
    const routes = body.code === "Ok" && body.routes?.length ? body.routes : null;
    cache.set(url, routes);
    return routes;
  } finally {
    clearTimeout(timer);
  }
}

const toCandidate = (
  route: OsrmRoute,
  direct: boolean,
  avoidedZones: string[],
): RouteCandidate => ({
  coordinates: route.geometry.coordinates,
  distance: roundTo(route.distance / 1000, 1),
  direct,
  avoidedZones,
  provider: "osrm",
  mode: "live",
  duration: Math.max(1, Math.round(route.duration / 60)),
  road: true,
});

/** Shortest route whose geometry clears every hazard buffer. */
function shortestSafe(routes: OsrmRoute[], zones: BlockedZone[]): OsrmRoute | null {
  const safe = routes.filter((r) => validateRouteSafety(r.geometry.coordinates, zones).isSafe);
  if (!safe.length) return null;
  return safe.reduce((best, r) => (r.distance < best.distance ? r : best));
}

/** Every hazard the backend's own best route would have driven through. */
function blockersOf(routes: OsrmRoute[], zones: BlockedZone[]): string[] {
  const first = routes[0];
  return first ? validateRouteSafety(first.geometry.coordinates, zones).blockedZones : [];
}

export function createOsrmRoutingService(overrides: Partial<OsrmOptions> = {}): RoutingService {
  const options: OsrmOptions = { ...DEFAULT_OSRM, ...overrides };

  return {
    id: "osrm-road-network",
    mode: "live",
    label: "OSRM road network",

    async findSafeRoute(request: RouteRequest) {
      const { source, destination, blockedZones } = request;
      const zones = relevantZones(source, destination, blockedZones);

      // A site inside a hazard buffer is never a destination, whatever the roads say.
      if (isPointBlocked(destination, zones)) return null;

      try {
        // 1. Plain road route + alternatives.
        const routes = await fetchRoutes([source, destination], options, options.alternatives);
        if (routes) {
          const safe = shortestSafe(routes, zones);
          if (safe) return toCandidate(safe, true, []);

          // 2. Steer the road network around the hazards using safe via-points.
          const avoided = blockersOf(routes, zones);
          for (const clearance of ROAD_CLEARANCES) {
            const waypoints = safeDetourWaypoints(source, destination, zones, clearance);
            for (const via of waypointAttempts(waypoints)) {
              const detour = await fetchRoutes([source, ...via, destination], options, 1);
              if (!detour) continue;
              const safeDetour = shortestSafe(detour, zones);
              if (safeDetour) return toCandidate(safeDetour, false, avoided);
            }
          }
        }
      } catch {
        // Unreachable backend — fall back to estimated geometry rather than
        // claiming no safe route exists.
        if (options.fallback) return options.fallback.findSafeRoute(request);
        return null;
      }

      // The road network genuinely offers no hazard-free way through.
      return null;
    },
  };
}

/**
 * Via-point sets to try, most constrained first. Road snapping can drag a
 * via-point onto an unsafe road, so a sparser set often succeeds where the full
 * one does not.
 */
function waypointAttempts(waypoints: LngLat[]): LngLat[][] {
  if (!waypoints.length) return [];
  const attempts: LngLat[][] = [waypoints];
  if (waypoints.length > 1) {
    const middle = waypoints[Math.floor(waypoints.length / 2)];
    if (middle) attempts.push([middle]);
  }
  return attempts;
}
