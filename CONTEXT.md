# DISCATRA — project context

Onboarding notes for anyone picking this repo up. Read this before changing code;
several things here are deliberate and look like bugs if you don't know why.

**What it is:** a disaster-risk command dashboard for SIH Problem Statement 26191.
A real satellite map of India with hazard zones, and a relocation planner that moves
an at-risk population to safe sites **without ever routing them through a red zone**.

---

## 1. Run it

```bash
bun install
bun run dev      # http://localhost:8080 (port set by the Lovable vite config, not vite's 5173)
bun test         # 45 tests, no config needed — bun's runner is built in
npx tsc --noEmit # must stay clean
npx eslint .     # see the "intentional lint errors" note in §7
bun run build    # outputs to .output/ (nitro), NOT dist/
```

Requires **bun** (1.3+). `npm install` will also work but the lockfile is `bun.lock`.

> ⚠️ **`npx vite preview` is broken and always has been.** Every route 500s with
> `Cannot find module .../dist/server/server.js`. The TanStack preview plugin expects
> `dist/server/`, but this project builds to `.output/` via the nitro preset. It is
> not caused by anything in the app. To check a production build, serve the static
> output directly: `python3 -m http.server -d .output/public`.

---

## 2. Stack

| | |
| --- | --- |
| Framework | TanStack Start (file-based routing) + React 19 |
| Build | Vite 8, nitro preset → `.output/` |
| Map | MapLibre GL v6 + Esri ArcGIS raster tiles (satellite / terrain) |
| Styling | Tailwind **v4** — CSS-first, **no `tailwind.config.js`**; theme lives in `@theme` blocks in `src/styles.css` |
| Components | shadcn/ui in `src/components/ui/` |
| Charts | Recharts, via the existing `components/ui/chart.tsx` wrapper |
| Routing engine | OSRM public API, with a geometric fallback |
| Tests | `bun test` — **zero dependencies**, it's built into bun |
| Font | Satoshi (variable woff2), self-hosted in `public/fonts/` |

**No PDF library, no theming library, no charting library beyond Recharts.** The
authority report prints through the browser's own dialog. Please keep it that way —
dependency additions touch `bun.lock`, which syncs to Lovable.

---

## 3. Layout on screen

```
┌──────────────┬────────────────────────────────┬──────────────────┐
│ CommandRail  │  header (search, Data, theme)  │                  │
│              ├────────────────────────────────┤  RelocationPanel │
│  Overview    │                                │  / risk list     │
│  Simulate    │        DiscatraMap             │                  │
│  ──────────  │        (MapLibre)              │  right aside     │
│  Decision    │                                │  w-80, lg:flex   │
│  log         │                                │                  │
└──────────────┴────────────────────────────────┴──────────────────┘
  resizable                                        bottom drawer
  240–640px                                        below lg
```

- `src/routes/index.tsx` — the dashboard. Owns **all** shared state. ~600 lines.
- `src/routes/data.tsx` — `/data`, historical calamity analytics.
- `src/routes/report.tsx` — `/report`, printable authority advisory.
- `src/routes/__root.tsx` — document shell, font preload, theme pre-paint script.

`src/routeTree.gen.ts` is **generated**. Never hand-edit it; run a build or `vite dev`
once after adding a route.

---

## 4. The relocation engine — the core of the project

Everything lives in `src/lib/relocation/`, in strict layers. Each layer only knows
about the ones above it:

```
types.ts / geo.ts          data models, haversine, point-to-segment distance
route-safety.ts            "may this path be shown to anyone?"   ← THE SAFETY GATE
routing/*                  pluggable provider (OSRM live, mock fallback)
allocation.ts              carrying-capacity assignment
site-discovery.ts          eligibility filtering
assembly-points.ts         where each batch departs from
relocation-service.ts      orchestration — the ONLY producer of a RelocationPlan
alerts.ts / geojson.ts     projections of a finished plan
mock/*                     demo data, swappable for an API
```

### The rule that matters

> **A relocation route must never pass through a red zone or another high-risk area.
> If the shortest route is dangerous, reject it and find the shortest safe alternative.
> Safety always outranks distance.**

