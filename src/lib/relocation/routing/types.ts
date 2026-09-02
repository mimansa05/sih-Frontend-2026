import type { LngLat, Position } from "../geo";
import type { BlockedZone } from "../types";

/**
 * Routing provider abstraction.
 *
 * The relocation UI never talks to a routing engine directly — it goes through
 * this interface, so a real GIS / OSRM / government road-network service can
 * replace the development implementation without touching a component.
 */

export interface RouteRequest {
  source: LngLat;
  destination: LngLat;
  /** No-go areas the returned geometry must not cross. */
  blockedZones: BlockedZone[];
}

export interface RouteCandidate {
  coordinates: Position[];
  /** Path length in km. */
  distance: number;
  /** True when no hazard detour was needed. */
  direct: boolean;
  /** Zones the plain shortest route would have crossed, that this path avoids. */
  avoidedZones: string[];
  /** Provider that actually produced the geometry (may be a fallback). */
  provider: string;
  /** Whether the geometry came from a real routing backend or the fallback. */
  mode: "mock" | "live";
  /** Travel time in minutes when the backend reports one. */
  duration?: number;
  /** True when the geometry follows a road network. */
  road?: boolean;
}

export interface RoutingService {
  readonly id: string;
  /**
   * `mock` = development geometry, `live` = a real routing backend. The UI
   * surfaces this so a demo is never mistaken for a real road route.
   */
  readonly mode: "mock" | "live";
  /** Short human-readable provider description, shown in the UI. */
  readonly label: string;
  /**
   * Resolve the shortest route that does not enter any blocked zone, or `null`
   * when no such route exists. Implementations must never fall back to an
   * unsafe path.
   */
  findSafeRoute(request: RouteRequest): Promise<RouteCandidate | null>;
}
