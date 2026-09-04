import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutDashboard, Play } from "lucide-react";
import ConsolePane from "@/components/ConsolePane";

/**
 * Left command rail: identity, a single Overview destination, an inert
 * SIMULATE control, and the decision console filling the rest of the height.
 *
 * The rail is drag-resizable from its right edge. It is sized in pixels rather
 * than as a percentage of the viewport because the console's readability
 * depends on how many characters fit on a line, which is an absolute quantity —
 * a percentage would re-wrap the log every time the window changed.
 *
 * `react-resizable-panels` is in the dependency tree but only via the unused
 * shadcn wrapper; adopting it here would mean restructuring the map and the
 * right-hand panel into a PanelGroup with percentage sizing, which is both
 * invasive and the wrong unit for this.
 *
 * The map needs no wiring for this: DiscatraMap already runs its own
 * ResizeObserver and calls map.resize() when its container changes.
 */

const MIN_WIDTH = 240;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 320;
const KEYBOARD_STEP = 16;
const STORAGE_KEY = "discatra-rail-width";

const clampWidth = (px: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(px)));

export default function CommandRail() {
  /*
   * Always DEFAULT_WIDTH on the server and on the first client render, so the
   * markup React hydrates matches what was sent. The stored width is applied in
   * the effect below.
   */
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(stored) && stored > 0) setWidth(clampWidth(stored));
    } catch {
      // Blocked storage — the default width is a fine fallback.
    }
  }, []);

  // Persist once a gesture settles rather than on every pointer frame.
  useEffect(() => {
    if (dragging) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      // Not persisting is survivable; the rail still resizes for this session.
    }
  }, [dragging, width]);

  /*
   * While dragging, suppress selection and pin the resize cursor document-wide.
   * Pointer capture keeps the events coming to the handle, but without this the
   * pointer still paints a text selection across whatever it passes over.
   */
  useEffect(() => {
    if (!dragging) return;
    const { body } = document;
    const previousSelect = body.style.userSelect;
    const previousCursor = body.style.cursor;
    body.style.userSelect = "none";
    body.style.cursor = "col-resize";
    return () => {
      body.style.userSelect = previousSelect;
      body.style.cursor = previousCursor;
    };
  }, [dragging]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragStart.current = { x: e.clientX, width };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    },
    [width],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;
    setWidth(clampWidth(start.width + (e.clientX - start.x)));
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    dragStart.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setWidth((w) => clampWidth(w - KEYBOARD_STEP));
    else if (e.key === "ArrowRight") setWidth((w) => clampWidth(w + KEYBOARD_STEP));
    else if (e.key === "Home") setWidth(DEFAULT_WIDTH);
    else return;
    e.preventDefault();
  }, []);

  return (
    <aside
      style={{ width }}
      className="relative hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex"
    >
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
        <img
          src="/logo.png"
          alt="Rescue Rasgulla"
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide">RESCUE RASGULLA</p>
          <p className="truncate text-[11px] text-muted-foreground">GIS Risk Command</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        <button className="flex items-center gap-2 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
          <LayoutDashboard className="size-4 shrink-0" />
          Overview
        </button>

        <button
          type="button"
          disabled
          title="Scenario simulation is not implemented yet"
          className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
        >
          <Play className="size-4 shrink-0" />
          Simulate
          <span className="ml-auto shrink-0 rounded-full border border-border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide">
            Soon
          </span>
        </button>
      </nav>

      <div className="mx-3 border-t border-sidebar-border" />

      <ConsolePane className="min-h-0 flex-1" />

      {/*
       * Drag handle. Sits half outside the rail so the grab target straddles
       * the border and is a usable width, while the line the user sees stays
       * exactly on it.
       */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize command rail — drag, or use the arrow keys"
        aria-valuenow={width}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        onKeyDown={onKeyDown}
        title="Drag to resize · double-click to reset"
        className={`absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none outline-none transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-primary after:opacity-0 after:transition-opacity hover:after:opacity-60 focus-visible:after:opacity-100 ${
          dragging ? "after:opacity-100" : ""
        }`}
      />
    </aside>
  );
}
