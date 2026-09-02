import { useEffect, useRef, useSyncExternalStore } from "react";
import { Terminal } from "lucide-react";
import { startAmbient } from "@/lib/xai/ambient";
import { emit, snapshot, subscribe } from "@/lib/xai/event-log";
import { narrateBoot } from "@/lib/xai/narrate";
import type { LogEntry, LogLevel } from "@/lib/xai/types";

/**
 * The explainable-AI console.
 *
 * Reads the log store through useSyncExternalStore rather than React state:
 * lines are emitted from event handlers, effects and a background timer, and
 * routing all of those through context would re-render the dashboard per line.
 *
 * This component only renders. It never decides what to log.
 */

const EMPTY: readonly LogEntry[] = [];

/*
 * Severity is carried by the tag chip, which frees the message itself to sit at
 * near-full foreground contrast. The previous version tinted the message text
 * instead, which meant every routine `info` line rendered in muted grey — the
 * bulk of the log, and the part that was hardest to read.
 */
const LEVEL_TAG: Record<LogLevel, string> = {
  info: "bg-muted text-muted-foreground",
  ok: "bg-[#16a34a]/15 text-[#15803d] dark:bg-[#4ade80]/15 dark:text-[#4ade80]",
  warn: "bg-[#ff8a1f]/20 text-[#a85400] dark:bg-[#ffb066]/15 dark:text-[#ffb066]",
  error: "bg-destructive/15 text-destructive",
};

const LEVEL_TEXT: Record<LogLevel, string> = {
  info: "text-foreground/90",
  ok: "text-foreground",
  warn: "text-[#8a4500] dark:text-[#ffc48f]",
  error: "font-medium text-destructive",
};

const clock = (ts: number) => new Date(ts).toLocaleTimeString("en-GB", { hour12: false }) as string;

export default function ConsolePane({ className = "" }: { className?: string }) {
  const entries = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const tailRef = useRef<HTMLDivElement>(null);
  const bootedRef = useRef(false);

  /*
   * Boot banner + ambient feed, started once per mount. The banner guard is a
   * ref rather than state: React 19 StrictMode tears the effect down and runs
   * it again on mount, and a state guard in the dependency array would stop the
   * ambient timer it had just started.
   */
  useEffect(() => {
    if (!bootedRef.current) {
      bootedRef.current = true;
      emit(narrateBoot());
    }
    return startAmbient();
  }, []);

  // Stick to the tail as lines arrive.
  useEffect(() => {
    tailRef.current?.scrollIntoView({ block: "end" });
  }, [entries]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
        <Terminal className="size-3.5 text-muted-foreground" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          Decision log
        </p>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-[#16a34a]" />
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Live</span>
        </span>
      </div>

      {/*
       * Set in the app typeface, not `font-mono`. Only the clock needs columnar
       * alignment and `tabular-nums` gives it that, so the monospace face was
       * buying nothing while costing roughly a third of the characters per line
       * at this width.
       *
       * The detail line is nested inside the message column rather than pushed
       * across by a hand-computed margin: the old `ml-[calc(3.5rem+0.375rem)]`
       * only lined up while the timestamp was monospace.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1 text-[11px] leading-[1.45]">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-2 border-t border-border/40 py-1.5 first:border-t-0"
          >
            <span className="w-[3.15rem] shrink-0 pt-px text-[10px] tabular-nums text-muted-foreground">
              {clock(entry.ts)}
            </span>
            <span
              className={`h-fit w-[3.1rem] shrink-0 rounded px-1 py-px text-center text-[9px] font-bold tracking-wide ${LEVEL_TAG[entry.level]}`}
            >
              {entry.tag}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`break-words ${LEVEL_TEXT[entry.level]}`}>{entry.text}</p>
              {entry.detail && (
                <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                  {entry.detail}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={tailRef} />
      </div>
    </div>
  );
}
