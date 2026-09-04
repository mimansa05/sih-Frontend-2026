import { RISK_ZONES } from "@/lib/discatra-data";
import { blockedZonesFrom, haversineKm, isPointBlocked, type BlockedZone } from "@/lib/relocation";

/**
 * DEMO HOSPITAL DIRECTORY — illustrative facilities for development.
 *
 * Invented bed counts and helplines attached to real district-HQ / medical
 * college names near each seeded risk zone, so "nearby hospitals" always
 * returns something on the demo data. NOT an official health-facility
 * register. Swap this module for an API response of the same shape.
 *
 * Helplines use the 1800-100 demo exchange — distinct from the safe-site
 * 1800-000 range so the two never collide.
 *
 * One record per line; do not prettier-format.
 */

export type HospitalKind =
  "Medical college" | "District hospital" | "Trauma centre" | "Community health centre";

export interface Hospital {
  id: string;
  name: string;
  kind: HospitalKind;
  state: string;
  district: string;
  lng: number;
  lat: number;
  /** Sanctioned in-patient beds (demo figure). */
  beds: number;
  helpline: string;
}

// prettier-ignore
export const HOSPITALS: Hospital[] = [
  // ── Uttarakhand (Chamoli / Rudraprayag / Kedarnath belt) ────────────────
  { id: "hosp-uk-01", name: "Joshimath Community Health Centre", kind: "Community health centre", state: "Uttarakhand", district: "Chamoli", lng: 79.564, lat: 30.556, beds: 60, helpline: "1800-100-2001" },
  { id: "hosp-uk-02", name: "District Hospital Gopeshwar", kind: "District hospital", state: "Uttarakhand", district: "Chamoli", lng: 79.333, lat: 30.406, beds: 220, helpline: "1800-100-2002" },
  { id: "hosp-uk-03", name: "District Hospital Rudraprayag", kind: "District hospital", state: "Uttarakhand", district: "Rudraprayag", lng: 78.981, lat: 30.284, beds: 180, helpline: "1800-100-2003" },
  { id: "hosp-uk-04", name: "Base Hospital Srinagar Garhwal", kind: "Medical college", state: "Uttarakhand", district: "Pauri Garhwal", lng: 78.783, lat: 30.222, beds: 540, helpline: "1800-100-2004" },
  { id: "hosp-uk-05", name: "Sub-District Hospital Karnaprayag", kind: "District hospital", state: "Uttarakhand", district: "Chamoli", lng: 79.215, lat: 30.26, beds: 120, helpline: "1800-100-2120" },
  { id: "hosp-uk-06", name: "Sub-District Hospital Ukhimath", kind: "Community health centre", state: "Uttarakhand", district: "Rudraprayag", lng: 79.09, lat: 30.52, beds: 80, helpline: "1800-100-2121" },
  { id: "hosp-uk-07", name: "District Hospital New Tehri", kind: "District hospital", state: "Uttarakhand", district: "Tehri Garhwal", lng: 78.48, lat: 30.38, beds: 200, helpline: "1800-100-2122" },
  { id: "hosp-uk-08", name: "Community Health Centre Chinyalisaur", kind: "Community health centre", state: "Uttarakhand", district: "Uttarkashi", lng: 78.4, lat: 30.57, beds: 60, helpline: "1800-100-2123" },
  { id: "hosp-uk-09", name: "Community Health Centre Nandprayag", kind: "Community health centre", state: "Uttarakhand", district: "Chamoli", lng: 79.32, lat: 30.33, beds: 50, helpline: "1800-100-2124" },
  // ── Himachal Pradesh (Kullu) ───────────────────────────────────────────
  { id: "hosp-hp-01", name: "Regional Hospital Kullu", kind: "District hospital", state: "Himachal Pradesh", district: "Kullu", lng: 77.109, lat: 31.958, beds: 300, helpline: "1800-100-2010" },
  { id: "hosp-hp-02", name: "Lal Bahadur Shastri Medical College Mandi", kind: "Medical college", state: "Himachal Pradesh", district: "Mandi", lng: 76.932, lat: 31.708, beds: 500, helpline: "1800-100-2011" },
  { id: "hosp-hp-03", name: "Civil Hospital Manali", kind: "District hospital", state: "Himachal Pradesh", district: "Kullu", lng: 77.19, lat: 32.24, beds: 100, helpline: "1800-100-2125" },
  { id: "hosp-hp-04", name: "Sub-District Hospital Banjar", kind: "Community health centre", state: "Himachal Pradesh", district: "Kullu", lng: 77.34, lat: 31.64, beds: 60, helpline: "1800-100-2126" },
  // ── Jammu & Kashmir (Kishtwar) ─────────────────────────────────────────
  { id: "hosp-jk-01", name: "District Hospital Kishtwar", kind: "District hospital", state: "Jammu & Kashmir", district: "Kishtwar", lng: 75.769, lat: 33.312, beds: 200, helpline: "1800-100-2015" },
  { id: "hosp-jk-02", name: "GMC Associated Hospital Doda", kind: "Medical college", state: "Jammu & Kashmir", district: "Doda", lng: 75.548, lat: 33.146, beds: 460, helpline: "1800-100-2016" },
  { id: "hosp-jk-03", name: "District Hospital Ramban", kind: "District hospital", state: "Jammu & Kashmir", district: "Ramban", lng: 75.24, lat: 33.24, beds: 150, helpline: "1800-100-2127" },
  { id: "hosp-jk-04", name: "Sub-District Hospital Bhaderwah", kind: "Community health centre", state: "Jammu & Kashmir", district: "Doda", lng: 75.72, lat: 32.98, beds: 100, helpline: "1800-100-2128" },
  // ── Bihar (Darbhanga) ─────────────────────────────────────────────────
  { id: "hosp-br-01", name: "Darbhanga Medical College & Hospital", kind: "Medical college", state: "Bihar", district: "Darbhanga", lng: 85.907, lat: 26.152, beds: 900, helpline: "1800-100-2020" },
  { id: "hosp-br-02", name: "Sadar Hospital Madhubani", kind: "District hospital", state: "Bihar", district: "Madhubani", lng: 86.071, lat: 26.352, beds: 260, helpline: "1800-100-2021" },
  { id: "hosp-br-03", name: "Sadar Hospital Samastipur", kind: "District hospital", state: "Bihar", district: "Samastipur", lng: 85.783, lat: 25.861, beds: 240, helpline: "1800-100-2022" },
  { id: "hosp-br-04", name: "Sadar Hospital Saharsa", kind: "District hospital", state: "Bihar", district: "Saharsa", lng: 86.59, lat: 25.88, beds: 300, helpline: "1800-100-2129" },
  { id: "hosp-br-05", name: "Sadar Hospital Hajipur", kind: "District hospital", state: "Bihar", district: "Vaishali", lng: 85.21, lat: 25.69, beds: 200, helpline: "1800-100-2130" },
  { id: "hosp-br-06", name: "Sadar Hospital Sitamarhi", kind: "District hospital", state: "Bihar", district: "Sitamarhi", lng: 85.49, lat: 26.6, beds: 220, helpline: "1800-100-2131" },
  { id: "hosp-br-07", name: "Sadar Hospital Buxar", kind: "District hospital", state: "Bihar", district: "Buxar", lng: 83.98, lat: 25.56, beds: 180, helpline: "1800-100-2132" },
  // ── Uttar Pradesh (Gorakhpur) ─────────────────────────────────────────
  { id: "hosp-up-01", name: "BRD Medical College Gorakhpur", kind: "Medical college", state: "Uttar Pradesh", district: "Gorakhpur", lng: 83.365, lat: 26.741, beds: 950, helpline: "1800-100-2030" },
  { id: "hosp-up-02", name: "District Hospital Gorakhpur", kind: "District hospital", state: "Uttar Pradesh", district: "Gorakhpur", lng: 83.373, lat: 26.76, beds: 320, helpline: "1800-100-2031" },
  { id: "hosp-up-03", name: "District Hospital Deoria", kind: "District hospital", state: "Uttar Pradesh", district: "Deoria", lng: 83.79, lat: 26.5, beds: 220, helpline: "1800-100-2133" },
  { id: "hosp-up-04", name: "Sadar Hospital Basti", kind: "District hospital", state: "Uttar Pradesh", district: "Basti", lng: 82.73, lat: 26.79, beds: 200, helpline: "1800-100-2134" },
  { id: "hosp-up-05", name: "Sadar Hospital Maharajganj", kind: "District hospital", state: "Uttar Pradesh", district: "Maharajganj", lng: 83.56, lat: 27.14, beds: 150, helpline: "1800-100-2135" },
  { id: "hosp-up-06", name: "District Hospital Ghazipur", kind: "District hospital", state: "Uttar Pradesh", district: "Ghazipur", lng: 83.58, lat: 25.58, beds: 200, helpline: "1800-100-2136" },
  { id: "hosp-up-07", name: "District Hospital Mau", kind: "District hospital", state: "Uttar Pradesh", district: "Mau", lng: 83.56, lat: 25.94, beds: 160, helpline: "1800-100-2137" },
  // ── Assam (Dibrugarh) ─────────────────────────────────────────────────
  { id: "hosp-as-01", name: "Assam Medical College & Hospital", kind: "Medical college", state: "Assam", district: "Dibrugarh", lng: 94.911, lat: 27.476, beds: 1150, helpline: "1800-100-2040" },
  { id: "hosp-as-02", name: "Tinsukia Civil Hospital", kind: "District hospital", state: "Assam", district: "Tinsukia", lng: 95.36, lat: 27.492, beds: 280, helpline: "1800-100-2041" },
  { id: "hosp-as-03", name: "Moranhat Civil Hospital", kind: "Community health centre", state: "Assam", district: "Charaideo", lng: 94.92, lat: 27.18, beds: 100, helpline: "1800-100-2138" },
  { id: "hosp-as-04", name: "Sivasagar Civil Hospital", kind: "District hospital", state: "Assam", district: "Sivasagar", lng: 94.63, lat: 26.98, beds: 220, helpline: "1800-100-2139" },
  // ── West Bengal (Darjeeling / South 24 Parganas) ──────────────────────
  { id: "hosp-wb-01", name: "Darjeeling District Hospital", kind: "District hospital", state: "West Bengal", district: "Darjeeling", lng: 88.263, lat: 27.041, beds: 300, helpline: "1800-100-2050" },
  { id: "hosp-wb-02", name: "North Bengal Medical College Siliguri", kind: "Medical college", state: "West Bengal", district: "Darjeeling", lng: 88.396, lat: 26.71, beds: 900, helpline: "1800-100-2051" },
  { id: "hosp-wb-03", name: "Diamond Harbour Medical College", kind: "Medical college", state: "West Bengal", district: "South 24 Parganas", lng: 88.19, lat: 22.19, beds: 520, helpline: "1800-100-2052" },
  { id: "hosp-wb-04", name: "District Hospital Kurseong", kind: "District hospital", state: "West Bengal", district: "Darjeeling", lng: 88.28, lat: 26.88, beds: 120, helpline: "1800-100-2140" },
  { id: "hosp-wb-05", name: "Rural Hospital Namkhana", kind: "Community health centre", state: "West Bengal", district: "South 24 Parganas", lng: 88.23, lat: 21.76, beds: 60, helpline: "1800-100-2141" },
  { id: "hosp-wb-06", name: "District Hospital Baruipur", kind: "District hospital", state: "West Bengal", district: "South 24 Parganas", lng: 88.43, lat: 22.36, beds: 250, helpline: "1800-100-2142" },
  // ── Kerala (Alappuzha) ───────────────────────────────────────────────
  { id: "hosp-kl-01", name: "Government Medical College Alappuzha", kind: "Medical college", state: "Kerala", district: "Alappuzha", lng: 76.339, lat: 9.492, beds: 680, helpline: "1800-100-2060" },
  { id: "hosp-kl-02", name: "District Hospital Alappuzha", kind: "District hospital", state: "Kerala", district: "Alappuzha", lng: 76.34, lat: 9.498, beds: 300, helpline: "1800-100-2061" },
  { id: "hosp-kl-03", name: "Wayanad Institute of Medical Sciences", kind: "Medical college", state: "Kerala", district: "Wayanad", lng: 76.08, lat: 11.61, beds: 620, helpline: "1800-100-2062" },
  { id: "hosp-kl-04", name: "Government Medical College Kottayam", kind: "Medical college", state: "Kerala", district: "Kottayam", lng: 76.6, lat: 9.6, beds: 1100, helpline: "1800-100-2143" },
  { id: "hosp-kl-05", name: "Taluk Hospital Chengannur", kind: "Community health centre", state: "Kerala", district: "Alappuzha", lng: 76.62, lat: 9.32, beds: 120, helpline: "1800-100-2144" },
  { id: "hosp-kl-06", name: "Government Medical College Ernakulam", kind: "Medical college", state: "Kerala", district: "Ernakulam", lng: 76.32, lat: 10.05, beds: 600, helpline: "1800-100-2145" },
  { id: "hosp-kl-07", name: "District Hospital Mananthavady", kind: "District hospital", state: "Kerala", district: "Wayanad", lng: 76.0, lat: 11.8, beds: 200, helpline: "1800-100-2146" },
  { id: "hosp-kl-08", name: "Government Medical College Kozhikode", kind: "Medical college", state: "Kerala", district: "Kozhikode", lng: 75.79, lat: 11.26, beds: 1000, helpline: "1800-100-2147" },
  // ── Sikkim (Mangan) ──────────────────────────────────────────────────
  { id: "hosp-sk-01", name: "Mangan District Hospital", kind: "District hospital", state: "Sikkim", district: "Mangan", lng: 88.53, lat: 27.51, beds: 160, helpline: "1800-100-2110" },
  { id: "hosp-sk-02", name: "STNM Hospital Gangtok", kind: "Medical college", state: "Sikkim", district: "Gangtok", lng: 88.606, lat: 27.329, beds: 1000, helpline: "1800-100-2111" },
  { id: "hosp-sk-03", name: "District Hospital Singtam", kind: "District hospital", state: "Sikkim", district: "Gangtok", lng: 88.48, lat: 27.23, beds: 100, helpline: "1800-100-2148" },
  // ── Maharashtra (Raigad) ─────────────────────────────────────────────
  { id: "hosp-mh-01", name: "District Civil Hospital Alibag", kind: "District hospital", state: "Maharashtra", district: "Raigad", lng: 72.872, lat: 18.641, beds: 360, helpline: "1800-100-2070" },
  { id: "hosp-mh-02", name: "MGM Medical College Navi Mumbai", kind: "Medical college", state: "Maharashtra", district: "Raigad", lng: 73.017, lat: 19.045, beds: 820, helpline: "1800-100-2071" },
  { id: "hosp-mh-03", name: "Sub-District Hospital Panvel", kind: "District hospital", state: "Maharashtra", district: "Raigad", lng: 73.11, lat: 18.99, beds: 150, helpline: "1800-100-2149" },
  // ── Odisha (Kendrapara) ──────────────────────────────────────────────
  { id: "hosp-od-01", name: "District Headquarters Hospital Kendrapara", kind: "District hospital", state: "Odisha", district: "Kendrapara", lng: 86.422, lat: 20.502, beds: 300, helpline: "1800-100-2080" },
  { id: "hosp-od-02", name: "SCB Medical College Cuttack", kind: "Medical college", state: "Odisha", district: "Cuttack", lng: 85.833, lat: 20.464, beds: 1400, helpline: "1800-100-2081" },
  { id: "hosp-od-03", name: "District Headquarters Hospital Bhadrak", kind: "District hospital", state: "Odisha", district: "Bhadrak", lng: 86.51, lat: 21.06, beds: 300, helpline: "1800-100-2150" },
  { id: "hosp-od-04", name: "Sub-Divisional Hospital Pattamundai", kind: "Community health centre", state: "Odisha", district: "Kendrapara", lng: 86.57, lat: 20.58, beds: 100, helpline: "1800-100-2151" },
  // ── Andhra Pradesh (Krishna) ─────────────────────────────────────────
  { id: "hosp-ap-01", name: "Government General Hospital Machilipatnam", kind: "District hospital", state: "Andhra Pradesh", district: "Krishna", lng: 81.14, lat: 16.187, beds: 350, helpline: "1800-100-2090" },
  { id: "hosp-ap-02", name: "Siddhartha Medical College Vijayawada", kind: "Medical college", state: "Andhra Pradesh", district: "NTR", lng: 80.648, lat: 16.507, beds: 1050, helpline: "1800-100-2091" },
  { id: "hosp-ap-03", name: "Area Hospital Gudivada", kind: "District hospital", state: "Andhra Pradesh", district: "Krishna", lng: 80.99, lat: 16.43, beds: 150, helpline: "1800-100-2152" },
  { id: "hosp-ap-04", name: "Government General Hospital Eluru", kind: "District hospital", state: "Andhra Pradesh", district: "Eluru", lng: 81.1, lat: 16.71, beds: 400, helpline: "1800-100-2153" },
  // ── Gujarat (Devbhumi Dwarka) ────────────────────────────────────────
  { id: "hosp-gj-01", name: "Sub-District Hospital Khambhalia", kind: "District hospital", state: "Gujarat", district: "Devbhumi Dwarka", lng: 69.657, lat: 22.2, beds: 220, helpline: "1800-100-2100" },
  { id: "hosp-gj-02", name: "Guru Gobind Singh Hospital Jamnagar", kind: "Medical college", state: "Gujarat", district: "Jamnagar", lng: 70.057, lat: 22.472, beds: 1200, helpline: "1800-100-2101" },
  { id: "hosp-gj-03", name: "Community Health Centre Bhatiya", kind: "Community health centre", state: "Gujarat", district: "Devbhumi Dwarka", lng: 69.35, lat: 22.42, beds: 50, helpline: "1800-100-2154" },
  { id: "hosp-gj-04", name: "Sub-District Hospital Salaya", kind: "Community health centre", state: "Gujarat", district: "Devbhumi Dwarka", lng: 69.6, lat: 22.31, beds: 80, helpline: "1800-100-2155" },
];