This is enforced in exactly one place — `validateRouteSafety()` in `route-safety.ts` —
and `relocation-service.ts` drops any route that fails it. **No UI component makes a
safety, routing or allocation decision.** If you find yourself computing distance or
eligibility inside a `.tsx` file, stop; it belongs in `src/lib/relocation/`.

Avoidance buffers, in `route-safety.ts`:

| Level | Buffer |
| --- | --- |
| critical (red) | 10 km |
| high (orange) | 6 km |
| moderate (yellow) | 0 km |

`evacuationBlockedZones()` excludes the zone being evacuated — you can't be blocked by
the hazard you're standing in.

### How a route is found

1. Ask OSRM for the road route plus alternatives; take the shortest **safe** one.
2. If every alternative crosses a hazard, retry steered through detour waypoints at
   three increasing clearance levels.
3. If still nothing, return `null` → the site is marked `no_safe_route` and receives
   **zero** people. It still appears in the UI under "ROUTES REJECTED", which is the
   point: the system shows its work.
4. If OSRM is unreachable, fall back to a visibility-graph + Dijkstra path
   (`routing/safe-path.ts`). Any path it returns is safe by construction.

### Assembly points

Routes do **not** start at a zone's centroid. Centroids are often water, forest or
river, so a road router snaps the departure kilometres away. `mock/assembly-points.ts`
holds road-snapped muster points inside each zone, and two destinations get two
*different* departure points — which is also how a real evacuation runs.

---

## 5. The decision console (explainable AI)

`src/lib/xai/` + `src/components/ConsolePane.tsx`.

| File | Role |
| --- | --- |
| `types.ts` | `LogSeed` (content only) vs `LogEntry` (`+id +ts`) |
| `event-log.ts` | Ring buffer, 300 entries, `useSyncExternalStore`-shaped |
| `narrate.ts` | **Pure.** Domain object → log lines |
| `ambient.ts` | Background telemetry filler |

**The rule that keeps it credible:** `narrate.ts` is pure and read-only. It reads the
`RelocationPlan` the engine already built and describes it, so the site counts,
rejected route names and allocation arithmetic on screen are the *real* values.
It narrates; it never decides.

`ambient.ts` is confined to observation tags (`SAT`, `SYS`, `RISK`) and can never emit
`ROUTE`, `ALLOC` or `ALERT` — a test enforces this. Nothing a viewer reads as a
decision was invented by the filler.

Wiring lives in `index.tsx` and hangs off state transitions that already existed
(zone selected, plan built, alerts sent). Don't add new control flow for logging.

---

## 6. Seeded data

All demo data. Real place names, invented numbers. Swap any of these for an API
response of the same shape and nothing else changes.

| File | Contents |
| --- | --- |
| `src/lib/hazard-observations.ts` | **16 zones** — 2 red + 2 orange per calamity |
| `src/lib/relocation/mock/safe-sites.ts` | **64 relief sites** |
| `src/lib/relocation/mock/assembly-points.ts` | Road-snapped muster points per zone |
| `src/lib/historical/mock/events.ts` | **39 historical events** for `/data` |

Four calamity types: `landslide`, `flood`, `cloudburst`, `coastal_erosion`.

### The demo scenario

Select **Joshimath subsidence belt** → FIND SAFE SITES:

```
2,000 at risk  →  1,000 Auli Ridge + 1,000 Tapovan Valley  =  2,000/2,000 READY
                  2 routes REJECTED (Nandprayag, Guptkashi)
```

Both halves of the spec at once: full placement **and** a genuine safety rejection.
The rejections are real geography — the Chamoli high-intensity-rain zone sits on the
southern NH-7 corridor, so those routes cannot be offered.

Other useful demos: `Kedarnath valley cloudburst` shows a capacity shortfall
(680/2,600, "authority intervention required"); `Ghoramara island loss` shows the
assembly-point behaviour on an island whose road network is disconnected in OSM.

### Helpline numbers

Every site publishes a helpline on the `1800-000-NNNN` exchange. That exchange is
**not allocatable**, deliberately: demo data must never contain a number that dials a
real district emergency line. A test enforces the pattern — don't weaken it.

---

