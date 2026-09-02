import { beforeEach, expect, test } from "bun:test";
import { clearLog, emit, LOG_CAPACITY, snapshot, subscribe } from "./event-log";
import type { LogSeed } from "./types";

const seed = (text: string): LogSeed => ({ level: "info", tag: "SYS", text });

beforeEach(() => clearLog());

test("emit appends an entry with an id and a timestamp", () => {
  emit(seed("hello"));
  const [entry] = snapshot();
  expect(entry?.text).toBe("hello");
  expect(typeof entry?.id).toBe("string");
  expect(entry?.ts).toBeGreaterThan(0);
});

test("emit accepts an array and preserves order", () => {
  emit([seed("first"), seed("second")]);
  expect(snapshot().map((e) => e.text)).toEqual(["first", "second"]);
});

test("ids are unique even within one millisecond", () => {
  emit([seed("a"), seed("b"), seed("c")]);
  expect(new Set(snapshot().map((e) => e.id)).size).toBe(3);
});

test("the buffer is capped and drops the oldest entries", () => {
  for (let i = 0; i < LOG_CAPACITY + 25; i++) emit(seed(`line ${i}`));
  const entries = snapshot();
  expect(entries.length).toBe(LOG_CAPACITY);
  expect(entries[0]?.text).toBe("line 25");
});

test("snapshot is referentially stable until the next emit", () => {
  // useSyncExternalStore re-renders forever if the snapshot identity changes
  // on every call, so this property is load-bearing, not cosmetic.
  emit(seed("a"));
  const before = snapshot();
  expect(snapshot()).toBe(before);
  emit(seed("b"));
  expect(snapshot()).not.toBe(before);
});

test("subscribers are notified on emit and stop after unsubscribe", () => {
  let calls = 0;
  const unsubscribe = subscribe(() => calls++);
  emit(seed("a"));
  expect(calls).toBe(1);
  emit([seed("b"), seed("c")]);
  expect(calls).toBe(2);
  unsubscribe();
  emit(seed("d"));
  expect(calls).toBe(2);
});

test("clearLog empties the buffer", () => {
  emit(seed("a"));
  clearLog();
  expect(snapshot()).toEqual([]);
});
