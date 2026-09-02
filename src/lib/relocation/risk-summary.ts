import {
  HAZARD_META,
  RISK_META,
  riskScore,
  type RiskLevel,
  type RiskZone,
} from "@/lib/discatra-data";
import { haversineKm } from "./geo";
import { evacuationBlockedZones } from "./relocation-service";
import { discoverSafeSites, DEFAULT_DISCOVERY, type DiscoveryOptions } from "./site-discovery";
import { availableCapacity, type SafeSite } from "./types";

/**
 * Compact, display-ready summary of a risk area.
 *
 * Feeds the map hover popup and the location detail panel. Pure derivation from
 * the risk layer and the site catalogue — no routing, so it stays cheap enough
 * to run on hover.
 */

/** Observations this close are treated as the same location for hazard listing. */
const CO_LOCATED_KM = 25;

export interface RelocationPosture {
  /** Banner wording for the level's relocation stance. */
  headline: string;
  /** What the authority should do next. */
  action: string;
  /** Whether relocation planning is the primary call to action. */
  planningRequired: boolean;
}

/**
 * How the existing red / orange / yellow ladder maps onto relocation.
 * Areas with no observation at all need no relocation and therefore have no
 * entry here.
 */
export const RELOCATION_POSTURE: Record<RiskLevel, RelocationPosture> = {
  critical: {
    headline: "Immediate relocation planning required",
    action: "Plan relocation now",
    planningRequired: true,
  },
  high: {
    headline: "Prepare relocation plan",
    action: "Prepare relocation plan",
    planningRequired: true,
  },
  moderate: {
    headline: "Monitor / prepare",
    action: "Check safe capacity",
    planningRequired: false,
  },
};

/** A callable helpline for an eligible safe site near the risk area. */
export interface AreaHelpline {
  siteName: string;
  helpline: string;
  /** Straight-line distance from the risk zone, km. */
  distance: number;
}

export interface RiskAreaSummary {
  zone: RiskZone;
  levelLabel: string;
  levelColor: string;
  riskScore: number;
  /** Hazard categories observed at or around this location. */
  hazards: string[];
  populationAtRisk: number;
  /** Available capacity across eligible safe sites in range. */
  safeCapacityNearby: number;
  eligibleSiteCount: number;
  /** True when nearby eligible capacity covers the population. */
  capacityCovered: boolean;
  /** Helpline numbers for the nearest eligible safe sites, nearest first. */
  helplines: AreaHelpline[];
  posture: RelocationPosture;
}

/**
 * How many safe-site helplines to carry. The hover card shows only the first;
 * the detail panel lists the rest.
 */
const HELPLINE_LIMIT = 5;

export function summariseRiskArea(
  zone: RiskZone,
  zones: RiskZone[],
  sites: SafeSite[],
  options: DiscoveryOptions = DEFAULT_DISCOVERY,
): RiskAreaSummary {
  const origin = { lng: zone.lng, lat: zone.lat };
  const nearby = zones.filter(
    (z) => haversineKm({ lng: z.lng, lat: z.lat }, origin) <= CO_LOCATED_KM,
  );
  const hazards = [
    HAZARD_META[zone.type].label,
    ...nearby.map((z) => HAZARD_META[z.type].label),
  ].filter((label, i, all) => all.indexOf(label) === i);

  const blocked = evacuationBlockedZones(zone, zones);
  const { eligible } = discoverSafeSites(zone, sites, blocked, options);
  const safeCapacityNearby = eligible.reduce((sum, c) => sum + availableCapacity(c.site), 0);

  return {
    zone,
    levelLabel: RISK_META[zone.level].label,
    levelColor: RISK_META[zone.level].color,
    riskScore: riskScore(zone),
    hazards,
    populationAtRisk: zone.populationAtRisk,
    safeCapacityNearby,
    eligibleSiteCount: eligible.length,
    capacityCovered: safeCapacityNearby >= zone.populationAtRisk,
    helplines: eligible.slice(0, HELPLINE_LIMIT).map((c) => ({
      siteName: c.site.name,
      helpline: c.site.helpline,
      distance: c.distance,
    })),
    posture: RELOCATION_POSTURE[zone.level],
  };
}