## 7. Conventions that will bite you

**① Tabular data modules are never prettier-formatted.**
`hazard-observations.ts`, `mock/safe-sites.ts`, `mock/assembly-points.ts` and
`historical/mock/events.ts` are written **one record per line** on purpose — they read
like a table and diff cleanly. `eslint .` reports long-line errors on them and **those
errors are intentional**. Never run `prettier --write` or `eslint --fix` on these four
files. If a diff on one of them suddenly grows by hundreds of lines, prettier ran;
`git checkout` it and redo the edit.

**② Never force-push, rebase, amend or squash anything already pushed.**
The repo is Lovable-connected; rewriting published history destroys the project
history on Lovable's side. To undo something, `git revert` it forward.

**③ Commit with the identity git is already configured with.**
Plain `git commit`. Do not pass `-c user.email=...`. Vercel blocks deployments whose
commit author lacks project access, and this has already cost us one blocked deploy.

**④ TypeScript is strict**, including `noUncheckedIndexedAccess` (indexed access is
`T | undefined`), `exactOptionalPropertyTypes` (optional props need `?: T | undefined`)
and `noPropertyAccessFromIndexSignature` (use `obj["key"]`).

**⑤ MapLibre owns its own DOM.** Popups are built in `components/map-popups.ts` with
plain DOM, not React, because MapLibre appends them itself. `maplibre-gl.css` sets a
`font:` **shorthand** on `.maplibregl-map`, which resets the family for that whole
subtree — hence the `html .maplibregl-map { font-family: ... }` override in
`styles.css`. Remove it and every popup silently reverts to Helvetica.

---

## 8. Tests

`bun test` — 45 tests, all on pure logic. No test framework is installed; bun has one
built in. `src/types/bun-test.d.ts` declares the module so `tsc` accepts test files
without adding `@types/bun` to the lockfile.

Covered: the log store, narration purity, ambient-tag confinement, historical
aggregation, report reference numbers, helpline format, risk-layer shape.

**Not covered by unit tests:** map rendering, routing against live OSRM, print layout.
Those are verified by driving headless Chrome over CDP. If you do that, launch with
`--enable-unsafe-swiftshader` — without it there is no WebGL2, MapLibre throws
`GPUInitializationError`, and the whole React tree drops into the error boundary.

To check routing end to end, write a script that loops `RISK_ZONES` calling
`buildRelocationPlan` and assert **`unsafe === 0`** on every zone. That is the
invariant the whole project rests on.

---

## 9. Known gaps

- **`vite preview` is broken** (see §1). Pre-existing, unrelated to app code.
- **The Satoshi licence text is not bundled.** `public/fonts/LICENSE.md` records the
  source, date and licence name, but not the verbatim ITF Free Font License — Fontshare
  serves that page as a client-rendered app. Download the Satoshi zip from Fontshare
  and drop its `LICENSE.txt` into `public/fonts/` before any public release.
- **`SIMULATE` in the left rail is deliberately inert.** It ships disabled with a
  "soon" badge. It is a placeholder, not a broken feature.
- **`/report` renders nothing server-side.** It reads the plan from `sessionStorage`,
  which is client-only, so it returns `null` until mounted. That's intended.
- The right-hand panel is not resizable (only the left rail is).

---

## 10. Where to start

| I want to… | Go to |
| --- | --- |
| change what a zone looks like on the map | `components/DiscatraMap.tsx`, layers 3–7 |
| change safety rules or buffers | `lib/relocation/route-safety.ts` |
| change how people are assigned to sites | `lib/relocation/allocation.ts` |
| add/edit hazard zones | `lib/hazard-observations.ts` (keep it tabular!) |
| add/edit relief sites | `lib/relocation/mock/safe-sites.ts` (keep it tabular!) |
| change console output | `lib/xai/narrate.ts` (keep it pure!) |
| change the authority PDF | `routes/report.tsx` + the `@media print` block in `styles.css` |
| change the historical page | `routes/data.tsx` + `lib/historical/queries.ts` |
| swap mock data for a real API | replace any `mock/*` module — nothing else reads it |

Design notes and the original implementation plan are in `docs/superpowers/`.
