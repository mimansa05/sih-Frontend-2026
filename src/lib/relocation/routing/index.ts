import { createMockRoutingService } from "./mock-routing-service";
import { createOsrmRoutingService } from "./osrm-routing-service";
import type { RoutingService } from "./types";

/**
 * The routing provider the app uses.
 *
 * Real road routing over the OpenStreetMap network, with the straight-line
 * provider kept as an offline fallback so the dashboard still plans when the
 * routing backend is unreachable. Every route either provider returns is
 * validated against the hazard layer before it can be shown.
 *
 * To point this at a different engine (a government GIS service, a self-hosted
 * OSRM/Valhalla, GraphHopper…), implement `RoutingService` against it and swap
 * the value here — nothing else in the app changes.
 */
export const routingService: RoutingService = createOsrmRoutingService({
  fallback: createMockRoutingService(),
});

export { createMockRoutingService, createOsrmRoutingService };
export type { RouteCandidate, RouteRequest, RoutingService } from "./types";
