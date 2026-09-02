import type { RiskLevel, RiskZone } from "@/lib/discatra-data";
import type { LngLat, Position } from "./geo";

/* ────────────────────────────── Safe sites ───────────────────────────────── */

export type SafeSiteStatus = "safe" | "at_risk" | "closed";

/**
 * A candidate relocation destination.
 *
 * Note on coordinates: the rest of this codebase stores geography as separate
 * `lng` / `lat` numbers (see `RiskZone`), so safe sites do the same rather than
 * a `[lat, lng]` tuple. Use `siteLngLat()` when a point is needed.
 */
export interface SafeSite {
  id: string;
  name: string;
  /** Facility type shown in the UI, e.g. "Relief centre", "School shelter". */
  kind: string;
  state: string;
  district: string;
  lng: number;
  lat: number;
  totalCapacity: number;
  occupiedCapacity: number;
  /** 0-100 composite site-suitability score (demo data — see mock/safe-sites). */
  safetyScore: number;
  /**
   * Public helpline for the facility. Demo data — the 1800-000 exchange is not
   * allocatable, so nothing here can dial a real emergency line.
   */
  helpline: string;
  status: SafeSiteStatus;
}

export const siteLngLat = (site: SafeSite): LngLat => ({ lng: site.lng, lat: site.lat });

/** Derived, never stored — a site only carries total + occupied. */
export const availableCapacity = (site: SafeSite): number =>
  Math.max(0, site.totalCapacity - site.occupiedCapacity);

/* ──────────────────────────── Assembly points ────────────────────────────── */

/**
 * A muster point inside a hazard zone that a batch of people evacuates from.
 *
 * Routing from the zone's centroid is wrong in practice: the centroid is often
 * open water, forest or a river, so a road router snaps the departure to
 * whatever road it can find — sometimes kilometres outside the hazard. Assembly
 * points are placed on land on the road network *inside* the zone, and two
 * batches leaving from two different points is also how an evacuation actually
 * runs.
 */
export interface AssemblyPoint {
  id: string;
  /** Compass-based label, e.g. "North assembly point". */
  name: string;
  lng: number;
  lat: number;
}

/** Seed shape for the mock catalogue — ids and labels are derived on read. */
export interface AssemblySeed {
  /** Compass direction from the zone centre, e.g. "North-east". */
  dir: string;
  lng: number;
  lat: number;
}

export const assemblyLngLat = (point: AssemblyPoint): LngLat => ({
  lng: point.lng,
  lat: point.lat,
});

/* ───────────────────────────── Blocked zones ─────────────────────────────── */

/** A no-go area a relocation route must never cross. */
export interface BlockedZone {
  id: string;
  name: string;
  level: RiskLevel;
  center: LngLat;
  /** Avoidance buffer in km. */
  radiusKm: number;
}

/* ─────────────────────────────── Routes ──────────────────────────────────── */

/** A validated relocation route. Distances are km, times are minutes. */
export interface RelocationRoute {
  /** Risk-zone id. */
  source: string;
  /** The batch's departure point inside the hazard zone. */
  origin: AssemblyPoint;
  /**
   * Straight-line km from the assembly point to the first road vertex — the
   * on-foot/boat leg where the muster point is not itself on a routable road.
   */
  transferKm: number;
  /** Safe-site id. */
  destination: string;
  distance: number;
  estimatedTime: number;
  isSafe: boolean;
  /** Ids of zones the route still intersects — empty on a safe route. */
  blockedZones: string[];
  /** Ids of zones the direct line would have crossed and this route detours around. */
  avoidedZones: string[];
  allocation: number;
  /** Actual path geometry, [lng, lat] pairs. */
  coordinates: Position[];
  /** Routing provider that produced the geometry. */
  provider: string;
  /** Whether the geometry came from a real routing backend or the fallback. */
  mode: "mock" | "live";
  /** True when the geometry follows the road network. */
  road: boolean;
  /** True when no hazard detour was needed. */
  direct: boolean;
}

/* ──────────────────────────────── Plan ───────────────────────────────────── */

export type PlanSiteStatus = "assigned" | "standby" | "no_safe_route";

export interface PlanSite {
  site: SafeSite;
  /** Where this batch departs from. Two destinations get two different points. */
  origin: AssemblyPoint;
  /** Straight-line distance from the risk zone, km. */
  distance: number;
  /** Null when no safe route exists — such a site is never assigned people. */
  route: RelocationRoute | null;
  allocation: number;
  status: PlanSiteStatus;
}

export interface ExcludedSite {
  site: SafeSite;
  reason: string;
}

export type PlanStatus =
  /** Everybody has a destination and a safe route. */
  | "ready"
  /** Some people placed, capacity or safe routes ran out. */
  | "partial"
  /** Sites exist nearby but none is reachable without crossing a hazard. */
  | "no_safe_route"
  /** No site satisfies the safety / capacity conditions. */
  | "no_site";

export interface RelocationPlan {
  zone: RiskZone;
  populationAtRisk: number;
  /** Every site that passed eligibility, best first. */
  sites: PlanSite[];
  /** Sites ruled out before routing, with the reason. */
  excluded: ExcludedSite[];
  totalAssigned: number;
  unassigned: number;
  /** Available capacity across sites that have a validated safe route. */
  reachableCapacity: number;
  status: PlanStatus;
  routing: {
    provider: string;
    mode: "mock" | "live";
    label: string;
    /** True when every assigned route follows real roads. */
    roadRouted: boolean;
  };
  generatedAt: string;
}

/** Sites that actually received people. */
export const planDestinations = (plan: RelocationPlan): PlanSite[] =>
  plan.sites.filter((s) => s.allocation > 0);

/* ─────────────────────────────── Alerts ──────────────────────────────────── */

export interface RelocationAlert {
  id: string;
  zoneId: string;
  area: string;
  district: string;
  state: string;
  hazard: string;
  riskLevel: RiskLevel;
  siteId: string;
  siteName: string;
  assemblyPoint: string;
  allocation: number;
  distance: number;
  estimatedTime: number;
  routeStatus: "SAFE";
  sentAt: string;
  message: string;
}
