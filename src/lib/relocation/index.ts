/**
 * Relocation feature — public surface.
 *
 * Layering (each layer only knows about the ones above it):
 *   types / geo          data models + geometry
 *   route-safety         "may this path be shown to anyone?"
 *   routing/*            pluggable routing provider (mock today, GIS later)
 *   allocation           carrying-capacity assignment
 *   site-discovery       eligibility filtering
 *   relocation-service   orchestration — the only producer of a RelocationPlan
 *   alerts / geojson     projections of a finished plan
 *   mock/*               development data, swappable for an API
 */
export * from "./types";
export * from "./geo";
export * from "./route-safety";
export * from "./allocation";
export * from "./site-discovery";
export * from "./assembly-points";
export * from "./relocation-service";
export * from "./risk-summary";
export * from "./alerts";
export * from "./geojson";
export { routingService } from "./routing";
export type { RoutingService, RouteRequest, RouteCandidate } from "./routing/types";
export * from "./safe-site-service";
export { MOCK_SAFE_SITES } from "./mock/safe-sites";
export { MOCK_ASSEMBLY_POINTS } from "./mock/assembly-points";
