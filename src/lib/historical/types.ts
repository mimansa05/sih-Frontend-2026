import type { ObservedHazardType } from "@/lib/discatra-data";

/**
 * A past calamity record.
 *
 * `hazard` reuses the map's own hazard union so the history page and the risk
 * layer speak one vocabulary — a filter chip means the same thing on both.
 */
export interface HistoricalEvent {
  id: string;
  year: number;
  hazard: ObservedHazardType;
  /** Event name as commonly reported, e.g. "Kedarnath floods". */
  name: string;
  state: string;
  district: string;
  deaths: number;
  displaced: number;
  /** Estimated damage, ₹ crore. */
  damageCr: number;
}
