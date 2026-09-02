import type { RiskZone } from "@/lib/discatra-data";
import { fromPosition, haversineKm, roundTo, toPosition } from "./geo";
import { blockedZonesFrom, validateRouteSafety } from "./route-safety";
import { allocatePopulation, rankCandidates, type AllocationCandidate } from "./allocation";
import { DEFAULT_DISCOVERY, discoverSafeSites, type DiscoveryOptions } from "./site-discovery";
import { routingService as defaultRoutingService } from "./routing";
import type { RoutingService } from "./routing/types";
import { assemblyPointsFor, pairAssemblyPoints } from "./assembly-points";
import {
  assemblyLngLat,
  availableCapacity,
  siteLngLat,
  type AssemblyPoint,
  type BlockedZone,
  type PlanSite,
  type PlanStatus,
  type RelocationPlan,
  type RelocationRoute,
  type SafeSite,
} from "./types";

/**
 * Relocation orchestration — the one place a relocation plan is produced.
 *
 * Both the authority dashboard and the affected-person view read the plan this
 * service returns, so a citizen can never be shown a route the authority did
 * not validate.
 *
 * Pipeline:
 *   discover eligible sites → route each one avoiding hazards → drop sites with
 *   no safe route → allocate people by capacity → report what is left over.
 *
 * Routing happens *before* allocation on purpose: a destination with no safe
 * route must never be assigned anybody.
 */

/**
 * Fallback travel-speed assumption (km/h) for a convoy on secondary roads.
 *
 * Only used when the routing provider reports no duration of its own — the road
 * router supplies real per-route travel times. It is a planning estimate, not a
 * measured or predicted speed.
 */
export const EVACUATION_SPEED_KMH = 30;

const estimateMinutes = (distanceKm: number) =>
  Math.max(1, Math.round((distanceKm / EVACUATION_SPEED_KMH) * 60));

export interface PlanOptions extends DiscoveryOptions {
  routing: RoutingService;
}

export const DEFAULT_PLAN_OPTIONS: PlanOptions = {
  ...DEFAULT_DISCOVERY,
  routing: defaultRoutingService,
};

/**
 * No-go set for an evacuation *out of* `zone`.
 *
 * Any hazard zone the affected population is already standing inside cannot
 * block their departure, so it is removed from the no-go set; every other red
 * and orange zone still blocks. Routes therefore start inside the hazard the
 * people are being moved away from and never enter a new one.
 */
export function evacuationBlockedZones(zone: RiskZone, riskZones: RiskZone[]): BlockedZone[] {
  const origin = { lng: zone.lng, lat: zone.lat };
  // The hazard being evacuated never blocks its own departure, and neither does
  // any other zone the affected population is already standing inside.
  return blockedZonesFrom(riskZones, [zone.id]).filter(
    (z) => haversineKm(z.center, origin) >= z.radiusKm,
  );
}

async function routeTo(
  zone: RiskZone,
  origin: AssemblyPoint,
  site: SafeSite,
  blocked: BlockedZone[],
  routing: RoutingService,
): Promise<RelocationRoute | null> {
  const from = assemblyLngLat(origin);
  const candidate = await routing.findSafeRoute({
    source: from,
    destination: siteLngLat(site),
    blockedZones: blocked,
  });
  if (!candidate) return null;

  /*
   * A road router snaps the departure to the nearest routable road, which can
   * sit a little way from the muster point (or a long way, on an island). Anchor
   * the drawn line to the assembly point itself so the route always starts where
   * the people actually are, and report the gap as a transfer leg rather than
   * hiding it inside the road distance.
   */
  const head = candidate.coordinates[0];
  const transferKm = head ? roundTo(haversineKm(from, fromPosition(head)), 1) : 0;
  const coordinates =
    transferKm > 0.05 ? [toPosition(from), ...candidate.coordinates] : candidate.coordinates;

  // Independent re-validation of the geometry that will actually be displayed.
  // A route that fails here is discarded, never downgraded and shown anyway.
  const safety = validateRouteSafety(coordinates, blocked);
  if (!safety.isSafe) return null;

  const distance = roundTo(candidate.distance + transferKm, 1);
  return {
    source: zone.id,
    origin,
    transferKm,
    destination: site.id,
    distance,
    // A real routing backend reports its own travel time; only fall back to the
    // convoy-speed assumption when it does not.
    estimatedTime: candidate.duration ?? estimateMinutes(distance),
    isSafe: true,
    blockedZones: [],
    avoidedZones: candidate.avoidedZones,
    allocation: 0,
    coordinates,
    provider: candidate.provider,
    mode: candidate.mode,
    road: candidate.road ?? false,
    direct: candidate.direct,
  };
}

