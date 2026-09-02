import type { RiskZone } from "./discatra-data";

/**
 * Sample hazard observations for demo/development.
 *
 * Deliberately localised point observations — never whole-state fills. Each
 * point sits on terrain where that hazard is actually plausible (landslides in
 * the Himalaya / Western Ghats, floods on the Brahmaputra–Ganga–Kosi systems
 * and deltas, cloudbursts in the high mountains, coastal erosion only on the
 * shoreline).
 *
 * `populationAtRisk` is demo data: an illustrative headcount for the hazard
 * footprint, not a census or government figure.
 *
 * The catalogue is small but not minimal: at least two red and two orange
 * zones per calamity, plus a few extra hotspots across other states.
 * The Joshimath / Rudraprayag pair is not arbitrary: both sit on NH-7
 * along the Alaknanda, Rudraprayag directly south, so every southbound route
 * out of Joshimath must pass it. Red zones block each other at a 10 km buffer
 * (BLOCK_RADIUS_KM.critical), which is what keeps the "route rejected for
 * crossing a red zone" behaviour demonstrable independently of the orange
 * zones, which carry a 6 km buffer of their own.
 *
 * This module is intentionally free of any map or UI logic so it can later be
 * swapped for an API response of the same shape.
 */
export const HAZARD_OBSERVATIONS: RiskZone[] = [
  // ── Landslide ───────────────────────────────────────────────────────────
  { id: "ls-uk-chm", type: "landslide", name: "Joshimath subsidence belt", state: "Uttarakhand", district: "Chamoli", hazard: "Ground subsidence", level: "critical", lng: 79.56, lat: 30.55, weight: 1, populationAtRisk: 2000 },
  { id: "ls-uk-rud", type: "landslide", name: "Rudraprayag landslide zone", state: "Uttarakhand", district: "Rudraprayag", hazard: "Landslide", level: "critical", lng: 78.98, lat: 30.29, weight: 0.95, populationAtRisk: 2100 },
  { id: "ls-mh-rgd", type: "landslide", name: "Irshalwadi slope collapse", state: "Maharashtra", district: "Raigad", hazard: "Landslide", level: "high", lng: 73.32, lat: 18.85, weight: 0.75, populationAtRisk: 1400 },
  { id: "ls-wb-dar", type: "landslide", name: "Darjeeling ridge slides", state: "West Bengal", district: "Darjeeling", hazard: "Landslide", level: "high", lng: 88.26, lat: 27.04, weight: 0.75, populationAtRisk: 1500 },
  { id: "ls-sk-man", type: "landslide", name: "Mangan Teesta valley slides", state: "Sikkim", district: "Mangan", hazard: "Landslide", level: "critical", lng: 88.53, lat: 27.51, weight: 0.96, populationAtRisk: 1800 },
  { id: "ls-kl-wyd", type: "landslide", name: "Wayanad Ghat debris flows", state: "Kerala", district: "Wayanad", hazard: "Debris flow", level: "high", lng: 76.13, lat: 11.55, weight: 0.82, populationAtRisk: 1900 },
  // ── Flood ───────────────────────────────────────────────────────────────
  { id: "fl-as-dbr", type: "flood", name: "Dibrugarh Brahmaputra flood", state: "Assam", district: "Dibrugarh", hazard: "Riverine flood", level: "critical", lng: 94.9, lat: 27.47, weight: 0.98, populationAtRisk: 4200 },
  { id: "fl-br-drb", type: "flood", name: "Darbhanga Kosi flood", state: "Bihar", district: "Darbhanga", hazard: "Riverine flood", level: "critical", lng: 85.9, lat: 26.15, weight: 0.95, populationAtRisk: 4500 },
  { id: "fl-up-gor", type: "flood", name: "Gorakhpur Rapti flood", state: "Uttar Pradesh", district: "Gorakhpur", hazard: "Riverine flood", level: "high", lng: 83.37, lat: 26.76, weight: 0.8, populationAtRisk: 2000 },
  { id: "fl-kl-alp", type: "flood", name: "Kuttanad backwater flood", state: "Kerala", district: "Alappuzha", hazard: "Backwater flood", level: "high", lng: 76.34, lat: 9.5, weight: 0.8, populationAtRisk: 1900 },
  { id: "fl-br-mfp", type: "flood", name: "Muzaffarpur Bagmati flood", state: "Bihar", district: "Muzaffarpur", hazard: "Riverine flood", level: "critical", lng: 85.39, lat: 26.12, weight: 0.92, populationAtRisk: 3800 },
  { id: "fl-up-bal", type: "flood", name: "Ballia Ganga-Ghaghra flood", state: "Uttar Pradesh", district: "Ballia", hazard: "Riverine flood", level: "high", lng: 84.15, lat: 25.76, weight: 0.8, populationAtRisk: 1700 },
  // ── Cloudburst ──────────────────────────────────────────────────────────
  { id: "cb-uk-ked", type: "cloudburst", name: "Kedarnath valley cloudburst", state: "Uttarakhand", district: "Rudraprayag", hazard: "Cloudburst", level: "critical", lng: 79.07, lat: 30.73, weight: 1, populationAtRisk: 2600 },
  { id: "cb-hp-kul", type: "cloudburst", name: "Kullu Beas cloudburst", state: "Himachal Pradesh", district: "Kullu", hazard: "Cloudburst", level: "critical", lng: 77.11, lat: 31.96, weight: 0.95, populationAtRisk: 2300 },
  { id: "cb-uk-chm", type: "cloudburst", name: "Chamoli high-intensity rain", state: "Uttarakhand", district: "Chamoli", hazard: "Cloudburst", level: "high", lng: 79.35, lat: 30.42, weight: 0.8, populationAtRisk: 1200 },
  { id: "cb-jk-kis", type: "cloudburst", name: "Kishtwar Chenab cloudburst", state: "Jammu & Kashmir", district: "Kishtwar", hazard: "Cloudburst", level: "high", lng: 75.77, lat: 33.31, weight: 0.8, populationAtRisk: 1500 },
  { id: "cb-uk-utk", type: "cloudburst", name: "Uttarkashi Bhagirathi cloudburst", state: "Uttarakhand", district: "Uttarkashi", hazard: "Cloudburst", level: "critical", lng: 78.45, lat: 30.73, weight: 0.9, populationAtRisk: 1600 },
  // ── Coastal erosion ─────────────────────────────────────────────────────
  { id: "ce-od-sat", type: "coastal_erosion", name: "Satabhaya shoreline retreat", state: "Odisha", district: "Kendrapara", hazard: "Shoreline retreat", level: "critical", lng: 86.9, lat: 20.68, weight: 1, populationAtRisk: 3000 },
  { id: "ce-wb-gho", type: "coastal_erosion", name: "Ghoramara island loss", state: "West Bengal", district: "South 24 Parganas", hazard: "Island erosion", level: "critical", lng: 88.13, lat: 21.9, weight: 0.95, populationAtRisk: 2500 },
  { id: "ce-ap-mch", type: "coastal_erosion", name: "Machilipatnam coast retreat", state: "Andhra Pradesh", district: "Krishna", hazard: "Shoreline retreat", level: "high", lng: 81.14, lat: 16.17, weight: 0.75, populationAtRisk: 1600 },
  { id: "ce-gj-dwk", type: "coastal_erosion", name: "Dwarka coast erosion", state: "Gujarat", district: "Devbhumi Dwarka", hazard: "Shoreline retreat", level: "high", lng: 69.08, lat: 22.24, weight: 0.7, populationAtRisk: 1400 },
];
