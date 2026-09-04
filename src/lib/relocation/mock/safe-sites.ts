import type { SafeSite } from "../types";

/**
 * DEMO SAFE-SITE CATALOGUE — mock data for development.
 *
 * These are invented facility records, not a government shelter register. Names
 * are generic ("relief centre", "shelter complex"), and capacity, occupancy and
 * safety scores are made up for the demo. Coordinates are placed on real
 * inhabited ground near the hazard clusters so routing and distances behave
 * realistically, and every site sits outside the avoidance buffer of every red
 * and orange zone in the risk layer.
 *
 * Helplines use the non-allocatable 1800-000 exchange on purpose: demo data
 * must never carry a number that dials a real district emergency line.
 *
 * Replace this module with an API response of the same shape — nothing else in
 * the relocation feature reads it directly.
 *
 * `availableCapacity` is never stored: it is always derived as
 * `totalCapacity - occupiedCapacity` (see `../types`).
 */
export const MOCK_SAFE_SITES: SafeSite[] = [
  // ── Uttarakhand ─────────────────────────────────────────────────────────
  { id: "site-uk-01", name: "Auli Ridge Relief Camp", kind: "Relief centre", state: "Uttarakhand", district: "Chamoli", lng: 79.62, lat: 30.5, totalCapacity: 1000, occupiedCapacity: 0, safetyScore: 96, helpline: "1800-000-1001", status: "safe" },
  { id: "site-uk-08", name: "Tapovan Valley Shelter", kind: "Shelter complex", state: "Uttarakhand", district: "Chamoli", lng: 79.48, lat: 30.5, totalCapacity: 1000, occupiedCapacity: 0, safetyScore: 95, helpline: "1800-000-1002", status: "safe" },
  { id: "site-uk-09", name: "Pandukeshwar Transit Camp", kind: "Transit camp", state: "Uttarakhand", district: "Chamoli", lng: 79.5, lat: 30.65, totalCapacity: 600, occupiedCapacity: 0, safetyScore: 85, helpline: "1800-000-1064", status: "safe" },
  { id: "site-uk-02", name: "Nandprayag Valley Shelter", kind: "Shelter complex", state: "Uttarakhand", district: "Chamoli", lng: 79.24, lat: 30.36, totalCapacity: 1000, occupiedCapacity: 0, safetyScore: 94, helpline: "1800-000-1003", status: "safe" },
  { id: "site-uk-03", name: "Guptkashi Transit Shelter", kind: "Transit camp", state: "Uttarakhand", district: "Rudraprayag", lng: 79.05, lat: 30.53, totalCapacity: 1400, occupiedCapacity: 120, safetyScore: 89, helpline: "1800-000-1004", status: "safe" },
  { id: "site-uk-04", name: "Srinagar Garhwal Relief Campus", kind: "Relief centre", state: "Uttarakhand", district: "Pauri Garhwal", lng: 78.79, lat: 30.14, totalCapacity: 1500, occupiedCapacity: 300, safetyScore: 92, helpline: "1800-000-1005", status: "safe" },
  { id: "site-uk-05", name: "New Tehri Shelter Complex", kind: "Shelter complex", state: "Uttarakhand", district: "Tehri Garhwal", lng: 78.44, lat: 30.24, totalCapacity: 1200, occupiedCapacity: 150, safetyScore: 90, helpline: "1800-000-1006", status: "safe" },
  { id: "site-uk-06", name: "Barkot Transit Shelter", kind: "Transit camp", state: "Uttarakhand", district: "Uttarkashi", lng: 78.3, lat: 30.6, totalCapacity: 900, occupiedCapacity: 90, safetyScore: 87, helpline: "1800-000-1007", status: "safe" },
  { id: "site-uk-07", name: "Pithoragarh District Shelter", kind: "Relief centre", state: "Uttarakhand", district: "Pithoragarh", lng: 80.05, lat: 29.45, totalCapacity: 900, occupiedCapacity: 60, safetyScore: 88, helpline: "1800-000-1008", status: "safe" },
  { id: "site-uk-10", name: "Ukhimath Ridge Shelter", kind: "Shelter complex", state: "Uttarakhand", district: "Rudraprayag", lng: 79.09, lat: 30.52, totalCapacity: 900, occupiedCapacity: 50, safetyScore: 88, helpline: "1800-000-1065", status: "safe" },
  { id: "site-uk-11", name: "Chinyalisaur Transit Camp", kind: "Transit camp", state: "Uttarakhand", district: "Uttarkashi", lng: 78.4, lat: 30.57, totalCapacity: 900, occupiedCapacity: 80, safetyScore: 87, helpline: "1800-000-1066", status: "safe" },
  { id: "site-uk-12", name: "Kalimath Valley Shelter", kind: "Shelter complex", state: "Uttarakhand", district: "Rudraprayag", lng: 79.0, lat: 30.55, totalCapacity: 1000, occupiedCapacity: 80, safetyScore: 88, helpline: "1800-000-1087", status: "safe" },
  { id: "site-uk-13", name: "Chandrapuri Transit Camp", kind: "Transit camp", state: "Uttarakhand", district: "Rudraprayag", lng: 79.01, lat: 30.45, totalCapacity: 900, occupiedCapacity: 60, safetyScore: 87, helpline: "1800-000-1088", status: "safe" },

  // ── Himachal Pradesh ────────────────────────────────────────────────────
  { id: "site-hp-01", name: "Reckong Peo Relief Centre", kind: "Relief centre", state: "Himachal Pradesh", district: "Kinnaur", lng: 78.27, lat: 31.54, totalCapacity: 800, occupiedCapacity: 50, safetyScore: 91, helpline: "1800-000-1009", status: "safe" },
  { id: "site-hp-02", name: "Bhuntar Transit Camp", kind: "Transit camp", state: "Himachal Pradesh", district: "Kullu", lng: 77.19, lat: 31.78, totalCapacity: 1100, occupiedCapacity: 200, safetyScore: 93, helpline: "1800-000-1010", status: "safe" },
  { id: "site-hp-03", name: "Mandi Relief Campus", kind: "Relief centre", state: "Himachal Pradesh", district: "Mandi", lng: 77.05, lat: 31.75, totalCapacity: 1400, occupiedCapacity: 240, safetyScore: 90, helpline: "1800-000-1011", status: "safe" },
  { id: "site-hp-04", name: "Sundernagar Shelter Complex", kind: "Shelter complex", state: "Himachal Pradesh", district: "Mandi", lng: 76.88, lat: 31.53, totalCapacity: 1000, occupiedCapacity: 100, safetyScore: 89, helpline: "1800-000-1012", status: "safe" },
  { id: "site-hp-05", name: "Keylong District Shelter", kind: "Relief centre", state: "Himachal Pradesh", district: "Lahaul & Spiti", lng: 77.03, lat: 32.42, totalCapacity: 500, occupiedCapacity: 40, safetyScore: 85, helpline: "1800-000-1013", status: "safe" },
  { id: "site-hp-06", name: "Dharamshala Relief Centre", kind: "Relief centre", state: "Himachal Pradesh", district: "Kangra", lng: 76.32, lat: 32.22, totalCapacity: 1600, occupiedCapacity: 300, safetyScore: 92, helpline: "1800-000-1014", status: "safe" },
  { id: "site-hp-07", name: "Shimla Rural Shelter", kind: "School shelter", state: "Himachal Pradesh", district: "Shimla", lng: 77.3, lat: 31.02, totalCapacity: 900, occupiedCapacity: 180, safetyScore: 86, helpline: "1800-000-1015", status: "safe" },

  // ── Jammu & Kashmir / Ladakh ────────────────────────────────────────────
  { id: "site-jk-01", name: "Doda District Shelter", kind: "Relief centre", state: "Jammu & Kashmir", district: "Doda", lng: 75.55, lat: 33.14, totalCapacity: 1000, occupiedCapacity: 120, safetyScore: 88, helpline: "1800-000-1016", status: "safe" },
  { id: "site-ld-01", name: "Leh Valley Relief Camp", kind: "Transit camp", state: "Ladakh", district: "Leh", lng: 77.45, lat: 34.05, totalCapacity: 600, occupiedCapacity: 60, safetyScore: 87, helpline: "1800-000-1017", status: "safe" },
  { id: "site-jk-02", name: "Bhaderwah Shelter Complex", kind: "Shelter complex", state: "Jammu & Kashmir", district: "Doda", lng: 75.72, lat: 32.98, totalCapacity: 800, occupiedCapacity: 60, safetyScore: 87, helpline: "1800-000-1067", status: "safe" },
  { id: "site-jk-03", name: "Ramban Transit Camp", kind: "Transit camp", state: "Jammu & Kashmir", district: "Ramban", lng: 75.24, lat: 33.24, totalCapacity: 700, occupiedCapacity: 80, safetyScore: 85, helpline: "1800-000-1068", status: "safe" },

  // ── Sikkim / North Bengal ───────────────────────────────────────────────
  { id: "site-sk-01", name: "Gangtok Relief Campus", kind: "Relief centre", state: "Sikkim", district: "Gangtok", lng: 88.6, lat: 27.31, totalCapacity: 1200, occupiedCapacity: 200, safetyScore: 91, helpline: "1800-000-1018", status: "safe" },
  { id: "site-sk-02", name: "Singtam Transit Shelter", kind: "Transit camp", state: "Sikkim", district: "Gangtok", lng: 88.48, lat: 27.23, totalCapacity: 900, occupiedCapacity: 80, safetyScore: 88, helpline: "1800-000-1019", status: "safe" },
  { id: "site-wb-01", name: "Kurseong Relief Centre", kind: "Relief centre", state: "West Bengal", district: "Darjeeling", lng: 88.28, lat: 26.88, totalCapacity: 900, occupiedCapacity: 120, safetyScore: 89, helpline: "1800-000-1020", status: "safe" },
  { id: "site-wb-02", name: "Siliguri Shelter Complex", kind: "Shelter complex", state: "West Bengal", district: "Darjeeling", lng: 88.43, lat: 26.72, totalCapacity: 2000, occupiedCapacity: 400, safetyScore: 93, helpline: "1800-000-1021", status: "safe" },
  { id: "site-sk-03", name: "Rangpo Transit Shelter", kind: "Transit camp", state: "Sikkim", district: "Pakyong", lng: 88.53, lat: 27.18, totalCapacity: 800, occupiedCapacity: 80, safetyScore: 88, helpline: "1800-000-1069", status: "safe" },

  // ── Assam / Arunachal ───────────────────────────────────────────────────
  { id: "site-as-01", name: "Tinsukia Flood Relief Camp", kind: "Relief centre", state: "Assam", district: "Tinsukia", lng: 95.36, lat: 27.49, totalCapacity: 2200, occupiedCapacity: 300, safetyScore: 92, helpline: "1800-000-1022", status: "safe" },
  { id: "site-as-02", name: "Naharkatia Shelter Complex", kind: "Shelter complex", state: "Assam", district: "Dibrugarh", lng: 95.33, lat: 27.29, totalCapacity: 1400, occupiedCapacity: 150, safetyScore: 90, helpline: "1800-000-1023", status: "safe" },
  { id: "site-as-03", name: "Sivasagar Relief Centre", kind: "Relief centre", state: "Assam", district: "Sivasagar", lng: 94.63, lat: 26.98, totalCapacity: 1500, occupiedCapacity: 250, safetyScore: 89, helpline: "1800-000-1024", status: "safe" },
  { id: "site-as-04", name: "North Lakhimpur Shelter", kind: "Shelter complex", state: "Assam", district: "Lakhimpur", lng: 94.1, lat: 27.23, totalCapacity: 1600, occupiedCapacity: 200, safetyScore: 91, helpline: "1800-000-1025", status: "safe" },
  { id: "site-as-05", name: "Nalbari Relief Camp", kind: "Relief centre", state: "Assam", district: "Nalbari", lng: 91.44, lat: 26.44, totalCapacity: 1400, occupiedCapacity: 260, safetyScore: 90, helpline: "1800-000-1026", status: "safe" },
  { id: "site-as-06", name: "Bongaigaon Shelter Complex", kind: "Shelter complex", state: "Assam", district: "Bongaigaon", lng: 90.55, lat: 26.48, totalCapacity: 1300, occupiedCapacity: 180, safetyScore: 88, helpline: "1800-000-1027", status: "safe" },
  { id: "site-ar-01", name: "Ziro Valley Shelter", kind: "School shelter", state: "Arunachal Pradesh", district: "Lower Subansiri", lng: 93.83, lat: 27.54, totalCapacity: 600, occupiedCapacity: 40, safetyScore: 86, helpline: "1800-000-1028", status: "safe" },
  { id: "site-as-07", name: "Moran Shelter Complex", kind: "Shelter complex", state: "Assam", district: "Dibrugarh", lng: 94.92, lat: 27.18, totalCapacity: 1400, occupiedCapacity: 200, safetyScore: 90, helpline: "1800-000-1070", status: "safe" },
  { id: "site-as-08", name: "Duliajan Transit Camp", kind: "Transit camp", state: "Assam", district: "Dibrugarh", lng: 95.32, lat: 27.36, totalCapacity: 900, occupiedCapacity: 100, safetyScore: 88, helpline: "1800-000-1071", status: "safe" },
  { id: "site-as-09", name: "Sonari Relief Centre", kind: "Relief centre", state: "Assam", district: "Charaideo", lng: 95.02, lat: 27.03, totalCapacity: 1000, occupiedCapacity: 120, safetyScore: 88, helpline: "1800-000-1072", status: "safe" },

  // ── Bihar / Uttar Pradesh ───────────────────────────────────────────────
  { id: "site-br-01", name: "Darbhanga Relief Campus", kind: "Relief centre", state: "Bihar", district: "Darbhanga", lng: 85.72, lat: 25.95, totalCapacity: 2200, occupiedCapacity: 400, safetyScore: 92, helpline: "1800-000-1029", status: "safe" },
  { id: "site-br-02", name: "Samastipur Shelter Complex", kind: "Shelter complex", state: "Bihar", district: "Samastipur", lng: 85.78, lat: 25.86, totalCapacity: 1800, occupiedCapacity: 300, safetyScore: 90, helpline: "1800-000-1030", status: "safe" },
  { id: "site-br-03", name: "Madhubani Transit Camp", kind: "Transit camp", state: "Bihar", district: "Madhubani", lng: 86.07, lat: 26.35, totalCapacity: 1800, occupiedCapacity: 250, safetyScore: 88, helpline: "1800-000-1031", status: "safe" },
  { id: "site-br-04", name: "Saharsa Relief Centre", kind: "Relief centre", state: "Bihar", district: "Saharsa", lng: 86.59, lat: 25.88, totalCapacity: 2000, occupiedCapacity: 200, safetyScore: 89, helpline: "1800-000-1032", status: "safe" },
  { id: "site-up-01", name: "Gorakhpur City Relief Campus", kind: "Relief centre", state: "Uttar Pradesh", district: "Gorakhpur", lng: 83.42, lat: 26.62, totalCapacity: 2400, occupiedCapacity: 500, safetyScore: 91, helpline: "1800-000-1033", status: "safe" },
  { id: "site-up-02", name: "Deoria Shelter Complex", kind: "Shelter complex", state: "Uttar Pradesh", district: "Deoria", lng: 83.79, lat: 26.5, totalCapacity: 1400, occupiedCapacity: 180, safetyScore: 88, helpline: "1800-000-1034", status: "safe" },
  { id: "site-br-05", name: "Hajipur Relief Campus", kind: "Relief centre", state: "Bihar", district: "Vaishali", lng: 85.21, lat: 25.69, totalCapacity: 1600, occupiedCapacity: 250, safetyScore: 90, helpline: "1800-000-1073", status: "safe" },
  { id: "site-br-06", name: "Sitamarhi Shelter Complex", kind: "Shelter complex", state: "Bihar", district: "Sitamarhi", lng: 85.49, lat: 26.6, totalCapacity: 1200, occupiedCapacity: 150, safetyScore: 88, helpline: "1800-000-1074", status: "safe" },
  { id: "site-br-07", name: "Rosera Transit Camp", kind: "Transit camp", state: "Bihar", district: "Samastipur", lng: 86.03, lat: 25.75, totalCapacity: 1200, occupiedCapacity: 150, safetyScore: 88, helpline: "1800-000-1075", status: "safe" },
  { id: "site-br-08", name: "Buxar District Relief Campus", kind: "Relief centre", state: "Bihar", district: "Buxar", lng: 83.98, lat: 25.56, totalCapacity: 1400, occupiedCapacity: 200, safetyScore: 90, helpline: "1800-000-1076", status: "safe" },
  { id: "site-up-03", name: "Rasra Shelter Complex", kind: "Shelter complex", state: "Uttar Pradesh", district: "Ballia", lng: 83.85, lat: 25.85, totalCapacity: 900, occupiedCapacity: 60, safetyScore: 88, helpline: "1800-000-1077", status: "safe" },
  { id: "site-up-04", name: "Sikanderpur Transit Camp", kind: "Transit camp", state: "Uttar Pradesh", district: "Ballia", lng: 84.05, lat: 26.05, totalCapacity: 1200, occupiedCapacity: 180, safetyScore: 89, helpline: "1800-000-1078", status: "safe" },

  // ── West Bengal (Ganga / Sundarbans) ────────────────────────────────────
  { id: "site-wb-03", name: "Berhampore Relief Campus", kind: "Relief centre", state: "West Bengal", district: "Murshidabad", lng: 88.3, lat: 24.05, totalCapacity: 1800, occupiedCapacity: 300, safetyScore: 90, helpline: "1800-000-1035", status: "safe" },
  { id: "site-wb-04", name: "Kakdwip Relief Centre", kind: "Relief centre", state: "West Bengal", district: "South 24 Parganas", lng: 88.2, lat: 22.02, totalCapacity: 1200, occupiedCapacity: 260, safetyScore: 88, helpline: "1800-000-1036", status: "safe" },
  { id: "site-wb-05", name: "Diamond Harbour Shelter Complex", kind: "Shelter complex", state: "West Bengal", district: "South 24 Parganas", lng: 88.19, lat: 22.19, totalCapacity: 1600, occupiedCapacity: 300, safetyScore: 91, helpline: "1800-000-1037", status: "safe" },
  { id: "site-wb-06", name: "Namkhana Cyclone Shelter", kind: "Cyclone shelter", state: "West Bengal", district: "South 24 Parganas", lng: 88.23, lat: 21.76, totalCapacity: 900, occupiedCapacity: 100, safetyScore: 88, helpline: "1800-000-1079", status: "safe" },
  { id: "site-wb-07", name: "Kulpi Relief Centre", kind: "Relief centre", state: "West Bengal", district: "South 24 Parganas", lng: 88.28, lat: 22.08, totalCapacity: 1000, occupiedCapacity: 120, safetyScore: 89, helpline: "1800-000-1080", status: "safe" },

  // ── Odisha ──────────────────────────────────────────────────────────────
  { id: "site-od-01", name: "Rajnagar Coastal Shelter", kind: "Cyclone shelter", state: "Odisha", district: "Kendrapara", lng: 86.72, lat: 20.6, totalCapacity: 1400, occupiedCapacity: 0, safetyScore: 90, helpline: "1800-000-1038", status: "safe" },
  { id: "site-od-02", name: "Kendrapara District Shelter", kind: "Shelter complex", state: "Odisha", district: "Kendrapara", lng: 86.5, lat: 20.62, totalCapacity: 1200, occupiedCapacity: 200, safetyScore: 88, helpline: "1800-000-1039", status: "safe" },
  { id: "site-od-03", name: "Puri District Shelter", kind: "Cyclone shelter", state: "Odisha", district: "Puri", lng: 85.9, lat: 19.95, totalCapacity: 1500, occupiedCapacity: 250, safetyScore: 89, helpline: "1800-000-1040", status: "safe" },
  { id: "site-od-04", name: "Pattamundai Shelter Complex", kind: "Shelter complex", state: "Odisha", district: "Kendrapara", lng: 86.57, lat: 20.58, totalCapacity: 1100, occupiedCapacity: 100, safetyScore: 89, helpline: "1800-000-1081", status: "safe" },
  { id: "site-od-05", name: "Chandbali Cyclone Shelter", kind: "Cyclone shelter", state: "Odisha", district: "Bhadrak", lng: 86.75, lat: 20.78, totalCapacity: 900, occupiedCapacity: 50, safetyScore: 88, helpline: "1800-000-1082", status: "safe" },

  // ── Andhra Pradesh ──────────────────────────────────────────────────────
  { id: "site-ap-01", name: "Kakinada Relief Campus", kind: "Relief centre", state: "Andhra Pradesh", district: "Kakinada", lng: 82.24, lat: 16.95, totalCapacity: 1600, occupiedCapacity: 300, safetyScore: 91, helpline: "1800-000-1041", status: "safe" },
  { id: "site-ap-02", name: "Pithapuram Shelter Complex", kind: "Shelter complex", state: "Andhra Pradesh", district: "Kakinada", lng: 82.25, lat: 17.12, totalCapacity: 1100, occupiedCapacity: 150, safetyScore: 89, helpline: "1800-000-1042", status: "safe" },
  { id: "site-ap-03", name: "Machilipatnam Inland Shelter", kind: "Cyclone shelter", state: "Andhra Pradesh", district: "Krishna", lng: 81.1, lat: 16.32, totalCapacity: 1300, occupiedCapacity: 200, safetyScore: 88, helpline: "1800-000-1043", status: "safe" },
  { id: "site-ap-04", name: "Gudivada Relief Centre", kind: "Relief centre", state: "Andhra Pradesh", district: "Krishna", lng: 80.99, lat: 16.43, totalCapacity: 1200, occupiedCapacity: 150, safetyScore: 89, helpline: "1800-000-1083", status: "safe" },
  { id: "site-ap-05", name: "Kaikaluru Cyclone Shelter", kind: "Cyclone shelter", state: "Andhra Pradesh", district: "Eluru", lng: 81.21, lat: 16.55, totalCapacity: 1000, occupiedCapacity: 100, safetyScore: 88, helpline: "1800-000-1084", status: "safe" },

  // ── Tamil Nadu ──────────────────────────────────────────────────────────
  { id: "site-tn-01", name: "Mettupalayam Transit Shelter", kind: "Transit camp", state: "Tamil Nadu", district: "Coimbatore", lng: 76.94, lat: 11.3, totalCapacity: 1000, occupiedCapacity: 120, safetyScore: 90, helpline: "1800-000-1044", status: "safe" },
  { id: "site-tn-02", name: "Coimbatore Relief Campus", kind: "Relief centre", state: "Tamil Nadu", district: "Coimbatore", lng: 76.96, lat: 11.02, totalCapacity: 2200, occupiedCapacity: 400, safetyScore: 93, helpline: "1800-000-1045", status: "safe" },
  { id: "site-tn-03", name: "Chennai Peripheral Shelter", kind: "Shelter complex", state: "Tamil Nadu", district: "Chengalpattu", lng: 80.1, lat: 12.85, totalCapacity: 2000, occupiedCapacity: 500, safetyScore: 90, helpline: "1800-000-1046", status: "safe" },
  { id: "site-tn-04", name: "Tiruvarur District Shelter", kind: "Cyclone shelter", state: "Tamil Nadu", district: "Tiruvarur", lng: 79.64, lat: 10.77, totalCapacity: 1200, occupiedCapacity: 180, safetyScore: 88, helpline: "1800-000-1047", status: "safe" },

  // ── Kerala ──────────────────────────────────────────────────────────────
  { id: "site-kl-01", name: "Kalpetta Relief Campus", kind: "Relief centre", state: "Kerala", district: "Wayanad", lng: 76.02, lat: 11.55, totalCapacity: 1200, occupiedCapacity: 150, safetyScore: 92, helpline: "1800-000-1048", status: "safe" },
  { id: "site-kl-02", name: "Sultan Bathery Shelter Complex", kind: "Shelter complex", state: "Kerala", district: "Wayanad", lng: 76.26, lat: 11.66, totalCapacity: 1000, occupiedCapacity: 100, safetyScore: 90, helpline: "1800-000-1049", status: "safe" },
  { id: "site-kl-03", name: "Thodupuzha Relief Centre", kind: "Relief centre", state: "Kerala", district: "Idukki", lng: 76.72, lat: 9.9, totalCapacity: 1400, occupiedCapacity: 200, safetyScore: 91, helpline: "1800-000-1050", status: "safe" },
  { id: "site-kl-04", name: "Kattappana Shelter", kind: "School shelter", state: "Kerala", district: "Idukki", lng: 77.12, lat: 9.75, totalCapacity: 800, occupiedCapacity: 90, safetyScore: 87, helpline: "1800-000-1051", status: "safe" },
  { id: "site-kl-05", name: "Kochi Inland Relief Campus", kind: "Relief centre", state: "Kerala", district: "Ernakulam", lng: 76.4, lat: 9.98, totalCapacity: 2000, occupiedCapacity: 350, safetyScore: 93, helpline: "1800-000-1052", status: "safe" },
  { id: "site-kl-06", name: "Alappuzha Inland Shelter", kind: "Shelter complex", state: "Kerala", district: "Alappuzha", lng: 76.45, lat: 9.42, totalCapacity: 1300, occupiedCapacity: 220, safetyScore: 89, helpline: "1800-000-1053", status: "safe" },
  { id: "site-kl-07", name: "Kozhikode Inland Campus", kind: "Relief centre", state: "Kerala", district: "Kozhikode", lng: 75.92, lat: 11.32, totalCapacity: 1500, occupiedCapacity: 250, safetyScore: 90, helpline: "1800-000-1054", status: "safe" },

  // ── Karnataka / Maharashtra / Gujarat ───────────────────────────────────
  { id: "site-ka-01", name: "Madikeri Ridge Shelter", kind: "Shelter complex", state: "Karnataka", district: "Kodagu", lng: 75.6, lat: 12.28, totalCapacity: 900, occupiedCapacity: 120, safetyScore: 88, helpline: "1800-000-1055", status: "safe" },
  { id: "site-ka-02", name: "Hunsur Relief Campus", kind: "Relief centre", state: "Karnataka", district: "Mysuru", lng: 76.1, lat: 12.35, totalCapacity: 1400, occupiedCapacity: 200, safetyScore: 91, helpline: "1800-000-1056", status: "safe" },
  { id: "site-ka-03", name: "Karwar Inland Shelter", kind: "Cyclone shelter", state: "Karnataka", district: "Uttara Kannada", lng: 74.3, lat: 14.7, totalCapacity: 800, occupiedCapacity: 100, safetyScore: 87, helpline: "1800-000-1057", status: "safe" },
  { id: "site-ka-04", name: "Bengaluru Emergency Shelter", kind: "Shelter complex", state: "Karnataka", district: "Bengaluru Rural", lng: 77.7, lat: 13.05, totalCapacity: 2500, occupiedCapacity: 400, safetyScore: 92, helpline: "1800-000-1058", status: "safe" },
  { id: "site-mh-01", name: "Panvel Relief Campus", kind: "Relief centre", state: "Maharashtra", district: "Raigad", lng: 73.11, lat: 18.99, totalCapacity: 1800, occupiedCapacity: 300, safetyScore: 91, helpline: "1800-000-1059", status: "safe" },
  { id: "site-mh-02", name: "Khopoli Transit Shelter", kind: "Transit camp", state: "Maharashtra", district: "Raigad", lng: 73.4, lat: 18.72, totalCapacity: 1000, occupiedCapacity: 150, safetyScore: 88, helpline: "1800-000-1060", status: "safe" },
  { id: "site-mh-03", name: "Ratnagiri District Shelter", kind: "Cyclone shelter", state: "Maharashtra", district: "Ratnagiri", lng: 73.45, lat: 17.05, totalCapacity: 1100, occupiedCapacity: 160, safetyScore: 89, helpline: "1800-000-1061", status: "safe" },
  { id: "site-gj-01", name: "Khambhalia Relief Centre", kind: "Relief centre", state: "Gujarat", district: "Devbhumi Dwarka", lng: 69.55, lat: 22.15, totalCapacity: 1200, occupiedCapacity: 180, safetyScore: 89, helpline: "1800-000-1062", status: "safe" },
  { id: "site-gj-02", name: "Valsad Inland Shelter", kind: "Shelter complex", state: "Gujarat", district: "Valsad", lng: 72.98, lat: 20.65, totalCapacity: 1300, occupiedCapacity: 200, safetyScore: 88, helpline: "1800-000-1063", status: "safe" },
  { id: "site-gj-03", name: "Mithapur Coastal Shelter", kind: "Cyclone shelter", state: "Gujarat", district: "Devbhumi Dwarka", lng: 69.0, lat: 22.42, totalCapacity: 800, occupiedCapacity: 60, safetyScore: 88, helpline: "1800-000-1085", status: "safe" },
  { id: "site-gj-04", name: "Bhatiya Transit Camp", kind: "Transit camp", state: "Gujarat", district: "Devbhumi Dwarka", lng: 69.35, lat: 22.42, totalCapacity: 700, occupiedCapacity: 50, safetyScore: 87, helpline: "1800-000-1086", status: "safe" },
];
