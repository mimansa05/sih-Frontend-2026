import type { RiskZone } from "@/lib/discatra-data";
import { haversineKm, roundTo } from "./geo";
import { isPointBlocked } from "./route-safety";
import {
  availableCapacity,
  siteLngLat,
  type BlockedZone,
  type ExcludedSite,
  type SafeSite,
} from "./types";

/**
 * Safe-site discovery: which nearby sites are even *eligible* to receive
 * people, and why the others were ruled out.
 *
 * Nearest is not the same as suitable — a closed site, a site sitting inside a
 * hazard buffer, or a full one is rejected here before any routing happens.
 */

export interface DiscoveryOptions {
  /** How far from the risk zone to look, in km. */
  searchRadiusKm: number;
  /** Sites scoring below this are not considered safe enough. */
  minSafetyScore: number;
}

export const DEFAULT_DISCOVERY: DiscoveryOptions = {
  searchRadiusKm: 60,
  minSafetyScore: 70,
};

export interface SiteCandidate {
  site: SafeSite;
  /** Straight-line distance from the risk zone, km. */
  distance: number;
}

export interface DiscoveryResult {
  eligible: SiteCandidate[];
  excluded: ExcludedSite[];
}

/** Eligible sites, nearest first, plus the rejected ones with a reason. */
export function discoverSafeSites(
  zone: RiskZone,
  sites: SafeSite[],
  blocked: BlockedZone[],
  options: DiscoveryOptions = DEFAULT_DISCOVERY,
): DiscoveryResult {
  const origin = { lng: zone.lng, lat: zone.lat };
  const eligible: SiteCandidate[] = [];
  const excluded: ExcludedSite[] = [];

  for (const site of sites) {
    const distance = roundTo(haversineKm(origin, siteLngLat(site)), 1);
    if (distance > options.searchRadiusKm) continue; // out of scope, not a rejection

    if (site.status !== "safe") {
      excluded.push({
        site,
        reason: site.status === "closed" ? "Site closed" : "Site itself at risk",
      });
      continue;
    }
    if (site.safetyScore < options.minSafetyScore) {
      excluded.push({ site, reason: `Safety score ${site.safetyScore}% below threshold` });
      continue;
    }
    if (availableCapacity(site) <= 0) {
      excluded.push({ site, reason: "No available capacity" });
      continue;
    }
    const inside = isPointBlocked(siteLngLat(site), blocked);
    if (inside) {
      excluded.push({ site, reason: `Inside hazard buffer — ${inside.name}` });
      continue;
    }
    eligible.push({ site, distance });
  }

  eligible.sort((a, b) => a.distance - b.distance);
  return { eligible, excluded };
}
