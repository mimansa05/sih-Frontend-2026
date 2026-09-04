import { expect, test } from "bun:test";
import { RISK_ZONES } from "@/lib/discatra-data";
import { blockedZonesFrom } from "@/lib/relocation";
import { HOSPITALS, hospitalsGeoJSON, isHospitalInHazard, nearbyHospitals } from "./hospitals";

const blocked = blockedZonesFrom(RISK_ZONES);

test("helplines use the non-allocatable 1800-100 exchange and are distinct", () => {
  const bad = HOSPITALS.filter((h) => !/^1800-100-\d{4}$/.test(h.helpline));
  expect(bad.map((h) => h.helpline)).toEqual([]);
  expect(new Set(HOSPITALS.map((h) => h.helpline)).size).toBe(HOSPITALS.length);
});

test("a hospital standing inside a red or orange zone is never suggested", () => {
  // The closest facility to a hazard is usually the district hospital inside it.
  // Publishing that number sends people towards the event they are fleeing.
  for (const zone of RISK_ZONES) {
    const offered = nearbyHospitals({ lng: zone.lng, lat: zone.lat });
    const inHazard = offered.filter(({ hospital }) => isHospitalInHazard(hospital, blocked));
    expect(inHazard.map(({ hospital }) => `${zone.name}: ${hospital.name}`)).toEqual([]);
  }
});

test("the map layer offers exactly the hospitals the panel would", () => {
  // Both carry a dial-able helpline, so they must agree on what is offerable.
  const pinned = hospitalsGeoJSON().features.map((f) => f.properties.id);
  const offerable = HOSPITALS.filter((h) => !isHospitalInHazard(h, blocked)).map((h) => h.id);
  expect(pinned).toEqual(offerable);
});

test("every risk zone still has a hospital to call after filtering", () => {
  const empty = RISK_ZONES.filter((z) => nearbyHospitals({ lng: z.lng, lat: z.lat }).length === 0);
  expect(empty.map((z) => z.name)).toEqual([]);
});
