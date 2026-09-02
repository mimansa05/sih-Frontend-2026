import { HAZARD_OBSERVATIONS } from "./hazard-observations";

export type RiskLevel = "critical" | "high" | "moderate";

/**
 * Hazard categories the dashboard can filter by.
 * `all` is the unfiltered view. New categories (cyclone, earthquake, wildfire…)
 * only need an entry here plus one in HAZARD_META to appear everywhere.
 */
export type HazardType = "all" | "landslide" | "flood" | "cloudburst" | "coastal_erosion";

/** Hazard categories that carry observations (i.e. everything except `all`). */
export type ObservedHazardType = Exclude<HazardType, "all">;

export interface RiskZone {
  id: string;
  /** Filterable hazard category. */
  type: ObservedHazardType;
  name: string;
  state: string;
  district: string;
  /** Human-readable sub-type shown in the panel, e.g. "Riverine flood". */
  hazard: string;
  level: RiskLevel;
  lng: number;
  lat: number;
  /** Relative observation intensity 0-1 — drives the heatmap weight. */
  weight: number;
  /**
   * People inside the hazard footprint. Drives every relocation capacity
   * calculation — the relocation services read this value and never assume one.
   */
  populationAtRisk: number;
}

/** 0-100 index derived from the observation weight. Display only. */
export const riskScore = (zone: RiskZone): number => Math.round(zone.weight * 100);

export interface StateEntry {
  name: string;
  lng: number;
  lat: number;
  zoom: number;
}

/** Real coordinates so zoom-to-state lands on the actual terrain. */
export const INDIAN_STATES: StateEntry[] = [
  { name: "Andhra Pradesh", lng: 79.74, lat: 15.91, zoom: 6.3 },
  { name: "Arunachal Pradesh", lng: 94.73, lat: 28.22, zoom: 6.5 },
  { name: "Assam", lng: 92.94, lat: 26.2, zoom: 6.6 },
  { name: "Bihar", lng: 85.31, lat: 25.6, zoom: 6.6 },
  { name: "Chhattisgarh", lng: 81.87, lat: 21.28, zoom: 6.4 },
  { name: "Goa", lng: 74.12, lat: 15.3, zoom: 9 },
  { name: "Gujarat", lng: 71.19, lat: 22.26, zoom: 6.2 },
  { name: "Haryana", lng: 76.09, lat: 29.06, zoom: 7 },
  { name: "Himachal Pradesh", lng: 77.17, lat: 31.95, zoom: 7 },
  { name: "Jharkhand", lng: 85.28, lat: 23.61, zoom: 6.8 },
  { name: "Karnataka", lng: 75.71, lat: 15.32, zoom: 6.2 },
  { name: "Kerala", lng: 76.27, lat: 10.85, zoom: 6.8 },
  { name: "Madhya Pradesh", lng: 78.66, lat: 23.47, zoom: 6 },
  { name: "Maharashtra", lng: 75.71, lat: 19.75, zoom: 6 },
  { name: "Manipur", lng: 93.9, lat: 24.66, zoom: 7.5 },
  { name: "Meghalaya", lng: 91.36, lat: 25.46, zoom: 7.5 },
  { name: "Mizoram", lng: 92.93, lat: 23.16, zoom: 7.5 },
  { name: "Nagaland", lng: 94.56, lat: 26.15, zoom: 7.5 },
  { name: "Odisha", lng: 85.09, lat: 20.95, zoom: 6.4 },
  { name: "Punjab", lng: 75.34, lat: 31.14, zoom: 7 },
  { name: "Rajasthan", lng: 74.21, lat: 27.02, zoom: 5.9 },
  { name: "Sikkim", lng: 88.51, lat: 27.53, zoom: 8.5 },
  { name: "Tamil Nadu", lng: 78.65, lat: 11.12, zoom: 6.3 },
  { name: "Telangana", lng: 79.01, lat: 18.11, zoom: 6.6 },
  { name: "Tripura", lng: 91.98, lat: 23.94, zoom: 8 },
  { name: "Uttar Pradesh", lng: 80.94, lat: 26.84, zoom: 6.1 },
  { name: "Uttarakhand", lng: 79.01, lat: 30.06, zoom: 7 },
  { name: "West Bengal", lng: 87.85, lat: 22.98, zoom: 6.4 },
  { name: "Delhi", lng: 77.1, lat: 28.65, zoom: 9.5 },
  { name: "Jammu & Kashmir", lng: 75.34, lat: 33.77, zoom: 6.6 },
  { name: "Ladakh", lng: 77.58, lat: 34.2, zoom: 6.3 },
  { name: "Andaman & Nicobar", lng: 92.75, lat: 11.74, zoom: 6.5 },
];

/** Hazard observations (mock today, API-shaped for later). */
export const RISK_ZONES: RiskZone[] = HAZARD_OBSERVATIONS;

export const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  critical: { label: "Critical red zone", color: "#ef2d2d" },
  high: { label: "High risk", color: "#ff8a1f" },
  moderate: { label: "Lower priority", color: "#f5d327" },
};

/** Dropdown order + labels. Adding a hazard here wires it through the whole UI. */
export const HAZARD_TYPES: HazardType[] = [
  "all",
  "landslide",
  "flood",
  "cloudburst",
  "coastal_erosion",
];

export const HAZARD_META: Record<HazardType, { label: string; panel: string }> = {
  all: { label: "All hazards", panel: "Active hazard zones" },
  landslide: { label: "Landslide", panel: "Active landslide zones" },
  flood: { label: "Flood", panel: "Active flood zones" },
  cloudburst: { label: "Cloudburst", panel: "Active cloudburst zones" },
  coastal_erosion: { label: "Coastal erosion", panel: "Active coastal erosion zones" },
};

/** Observations for a hazard selection ("all" = unfiltered). */
export const zonesForHazard = (hazard: HazardType): RiskZone[] =>
  hazard === "all" ? RISK_ZONES : RISK_ZONES.filter((z) => z.type === hazard);

export const riskGeoJSON = () => ({
  type: "FeatureCollection" as const,
  features: RISK_ZONES.map((z) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [z.lng, z.lat] },
    properties: {
      id: z.id,
      type: z.type,
      name: z.name,
      state: z.state,
      district: z.district,
      hazard: z.hazard,
      level: z.level,
      weight: z.weight,
      populationAtRisk: z.populationAtRisk,
      riskScore: riskScore(z),
      color: RISK_META[z.level].color,
      radius: z.level === "critical" ? 26000 : z.level === "high" ? 18000 : 12000,
    },
  })),
});