function planStatus(
  population: number,
  assigned: number,
  eligibleCount: number,
  routedCount: number,
): PlanStatus {
  if (eligibleCount === 0) return "no_site";
  if (routedCount === 0) return "no_safe_route";
  if (assigned < population) return "partial";
  return "ready";
}

/** Build the full relocation plan for one risk zone. */
export async function buildRelocationPlan(
  zone: RiskZone,
  sites: SafeSite[],
  riskZones: RiskZone[],
  options: Partial<PlanOptions> = {},
): Promise<RelocationPlan> {
  const opts: PlanOptions = { ...DEFAULT_PLAN_OPTIONS, ...options };
  const blocked = evacuationBlockedZones(zone, riskZones);
  const { eligible, excluded } = discoverSafeSites(zone, sites, blocked, opts);

  /*
   * Each destination is paired with its own assembly point *before* routing, so
   * two batches leave from two different parts of the zone and travel two
   * genuinely different roads rather than overlapping on one.
   */
  const pairing = pairAssemblyPoints(
    eligible.map((c) => c.site),
    assemblyPointsFor(zone),
  );

  const routed = await Promise.all(
    eligible.map(async (candidate) => {
      const origin = pairing.get(candidate.site.id) as AssemblyPoint;
      return {
        ...candidate,
        origin,
        route: await routeTo(zone, origin, candidate.site, blocked, opts.routing),
      };
    }),
  );

  const reachable = routed.filter((r) => r.route !== null);
  const allocationCandidates: AllocationCandidate[] = reachable.map((r) => ({
    site: r.site,
    distance: r.route!.distance,
  }));

  const population = zone.populationAtRisk;
  const result = allocatePopulation(population, allocationCandidates);
  const byId = new Map(result.allocations.map((a) => [a.siteId, a.allocation]));

  // Ranked order so the panel and the map agree on which site is "Site A".
  const rankedIds = rankCandidates(allocationCandidates).map((c) => c.site.id);
  const rankIndex = (id: string) => {
    const i = rankedIds.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const planSites: PlanSite[] = routed
    .map(({ site, distance, route, origin }) => {
      const allocation = byId.get(site.id) ?? 0;
      if (route) route.allocation = allocation;
      return {
        site,
        origin,
        distance,
        route,
        allocation,
        status: route ? (allocation > 0 ? "assigned" : "standby") : "no_safe_route",
      } satisfies PlanSite;
    })
    .sort(
      (a, b) =>
        Number(b.allocation > 0) - Number(a.allocation > 0) ||
        rankIndex(a.site.id) - rankIndex(b.site.id) ||
        a.distance - b.distance,
    );

  return {
    zone,
    populationAtRisk: population,
    sites: planSites,
    excluded,
    totalAssigned: result.assigned,
    unassigned: result.unassigned,
    reachableCapacity: reachable.reduce((sum, r) => sum + availableCapacity(r.site), 0),
    status: planStatus(population, result.assigned, eligible.length, reachable.length),
    routing: {
      provider: opts.routing.id,
      mode: opts.routing.mode,
      label: opts.routing.label,
      roadRouted: reachable.length > 0 && reachable.every((r) => r.route?.road === true),
    },
    generatedAt: new Date().toISOString(),
  };
}

export interface NearestSafePlace {
  site: SafeSite;
  route: RelocationRoute;
  distance: number;
}

/**
 * Nearest *suitable* safe place for a risk zone — the closest site that passes
 * eligibility and has a validated safe route. Used by the location detail
 * screen before a full plan is built; it uses the same routing service, so the
 * route it shows is the same one the plan would produce.
 */
export async function findNearestSafePlace(
  zone: RiskZone,
  sites: SafeSite[],
  riskZones: RiskZone[],
  options: Partial<PlanOptions> = {},
): Promise<NearestSafePlace | null> {
  const opts: PlanOptions = { ...DEFAULT_PLAN_OPTIONS, ...options };
  const blocked = evacuationBlockedZones(zone, riskZones);
  const { eligible } = discoverSafeSites(zone, sites, blocked, opts);

  const points = assemblyPointsFor(zone);
  const pairing = pairAssemblyPoints(
    eligible.map((c) => c.site),
    points,
  );
  for (const candidate of eligible) {
    const origin = (pairing.get(candidate.site.id) ?? points[0]) as AssemblyPoint;
    const route = await routeTo(zone, origin, candidate.site, blocked, opts.routing);
    if (route) return { site: candidate.site, route, distance: route.distance };
  }
  return null;
}
