import { expect, test } from "bun:test";
import { HAZARD_OBSERVATIONS } from "./hazard-observations";

const byLevel = (level: string) => HAZARD_OBSERVATIONS.filter((z) => z.level === level);

test("the risk layer is eight red zones and eight orange", () => {
  expect(HAZARD_OBSERVATIONS.length).toBe(16);
  expect(byLevel("critical").length).toBe(8);
  expect(byLevel("high").length).toBe(8);
});

test("no lower-priority zones are seeded", () => {
  expect(byLevel("moderate")).toEqual([]);
});

test("two red and two orange zones per calamity", () => {
  const counts = new Map<string, number>();
  for (const z of HAZARD_OBSERVATIONS) {
    const key = `${z.type}/${z.level}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const expected: Record<string, number> = {};
  for (const type of ["landslide", "flood", "cloudburst", "coastal_erosion"]) {
    expected[`${type}/critical`] = 2;
    expected[`${type}/high`] = 2;
  }
  expect(Object.fromEntries(counts)).toEqual(expected);
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
