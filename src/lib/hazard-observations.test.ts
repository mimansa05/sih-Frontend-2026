import { expect, test } from "bun:test";
import { HAZARD_OBSERVATIONS } from "./hazard-observations";

const byLevel = (level: string) => HAZARD_OBSERVATIONS.filter((z) => z.level === level);

test("the risk layer is eleven red zones and ten orange", () => {
  expect(HAZARD_OBSERVATIONS.length).toBe(21);
  expect(byLevel("critical").length).toBe(11);
  expect(byLevel("high").length).toBe(10);
});

test("no lower-priority zones are seeded", () => {
  expect(byLevel("moderate")).toEqual([]);
});

test("at least two red and two orange zones per calamity", () => {
  for (const type of ["landslide", "flood", "cloudburst", "coastal_erosion"]) {
    const forType = HAZARD_OBSERVATIONS.filter((z) => z.type === type);
    expect(forType.filter((z) => z.level === "critical").length).toBeGreaterThan(1);
    expect(forType.filter((z) => z.level === "high").length).toBeGreaterThan(1);
  }
});

test("the Joshimath demo zone survives with its population intact", () => {
  const joshimath = HAZARD_OBSERVATIONS.find((z) => z.id === "ls-uk-chm");
  expect(joshimath?.populationAtRisk).toBe(2000);
});

test("Rudraprayag is retained so it can block the Joshimath road corridor", () => {
  expect(HAZARD_OBSERVATIONS.some((z) => z.id === "ls-uk-rud")).toBe(true);
});

test("every zone carries a positive population at risk", () => {
  expect(HAZARD_OBSERVATIONS.every((z) => z.populationAtRisk > 0)).toBe(true);
});

test("zone ids are unique", () => {
  expect(new Set(HAZARD_OBSERVATIONS.map((z) => z.id)).size).toBe(HAZARD_OBSERVATIONS.length);
});
