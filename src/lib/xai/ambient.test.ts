import { expect, test } from "bun:test";
import { ambientSeed } from "./ambient";

test("ambient lines are telemetry, never decisions", () => {
  const decisionTags = ["ROUTE", "ALLOC", "ALERT"];
  for (let i = 0; i < 200; i++) {
    expect(decisionTags).not.toContain(ambientSeed().tag);
  }
});

test("ambient lines are never error level", () => {
  for (let i = 0; i < 200; i++) {
    expect(ambientSeed().level).not.toBe("error");
  }
});

test("a seeded random picks deterministically", () => {
  const always = () => 0;
  expect(ambientSeed(always)).toEqual(ambientSeed(always));
});

test("varying the random source varies the line", () => {
  const texts = new Set<string>();
  for (let i = 0; i < 40; i++) texts.add(ambientSeed().text);
  expect(texts.size).toBeGreaterThan(1);
});
