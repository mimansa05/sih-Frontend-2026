import { availableCapacity, type SafeSite } from "./types";

/**
 * Carrying-capacity allocation.
 *
 * Pure function, no UI and no map: given a population and a ranked list of
 * sites it decides who goes where. A site can never receive more people than
 * its available capacity, and whatever is left over is reported as unassigned
 * rather than quietly absorbed.
 */

export interface AllocationCandidate {
  site: SafeSite;
  /** Route length in km — only used to break ties. */
  distance: number;
}

export interface SiteAllocation {
  siteId: string;
  allocation: number;
}

export interface AllocationResult {
  allocations: SiteAllocation[];
  assigned: number;
  /** People with no place to go. Zero on a complete plan. */
  unassigned: number;
  totalAvailableCapacity: number;
}

/**
 * Destination priority: SAFETY > CAPACITY > DISTANCE.
 *
 * Safety score first, then the site that can absorb the most people, then the
 * closer one. Change this comparator to change the whole allocation policy.
 */
export const compareCandidates = (a: AllocationCandidate, b: AllocationCandidate): number =>
  b.site.safetyScore - a.site.safetyScore ||
  availableCapacity(b.site) - availableCapacity(a.site) ||
  a.distance - b.distance;

export function rankCandidates(candidates: AllocationCandidate[]): AllocationCandidate[] {
  return [...candidates].sort(compareCandidates);
}

/**
 * Fill sites in priority order until everybody is placed or capacity runs out.
 * Callers must pass only sites with a validated safe route — this function
 * knows about capacity, not about safety.
 */
export function allocatePopulation(
  population: number,
  candidates: AllocationCandidate[],
): AllocationResult {
  const ranked = rankCandidates(candidates);
  const totalAvailableCapacity = ranked.reduce((sum, c) => sum + availableCapacity(c.site), 0);

  let remaining = Math.max(0, Math.round(population));
  const allocations: SiteAllocation[] = [];

  for (const candidate of ranked) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, availableCapacity(candidate.site));
    if (take <= 0) continue;
    allocations.push({ siteId: candidate.site.id, allocation: take });
    remaining -= take;
  }

  return {
    allocations,
    assigned: Math.max(0, Math.round(population)) - remaining,
    unassigned: remaining,
    totalAvailableCapacity,
  };
}
