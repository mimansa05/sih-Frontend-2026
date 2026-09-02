import { HAZARD_META, type HazardType, type ObservedHazardType } from "@/lib/discatra-data";
import type { HistoricalEvent } from "./types";

/**
 * Pure aggregation over the historical catalogue.
 *
 * Kept free of React and of the mock module so the page is a thin renderer and
 * these can be swapped onto an API response of the same shape.
 */

export const ALL_STATES = "all";

export interface HistoricalFilters {
  hazard: HazardType;
  /** A state name, or ALL_STATES. */
  state: string;
  /** Decade start year (e.g. 2010), or null for every decade. */
  decade: number | null;
}

export interface YearBucket {
  year: number;
  events: number;
  deaths: number;
  displaced: number;
}

export interface HazardBucket {
  hazard: ObservedHazardType;
  label: string;
  events: number;
  deaths: number;
  displaced: number;
  damageCr: number;
}

export function filterEvents(
  events: readonly HistoricalEvent[],
  filters: HistoricalFilters,
): HistoricalEvent[] {
  return events.filter(
    (e) =>
      (filters.hazard === "all" || e.hazard === filters.hazard) &&
      (filters.state === ALL_STATES || e.state === filters.state) &&
      (filters.decade === null || (e.year >= filters.decade && e.year < filters.decade + 10)),
  );
}

export function eventsPerYear(events: readonly HistoricalEvent[]): YearBucket[] {
  const buckets = new Map<number, YearBucket>();
  for (const e of events) {
    const bucket = buckets.get(e.year) ?? { year: e.year, events: 0, deaths: 0, displaced: 0 };
    bucket.events += 1;
    bucket.deaths += e.deaths;
    bucket.displaced += e.displaced;
    buckets.set(e.year, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.year - b.year);
}

export function byHazard(events: readonly HistoricalEvent[]): HazardBucket[] {
  const buckets = new Map<ObservedHazardType, HazardBucket>();
  for (const e of events) {
    const bucket = buckets.get(e.hazard) ?? {
      hazard: e.hazard,
      label: HAZARD_META[e.hazard].label,
      events: 0,
      deaths: 0,
      displaced: 0,
      damageCr: 0,
    };
    bucket.events += 1;
    bucket.deaths += e.deaths;
    bucket.displaced += e.displaced;
    bucket.damageCr += e.damageCr;
    buckets.set(e.hazard, bucket);
  }
  return [...buckets.values()].sort((a, b) => b.events - a.events);
}

export function totals(events: readonly HistoricalEvent[]) {
  return {
    events: events.length,
    deaths: events.reduce((n, e) => n + e.deaths, 0),
    displaced: events.reduce((n, e) => n + e.displaced, 0),
    damageCr: events.reduce((n, e) => n + e.damageCr, 0),
    states: new Set(events.map((e) => e.state)).size,
  };
}

/** Deadliest first. Ties break on displaced, then year, so the order is stable. */
export function worstEvents(events: readonly HistoricalEvent[], limit: number): HistoricalEvent[] {
  return [...events]
    .sort((a, b) => b.deaths - a.deaths || b.displaced - a.displaced || b.year - a.year)
    .slice(0, limit);
}

export function decadesIn(events: readonly HistoricalEvent[]): number[] {
  return [...new Set(events.map((e) => Math.floor(e.year / 10) * 10))].sort((a, b) => a - b);
}

export function statesIn(events: readonly HistoricalEvent[]): string[] {
  return [...new Set(events.map((e) => e.state))].sort((a, b) => a.localeCompare(b));
}
