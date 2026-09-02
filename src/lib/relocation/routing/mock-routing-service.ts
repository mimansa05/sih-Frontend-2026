import { toPosition } from "../geo";
import { findSafePolyline } from "./safe-path";
import type { RouteCandidate, RouteRequest, RoutingService } from "./types";

/**
 * Development routing provider — STRAIGHT-LINE GEOMETRY, NOT ROAD ROUTING.
 *
 * It returns the shortest hazard-free polyline from the shared safe-path search
 * (see `./safe-path.ts`). Routes are safe, but they cut across country rather
 * than following roads, so this is only the offline fallback for the road
 * router — never the primary provider when the network is available.
 */
export function createMockRoutingService(): RoutingService {
  return {
    id: "discatra-straight-line",
    mode: "mock",
    label: "estimated straight-line",

    async findSafeRoute({ source, destination, blockedZones }: RouteRequest) {
      const result = findSafePolyline(source, destination, blockedZones);
      if (!result) return null;
      return {
        coordinates: result.path.map(toPosition),
        distance: result.distance,
        direct: result.direct,
        avoidedZones: result.avoidedZones,
        provider: "discatra-straight-line",
        mode: "mock",
      } satisfies RouteCandidate;
    },
  };
}
