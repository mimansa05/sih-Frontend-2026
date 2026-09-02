import { expect, test } from "bun:test";
import { MOCK_SAFE_SITES } from "./safe-sites";

test("every safe site publishes a helpline", () => {
  const missing = MOCK_SAFE_SITES.filter((s) => !s.helpline);
  expect(missing.map((s) => s.id)).toEqual([]);
});

test("helplines use the non-allocatable 1800-000 exchange", () => {
  // Demo data must never carry a number that dials a real emergency line.
  const bad = MOCK_SAFE_SITES.filter((s) => !/^1800-000-\d{4}$/.test(s.helpline));
  expect(bad.map((s) => s.helpline)).toEqual([]);
});

test("helplines are distinct per site", () => {
  expect(new Set(MOCK_SAFE_SITES.map((s) => s.helpline)).size).toBe(MOCK_SAFE_SITES.length);
});
