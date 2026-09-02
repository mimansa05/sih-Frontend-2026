import { emit } from "./event-log";
import type { LogSeed } from "./types";

/**
 * Background telemetry.
 *
 * The console must not sit dead between operator actions, so these lines fill
 * the gaps. They are deliberately confined to observation and housekeeping
 * tags — never ROUTE, ALLOC or ALERT — so that nothing a person reads as a
 * decision was invented here. Every decision line comes from `narrate.ts`,
 * which reads the real plan.
 */

const pick = <T>(items: readonly T[], rand: () => number): T =>
  items[Math.floor(rand() * items.length)] ?? items[0]!;

const SATELLITES = ["Sentinel-1A", "Sentinel-2B", "RISAT-2B", "Cartosat-3", "EOS-04"] as const;
const TILES = ["43R/UK", "45Q/AS", "45R/BR", "45Q/OD", "45Q/WB", "43S/HP"] as const;

const LINES: readonly ((rand: () => number) => LogSeed)[] = [
  (r) => ({
    level: "info",
    tag: "SAT",
    text: `${pick(SATELLITES, r)} pass ingested · tile ${pick(TILES, r)}`,
    detail: `${8 + Math.floor(r() * 8)} m GSD · cloud cover ${Math.floor(r() * 30)}%`,
  }),
  (r) => ({
    level: "info",
    tag: "SAT",
    text: `InSAR coherence recomputed · ${(0.6 + r() * 0.35).toFixed(2)}`,
    detail: "Ground-deformation baseline updated",
  }),
  (r) => ({
    level: "info",
    tag: "SYS",
    text: `Rain-gauge poll · ${Math.floor(40 + r() * 160)} stations reporting`,
  }),
  (r) => ({
    level: "info",
    tag: "SYS",
    text: `River-stage telemetry · ${Math.floor(12 + r() * 40)} gauges nominal`,
  }),
  (r) => ({
    level: "info",
    tag: "RISK",
    text: `Risk index refresh · ${Math.floor(r() * 4) + 5} zones re-scored`,
    detail: "No level transitions this cycle",
  }),
  (r) => ({
    level: "warn",
    tag: "SYS",
    text: `Basemap tile latency ${Math.floor(120 + r() * 400)} ms`,
    detail: "Esri ArcGIS raster service",
  }),
  () => ({ level: "info", tag: "SYS", text: "Safe-site register synchronised" }),
];

/** One plausible telemetry line. `rand` is injectable so tests are deterministic. */
export function ambientSeed(rand: () => number = Math.random): LogSeed {
  return pick(LINES, rand)(rand);
}

/**
 * Emit ambient lines on a jittered interval. Returns a stop function.
 *
 * Jittered rather than fixed-period: a metronome reads as a screensaver, an
 * irregular cadence reads as a live feed.
 */
export function startAmbient({ minMs = 3500, maxMs = 9000 } = {}): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    emit(ambientSeed());
    timer = setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
  };

  timer = setTimeout(tick, minMs);

  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
