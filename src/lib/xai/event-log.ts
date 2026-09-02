import type { LogEntry, LogSeed } from "./types";

/**
 * The console's log store.
 *
 * A plain external store rather than React state: log lines are emitted from
 * event handlers, effects and a background timer, and routing every one of
 * those through a context would re-render the whole dashboard on each line.
 * `subscribe` / `snapshot` are shaped for `useSyncExternalStore`, so `snapshot`
 * must return a reference that only changes when the log actually changes.
 */

/** Ring-buffer size. Enough to scroll back through a whole demo run. */
export const LOG_CAPACITY = 300;

let entries: readonly LogEntry[] = [];
let counter = 0;
const listeners = new Set<() => void>();

/** Monotonic, so two lines emitted in the same millisecond still differ. */
const nextId = () => `log-${++counter}`;

export function emit(seed: LogSeed | LogSeed[]): void {
  const seeds = Array.isArray(seed) ? seed : [seed];
  if (seeds.length === 0) return;
  const ts = Date.now();
  const next = [...entries, ...seeds.map((s) => ({ ...s, id: nextId(), ts }))];
  entries = next.length > LOG_CAPACITY ? next.slice(next.length - LOG_CAPACITY) : next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function snapshot(): readonly LogEntry[] {
  return entries;
}

export function clearLog(): void {
  entries = [];
  for (const listener of listeners) listener();
}
