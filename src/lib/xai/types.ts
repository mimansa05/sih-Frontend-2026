/**
 * Explainable-AI console log types.
 *
 * A `LogSeed` is what narration produces: pure content, no identity and no
 * clock. `emit()` stamps an id and a timestamp to make it a `LogEntry`. Keeping
 * those apart is what lets narration be a pure function and be tested without
 * freezing time.
 */

export type LogLevel = "info" | "ok" | "warn" | "error";

/** Subsystem the line came from. Rendered as a fixed-width gutter. */
export type LogTag = "SAT" | "RISK" | "POP" | "SITE" | "ROUTE" | "ALLOC" | "ALERT" | "SYS";

export interface LogSeed {
  level: LogLevel;
  tag: LogTag;
  text: string;
  /** Secondary line, dimmed under the main text. */
  detail?: string | undefined;
}

export interface LogEntry extends LogSeed {
  id: string;
  /** Epoch milliseconds. */
  ts: number;
}
