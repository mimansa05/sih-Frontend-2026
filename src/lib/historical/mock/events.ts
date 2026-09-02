import type { HistoricalEvent } from "../types";

/**
 * DEMO HISTORICAL CATALOGUE — illustrative records for development.
 *
 * These are invented figures attached to real place names and plausible years.
 * They are NOT an official disaster register and must not be cited as one; the
 * page that renders them says so on screen.
 *
 * Replace this module with an API response of the same shape — nothing else in
 * the historical feature reads it directly.
 *
 * Kept deliberately tabular, one record per line. Do not prettier-format.
 */
export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  // ── Landslide ───────────────────────────────────────────────────────────
  { id: "h-2010-ls-uk", year: 2010, hazard: "landslide", name: "Almora hillside collapse", state: "Uttarakhand", district: "Almora", deaths: 64, displaced: 3200, damageCr: 210 },
  { id: "h-2012-ls-hp", year: 2012, hazard: "landslide", name: "Kinnaur rockfall", state: "Himachal Pradesh", district: "Kinnaur", deaths: 41, displaced: 1800, damageCr: 150 },
  { id: "h-2014-ls-mh", year: 2014, hazard: "landslide", name: "Malin village slide", state: "Maharashtra", district: "Pune", deaths: 151, displaced: 900, damageCr: 95 },
  { id: "h-2017-ls-wb", year: 2017, hazard: "landslide", name: "Darjeeling slope failure", state: "West Bengal", district: "Darjeeling", deaths: 33, displaced: 4100, damageCr: 180 },
  { id: "h-2018-ls-kl", year: 2018, hazard: "landslide", name: "Idukki debris flows", state: "Kerala", district: "Idukki", deaths: 104, displaced: 22000, damageCr: 1450 },
  { id: "h-2020-ls-uk", year: 2020, hazard: "landslide", name: "Rudraprayag corridor slides", state: "Uttarakhand", district: "Rudraprayag", deaths: 27, displaced: 2600, damageCr: 240 },
  { id: "h-2021-ls-mh", year: 2021, hazard: "landslide", name: "Raigad slope collapse", state: "Maharashtra", district: "Raigad", deaths: 87, displaced: 6400, damageCr: 320 },
  { id: "h-2022-ls-ka", year: 2022, hazard: "landslide", name: "Kodagu hill instability", state: "Karnataka", district: "Kodagu", deaths: 19, displaced: 5100, damageCr: 260 },
  { id: "h-2023-ls-uk", year: 2023, hazard: "landslide", name: "Joshimath subsidence crisis", state: "Uttarakhand", district: "Chamoli", deaths: 0, displaced: 3900, damageCr: 610 },
  { id: "h-2024-ls-kl", year: 2024, hazard: "landslide", name: "Wayanad slope failures", state: "Kerala", district: "Wayanad", deaths: 231, displaced: 10400, damageCr: 1210 },
  { id: "h-2025-ls-hp", year: 2025, hazard: "landslide", name: "Mandi NH-21 slide cluster", state: "Himachal Pradesh", district: "Mandi", deaths: 22, displaced: 3300, damageCr: 285 },
  // ── Flood ───────────────────────────────────────────────────────────────
  { id: "h-2008-fl-br", year: 2008, hazard: "flood", name: "Kosi embankment breach", state: "Bihar", district: "Supaul", deaths: 434, displaced: 2300000, damageCr: 5800 },
  { id: "h-2011-fl-as", year: 2011, hazard: "flood", name: "Brahmaputra basin floods", state: "Assam", district: "Dibrugarh", deaths: 78, displaced: 480000, damageCr: 1900 },
  { id: "h-2013-fl-up", year: 2013, hazard: "flood", name: "Gorakhpur Rapti floods", state: "Uttar Pradesh", district: "Gorakhpur", deaths: 112, displaced: 390000, damageCr: 1350 },
  { id: "h-2015-fl-tn", year: 2015, hazard: "flood", name: "Chennai urban floods", state: "Tamil Nadu", district: "Chennai", deaths: 289, displaced: 1800000, damageCr: 15000 },
  { id: "h-2017-fl-br", year: 2017, hazard: "flood", name: "Darbhanga Kosi floods", state: "Bihar", district: "Darbhanga", deaths: 156, displaced: 870000, damageCr: 3100 },
  { id: "h-2018-fl-kl", year: 2018, hazard: "flood", name: "Kerala deluge", state: "Kerala", district: "Alappuzha", deaths: 483, displaced: 1400000, damageCr: 31000 },
  { id: "h-2019-fl-ka", year: 2019, hazard: "flood", name: "North Karnataka floods", state: "Karnataka", district: "Belagavi", deaths: 91, displaced: 690000, damageCr: 4200 },
  { id: "h-2020-fl-as", year: 2020, hazard: "flood", name: "Assam annual floods", state: "Assam", district: "Dhemaji", deaths: 123, displaced: 1200000, damageCr: 3800 },
  { id: "h-2022-fl-as", year: 2022, hazard: "flood", name: "Barpeta Brahmaputra surge", state: "Assam", district: "Barpeta", deaths: 192, displaced: 950000, damageCr: 4600 },
  { id: "h-2023-fl-od", year: 2023, hazard: "flood", name: "Jajpur Baitarani floods", state: "Odisha", district: "Jajpur", deaths: 44, displaced: 310000, damageCr: 1250 },
  { id: "h-2024-fl-br", year: 2024, hazard: "flood", name: "Muzaffarpur Bagmati floods", state: "Bihar", district: "Muzaffarpur", deaths: 67, displaced: 540000, damageCr: 2100 },
  { id: "h-2025-fl-wb", year: 2025, hazard: "flood", name: "Murshidabad Ganga floods", state: "West Bengal", district: "Murshidabad", deaths: 38, displaced: 420000, damageCr: 1680 },
  // ── Cloudburst ──────────────────────────────────────────────────────────
  { id: "h-2010-cb-ld", year: 2010, hazard: "cloudburst", name: "Leh cloudburst", state: "Ladakh", district: "Leh", deaths: 255, displaced: 9000, damageCr: 480 },
  { id: "h-2013-cb-uk", year: 2013, hazard: "cloudburst", name: "Kedarnath disaster", state: "Uttarakhand", district: "Rudraprayag", deaths: 5700, displaced: 110000, damageCr: 10500 },
  { id: "h-2016-cb-jk", year: 2016, hazard: "cloudburst", name: "Kishtwar cloudburst", state: "Jammu & Kashmir", district: "Kishtwar", deaths: 46, displaced: 2400, damageCr: 190 },
  { id: "h-2019-cb-hp", year: 2019, hazard: "cloudburst", name: "Kullu Beas surge", state: "Himachal Pradesh", district: "Kullu", deaths: 31, displaced: 5600, damageCr: 340 },
  { id: "h-2021-cb-uk", year: 2021, hazard: "cloudburst", name: "Uttarkashi cloudburst", state: "Uttarakhand", district: "Uttarkashi", deaths: 58, displaced: 7300, damageCr: 420 },
  { id: "h-2022-cb-ar", year: 2022, hazard: "cloudburst", name: "Kameng valley cloudburst", state: "Arunachal Pradesh", district: "West Kameng", deaths: 24, displaced: 1900, damageCr: 160 },
  { id: "h-2023-cb-hp", year: 2023, hazard: "cloudburst", name: "Himachal monsoon cloudbursts", state: "Himachal Pradesh", district: "Kullu", deaths: 428, displaced: 68000, damageCr: 12000 },
  { id: "h-2025-cb-uk", year: 2025, hazard: "cloudburst", name: "Kedarnath valley cloudburst", state: "Uttarakhand", district: "Rudraprayag", deaths: 74, displaced: 12800, damageCr: 890 },
  // ── Coastal erosion ─────────────────────────────────────────────────────
  { id: "h-2009-ce-wb", year: 2009, hazard: "coastal_erosion", name: "Ghoramara island loss", state: "West Bengal", district: "South 24 Parganas", deaths: 0, displaced: 6800, damageCr: 120 },
  { id: "h-2011-ce-od", year: 2011, hazard: "coastal_erosion", name: "Satabhaya shoreline retreat", state: "Odisha", district: "Kendrapara", deaths: 0, displaced: 4200, damageCr: 95 },
  { id: "h-2014-ce-ap", year: 2014, hazard: "coastal_erosion", name: "Uppada shoreline collapse", state: "Andhra Pradesh", district: "Kakinada", deaths: 3, displaced: 3100, damageCr: 145 },
  { id: "h-2016-ce-kl", year: 2016, hazard: "coastal_erosion", name: "Chellanam seawall breach", state: "Kerala", district: "Ernakulam", deaths: 1, displaced: 5400, damageCr: 210 },
  { id: "h-2018-ce-tn", year: 2018, hazard: "coastal_erosion", name: "Nagapattinam coast retreat", state: "Tamil Nadu", district: "Nagapattinam", deaths: 0, displaced: 2700, damageCr: 130 },
  { id: "h-2020-ce-wb", year: 2020, hazard: "coastal_erosion", name: "Digha shoreline damage", state: "West Bengal", district: "Purba Medinipur", deaths: 2, displaced: 8900, damageCr: 380 },
  { id: "h-2022-ce-od", year: 2022, hazard: "coastal_erosion", name: "Puri beach erosion", state: "Odisha", district: "Puri", deaths: 0, displaced: 3600, damageCr: 175 },
  { id: "h-2024-ce-gj", year: 2024, hazard: "coastal_erosion", name: "Valsad coastal retreat", state: "Gujarat", district: "Valsad", deaths: 0, displaced: 4400, damageCr: 205 },
];