export interface NearbyHospital {
  hospital: Hospital;
  /** Straight-line distance from the reference point, km (1 dp). */
  distance: number;
}

/**
 * Facilities that are themselves inside a hazard.
 *
 * A hospital standing in a red or orange zone is not somewhere to send people
 * or to publish as a number to call: it is inside the event being evacuated,
 * and its own staff may be evacuating. The nearest facility is therefore not
 * automatically an offerable one — the same rule the safe-site discovery
 * applies to shelters (see relocation/site-discovery.ts).
 */
export function isHospitalInHazard(
  hospital: Hospital,
  blocked: BlockedZone[] = blockedZonesFrom(RISK_ZONES),
): BlockedZone | null {
  return isPointBlocked({ lng: hospital.lng, lat: hospital.lat }, blocked);
}

/**
 * Nearest *offerable* hospitals to a point, nearest first.
 *
 * Facilities inside a red/orange avoidance buffer are dropped before ranking,
 * so a hospital sitting in the hazard is never returned however close it is.
 */
export function nearbyHospitals(
  origin: { lng: number; lat: number },
  hospitals: readonly Hospital[] = HOSPITALS,
  limit = 4,
  radiusKm = 160,
  blocked: BlockedZone[] = blockedZonesFrom(RISK_ZONES),
): NearbyHospital[] {
  return hospitals
    .filter((hospital) => !isHospitalInHazard(hospital, blocked))
    .map((hospital) => ({
      hospital,
      distance: Math.round(haversineKm(origin, { lng: hospital.lng, lat: hospital.lat }) * 10) / 10,
    }))
    .filter((h) => h.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * GeoJSON for the map's hospital layer.
 *
 * Filtered by the same rule as `nearbyHospitals`: the marker carries a dial-able
 * helpline and a directions link, so a facility the panel refuses to recommend
 * must not be offered on the map either.
 */
export const hospitalsGeoJSON = (blocked: BlockedZone[] = blockedZonesFrom(RISK_ZONES)) => ({
  type: "FeatureCollection" as const,
  features: HOSPITALS.filter((h) => !isHospitalInHazard(h, blocked)).map((h) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
    properties: {
      id: h.id,
      name: h.name,
      kind: h.kind,
      state: h.state,
      district: h.district,
      beds: h.beds,
      helpline: h.helpline,
      lng: h.lng,
      lat: h.lat,
    },
  })),
});
