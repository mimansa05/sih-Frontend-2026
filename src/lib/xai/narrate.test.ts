import { expect, test } from "bun:test";
import { RISK_ZONES } from "@/lib/discatra-data";
import { buildAlerts } from "@/lib/relocation";
import type { RelocationPlan } from "@/lib/relocation";
import { narrateAlerts, narratePlan, narrateZoneSelected } from "./narrate";

const zone = RISK_ZONES.find((z) => z.id === "ls-uk-chm")!;

const site = (id: string, name: string) => ({
  id,
  name,
  kind: "Relief centre",
  state: "Uttarakhand",
  district: "Chamoli",
  lng: 79.5,
  lat: 30.5,
  totalCapacity: 1200,
  occupiedCapacity: 200,
  safetyScore: 92,
  status: "safe" as const,
  helpline: "1800-000-1234",
});

const origin = { id: "ap-1", name: "North assembly point", lng: 79.55, lat: 30.56 };

const plan: RelocationPlan = {
  zone,
  populationAtRisk: 2000,
  sites: [
    {
      site: site("site-a", "Tapovan Valley Shelter"),
      origin,
      distance: 18,
      route: {
        source: zone.id,
        origin,
        transferKm: 0,
        destination: "site-a",
        distance: 19.8,
        estimatedTime: 40,
        isSafe: true,
        blockedZones: [],
        avoidedZones: [],
        allocation: 1000,
        coordinates: [],
        provider: "osrm",
        mode: "live",
        road: true,
        direct: true,
      },
      allocation: 1000,
      status: "assigned",
    },
    {
      site: site("site-b", "Srinagar Garhwal Camp"),
      origin,
      distance: 60,
      route: null,
      allocation: 0,
      status: "no_safe_route",
    },
  ],
  excluded: [{ site: site("site-c", "Karnaprayag Hall"), reason: "no available capacity" }],
  totalAssigned: 1000,
  unassigned: 1000,
  reachableCapacity: 1000,
  status: "partial",
  routing: { provider: "osrm", mode: "live", label: "OSRM road routing", roadRouted: true },
  generatedAt: new Date().toISOString(),
};

test("zone selection reports the real risk level and population", () => {
  const text = narrateZoneSelected(zone)
    .map((s) => s.text)
    .join("\n");
  expect(text).toContain("Joshimath subsidence belt");
  expect(text).toContain("CRITICAL");
  expect(text).toContain("2,000");
});

test("a rejected route is narrated as an error naming the site", () => {
  const rejected = narratePlan(plan).find((s) => s.tag === "ROUTE" && s.level === "error");
  expect(rejected).toBeDefined();
  expect(rejected?.text).toContain("REJECTED");
  expect(rejected?.text).toContain("Srinagar Garhwal Camp");
});

test("a safe route is narrated with its real distance and time", () => {
  const safe = narratePlan(plan).find((s) => s.tag === "ROUTE" && s.level === "ok");
  expect(safe?.text).toContain("Tapovan Valley Shelter");
  expect(safe?.text).toContain("19.8 km");
  expect(safe?.text).toContain("40 min");
});

test("allocation is narrated from the plan totals, never recomputed", () => {
  // narratePlan emits two ALLOC lines — the per-destination breakdown, then the
  // totals summary — so this asserts across both rather than on line order.
  const alloc = narratePlan(plan).filter((s) => s.tag === "ALLOC");
  expect(alloc.some((s) => s.text.includes("1,000/2,000"))).toBe(true);
});

test("a partial plan warns about the shortfall", () => {
  const warn = narratePlan(plan).find((s) => s.level === "warn" && s.text.includes("1,000"));
  expect(warn).toBeDefined();
});

test("narration is pure — the same plan always produces the same seeds", () => {
  expect(narratePlan(plan)).toEqual(narratePlan(plan));
});

test("alerts are narrated with the recipient count", () => {
  const alerts = buildAlerts(plan);
  const seeds = narrateAlerts(alerts);
  expect(seeds.some((s) => s.tag === "ALERT" && s.text.includes("1,000"))).toBe(true);
});
