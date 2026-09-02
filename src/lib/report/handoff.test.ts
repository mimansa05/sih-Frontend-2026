import { expect, test } from "bun:test";
import { buildReference } from "./handoff";

test("a reference number encodes the zone and the issue time", () => {
  const ref = buildReference("ls-uk-chm", new Date("2026-09-01T14:22:00Z"));
  expect(ref).toContain("LS-UK-CHM");
  expect(ref).toMatch(/^DSC\/REL\/LS-UK-CHM\/\d{8}-\d{4}$/);
});

test("references are stable for the same zone and instant", () => {
  const at = new Date("2026-09-01T14:22:00Z");
  expect(buildReference("fl-as-dbr", at)).toBe(buildReference("fl-as-dbr", at));
});

test("different zones get different references", () => {
  const at = new Date("2026-09-01T14:22:00Z");
  expect(buildReference("fl-as-dbr", at)).not.toBe(buildReference("ls-uk-chm", at));
});
