import { expect, test } from "bun:test";
import { HISTORICAL_EVENTS } from "./mock/events";
import {
  ALL_STATES,
  byHazard,
  decadesIn,
  eventsPerYear,
  filterEvents,
  statesIn,
  totals,
  worstEvents,
} from "./queries";
import type { HistoricalEvent } from "./types";

const sample: HistoricalEvent[] = [
  { id: "a", year: 2011, hazard: "flood", name: "A", state: "Assam", district: "X", deaths: 10, displaced: 100, damageCr: 5 },
  { id: "b", year: 2011, hazard: "landslide", name: "B", state: "Kerala", district: "Y", deaths: 40, displaced: 200, damageCr: 7 },
  { id: "c", year: 2023, hazard: "flood", name: "C", state: "Assam", district: "Z", deaths: 20, displaced: 300, damageCr: 9 },
];

const base = { hazard: "all" as const, state: ALL_STATES, decade: null };

test("no filters returns everything", () => {
  expect(filterEvents(sample, base).length).toBe(3);
});

test("hazard filter narrows to one category", () => {
  expect(filterEvents(sample, { ...base, hazard: "flood" }).map((e) => e.id)).toEqual(["a", "c"]);
});

test("state filter narrows to one state", () => {
  expect(filterEvents(sample, { ...base, state: "Kerala" }).map((e) => e.id)).toEqual(["b"]);
});

test("decade filter covers the whole ten-year span", () => {
  expect(filterEvents(sample, { ...base, decade: 2010 }).map((e) => e.id)).toEqual(["a", "b"]);
  expect(filterEvents(sample, { ...base, decade: 2020 }).map((e) => e.id)).toEqual(["c"]);
});

test("filters combine", () => {
  expect(filterEvents(sample, { hazard: "flood", state: "Assam", decade: 2020 }).map((e) => e.id)).toEqual(["c"]);
});

test("eventsPerYear buckets and sorts ascending", () => {
  expect(eventsPerYear(sample)).toEqual([
    { year: 2011, events: 2, deaths: 50, displaced: 300 },
    { year: 2023, events: 1, deaths: 20, displaced: 300 },
  ]);
});

test("byHazard sums per category and is sorted by event count", () => {
  const buckets = byHazard(sample);
  expect(buckets[0]?.hazard).toBe("flood");
  expect(buckets[0]?.events).toBe(2);
  expect(buckets[0]?.deaths).toBe(30);
});

test("byHazard omits categories with no events", () => {
  expect(byHazard(sample).some((b) => b.hazard === "cloudburst")).toBe(false);
});

test("totals sums every column and counts distinct states", () => {
  expect(totals(sample)).toEqual({ events: 3, deaths: 70, displaced: 600, damageCr: 21, states: 2 });
});

test("totals of an empty list is all zeroes", () => {
  expect(totals([])).toEqual({ events: 0, deaths: 0, displaced: 0, damageCr: 0, states: 0 });
});

test("worstEvents ranks by deaths and honours the limit", () => {
  expect(worstEvents(sample, 2).map((e) => e.id)).toEqual(["b", "c"]);
});

test("decadesIn returns sorted distinct decades", () => {
  expect(decadesIn(sample)).toEqual([2010, 2020]);
});

test("statesIn returns sorted distinct states", () => {
  expect(statesIn(sample)).toEqual(["Assam", "Kerala"]);
});

test("the seeded catalogue is non-trivial and internally consistent", () => {
  expect(HISTORICAL_EVENTS.length).toBeGreaterThan(30);
  expect(new Set(HISTORICAL_EVENTS.map((e) => e.id)).size).toBe(HISTORICAL_EVENTS.length);
  expect(HISTORICAL_EVENTS.every((e) => e.year >= 1990 && e.year <= 2025)).toBe(true);
  expect(HISTORICAL_EVENTS.every((e) => e.deaths >= 0 && e.displaced >= 0)).toBe(true);
  expect(byHazard(HISTORICAL_EVENTS).length).toBe(4);
});
