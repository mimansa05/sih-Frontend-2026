# Discatra — command console, historical data and authority reporting

Design for seven additions to the existing Discatra dashboard (SIH PS 26191).

The existing risk map, state search, hazard filter, heatmap, relocation planner,
safe-route validator and alert system are **not** rebuilt. Every item below is
either additive or a deliberate reduction of seeded data. No relocation,
routing, allocation or map behaviour changes.

## Goals

1. Reduce the risk layer to a small, legible set of red zones.
2. Give the left pane a single purpose: an explainable-AI console.
3. Explain what the system is doing, in real time, from real domain events.
4. Add a historical-calamity analytics page.
5. Put a helpline on every relief centre.
6. Produce a formal, printable authority report for a relocation plan.
7. Add a dark/light theme toggle.

## Non-goals

- No change to `route-safety.ts`, `safe-path.ts`, `osrm-routing-service.ts`,
  `allocation.ts` or `relocation-service.ts`. The console reports on these; it
  never influences them.
- The `SIMULATE` control is deliberately inert. It ships disabled.
- No new charting, PDF or theming dependency. HeroUI Pro is a paid React kit and
  is not installable here; the repo already carries `components/ui/chart.tsx`
  (the shadcn Recharts wrapper) and `components/ui/table.tsx`, which the data
  page uses instead.

---

## 1. Risk layer reduction

`src/lib/hazard-observations.ts` goes from 60 records to 8. All 8 are `critical`.
No `high` records, no `moderate` records.

| Calamity | Zone | id | Pop. at risk |
| --- | --- | --- | --- |
| Landslide | Joshimath subsidence belt | `ls-uk-chm` | 2,000 |
| Landslide | Rudraprayag landslide zone | `ls-uk-rud` | 2,100 |
| Flood | Dibrugarh Brahmaputra flood | `fl-as-dbr` | 4,200 |
| Flood | Darbhanga Kosi flood | `fl-br-drb` | 4,500 |
| Cloudburst | Kedarnath valley cloudburst | `cb-uk-ked` | 2,600 |
| Cloudburst | Kullu Beas cloudburst | `cb-hp-kul` | 2,300 |
| Coastal erosion | Satabhaya shoreline retreat | `ce-od-sat` | 3,000 |
| Coastal erosion | Ghoramara island loss | `ce-wb-gho` | 2,500 |

All eight already exist in the catalogue at `critical`; this is a deletion, not
an authoring exercise. Records keep their exact current field values, including
`populationAtRisk`, and the file keeps its one-record-per-line tabular format
(pre-existing prettier violations in this module are intentional).

### Why these eight

The selection is constrained, not arbitrary. Removing every `high` zone removes
the 6 km avoidance buffers that were doing most of the work of making routes
unsafe. With eight reds scattered across India, nothing would be near enough to
anything else to block it, every route would be trivially safe, and the spec's
stated most important rule — *never route through a red zone* — would have
nothing left to demonstrate.

Red zones still block each other at a 10 km buffer (`BLOCK_RADIUS_KM.critical`),
so the landslide pair is chosen to sit on one road corridor: Joshimath and
Rudraprayag are both on NH-7 along the Alaknanda, Rudraprayag directly south.
Every southbound route out of Joshimath must pass it. The rejection is real
geography rather than a rigged demo.

### Consequences to verify, not assume

- `ls-uk-chm` must still reach **2,000 / 2,000 placed** across two sites — the
  scenario the original spec names explicitly.
- At least one route must still be **rejected** for intersecting a red zone.
- `evacuationBlockedZones()` excludes the zone being evacuated, so Joshimath is
  not blocked by itself; Rudraprayag is 58 km away and blocks the road, not the
  origin.
- Removing `moderate` records cannot affect routing: `BLOCK_RADIUS_KM.moderate`
  is already `0`.

Both bullets are measured by a sweep script and the measured numbers reported.
If the trim does eliminate all rejections, that is reported as a finding rather
than papered over.

### Downstream

- `RiskLevel` keeps all three members. Narrowing the union would ripple through
  `RISK_META`, `riskGeoJSON`, `route-safety.ts` and the map paint expressions
  for no benefit, and re-adding orange zones later should stay a data edit.
- The right panel's three count tiles render only levels actually present, so
  the panel does not show two permanent zeroes.
- `mock/assembly-points.ts` and `mock/safe-sites.ts` are left intact. They are
  keyed lookup tables; unused keys cost nothing and keep the door open.

---

## 2. Theme toggle

Default **light**. Toggle switches to dark and the choice persists.

- `src/lib/theme.tsx` — `ThemeProvider` + `useTheme()`. Writes `.dark` on
  `document.documentElement`, mirrors to `localStorage` under `discatra-theme`.
- A small blocking script in `__root.tsx` applies the stored class before first
  paint, so a reload in dark mode does not flash white.
- Toggle button in the dashboard header.

No CSS work is required: `styles.css` already defines complete `:root` and
`.dark` token blocks that nothing has ever switched between.

The map basemap is raster imagery and cannot be themed either way. MapLibre
popups and controls are built from the same design tokens and will follow the
theme; they read as dashboard chrome rather than map.

---

## 3. Left pane

Extracted from `routes/index.tsx` into `src/components/CommandRail.tsx`.
`index.tsx` is already 604 lines and gains console wiring in this work.

Contents, top to bottom:

1. Existing DISCATRA / GIS Risk Command identity block, unchanged.
2. A single nav item: **Overview**, always active.
3. **SIMULATE** — disabled button with a "coming soon" badge.
4. The console, filling all remaining height.

Removed: Flood Watch, Landslides, Alerts, Authorities. The basemap-source
footnote moves out to make room for the console.

Width 256px → 320px (`w-64` → `w-80`) so log lines stop wrapping mid-token. The
`md:flex` breakpoint behaviour is unchanged.

---

## 4. Explainable-AI console

New `src/lib/xai/`:

| Module | Responsibility |
| --- | --- |
| `types.ts` | `LogEntry { id, ts, level, tag, text, detail? }` |
| `event-log.ts` | Pub/sub ring buffer, 300 entries. `emit`, `subscribe`, `clear` |
| `narrate.ts` | Pure functions: domain object → `LogEntry[]` |
| `ambient.ts` | Jittered background telemetry between real events |

`src/components/ConsolePane.tsx` renders the stream: monospace, colour-coded by
level, timestamped, auto-scrolled to tail, with a per-character reveal on the
newest line. The reveal is skipped under `prefers-reduced-motion`.

Tags: `SAT`, `RISK`, `POP`, `SITE`, `ROUTE`, `ALLOC`, `ALERT`, `SYS`.

### The design constraint that makes it credible

`narrate.ts` is **pure and read-only**. It takes the `RelocationPlan` the app
already built and describes it. The site counts, the rejected route names, the
intersection distances and the allocation arithmetic are the real values from
the real pipeline, so the console is genuinely explainable rather than
decorative. It narrates; it never decides.

Wiring happens at the points `index.tsx` already changes state — zone selected,
plan built, alerts dispatched — so no new control flow is introduced.

Ambient lines (satellite pass ingested, sensor poll, tile refresh) are clearly
telemetry and carry no decision content. They exist so the pane is never dead
between clicks.

Illustrative output:

```
14:22:07  SAT   Sentinel-1A pass ingested · tile 43R/UK · 12m GSD
14:22:07  RISK  Joshimath subsidence belt → CRITICAL (score 100/100)
14:22:08  POP   populationAtRisk = 2,000 (hazard footprint)
14:22:08  SITE  8 candidates screened · 6 rejected on capacity/safety
14:22:09  ROUTE REJECTED  Srinagar Garhwal — crosses Rudraprayag red zone at 4.2 km
14:22:09  ROUTE SAFE      Tapovan Valley Shelter — 19.8 km · 40 min · 0 intersections
14:22:10  ALLOC 1,000 → Tapovan · 1,000 → Auli · 2,000/2,000 placed
14:22:11  ALERT 2 batches dispatched · 2,000 recipients
```

---

## 5. Relief-centre helpline

`helpline: string` added to `SafeSite` in `lib/relocation/types.ts` and populated
across `mock/safe-sites.ts`, preserving that file's one-record-per-line format.

Surfaced in:
- `map-popups.ts` → `safeSitePopup`
- `RelocationPanel.tsx` site rows
- the authority report allocation table

Sites currently open their popup on **click** while risk zones open on hover.
Hover is added to sites to match, and click is kept.

Numbers are plausible in format but deliberately non-routable, and the module
header records them as demo data. Real district disaster helplines are not put
into a mock file where someone might dial one.

`geojson.ts` carries the field through to the map feature properties, and
`SiteFeatureProps` in `map-popups.ts` gains the matching key.

---

## 6. Historical calamity page

Route `/data`, reached from a **Data** button in the dashboard header. The
button is in the header rather than the left pane because the left pane is
reserved for Overview, SIMULATE and the console.

`src/lib/historical/`:
- `types.ts` — `HistoricalEvent { id, year, hazard, name, state, district, deaths, displaced, damageCr }`
- `mock/events.ts` — seeded events in the same tabular one-record-per-line style
  as the other catalogues
- `queries.ts` — pure aggregation helpers (by year, by hazard, totals, filtering)

Page layout: KPI tiles → events-per-year trend → hazard breakdown → filterable
worst-events table. Filters for hazard, state and decade. `hazard` reuses the
existing `ObservedHazardType` union so the page and the map speak the same
vocabulary.

Built on `components/ui/chart.tsx` and `components/ui/table.tsx`. A banner marks
the dataset as illustrative and not an official record.

---

## 7. Authority report

Route `/report`. A formal document intended to be printed or saved as PDF via
the browser's own print dialog — no PDF dependency, correct Satoshi rendering,
selectable text.

The plan is handed over through `sessionStorage` (`discatra-report`) rather than
recomputed, so a refresh or a new tab still renders and no second round of
network routing is triggered.

Document structure:

- Reference number and issue timestamp
- Issuing authority and addressee blocks
- Subject line
- Zone particulars: name, district, state, hazard, level, population at risk
- Allocation table: site, type, district, allocated headcount, capacity after
  intake, helpline, road distance, estimated travel time
- An explicit route-safety statement naming the validator
- Rejected-routes annexure with the reason each was refused
- Signature block

`@media print` rules strip navigation and chrome, set A4 margins and prevent
page breaks inside table rows. The trigger is a "Download authority report"
button in `RelocationPanel.tsx` calling `window.print()` on the report route.

---

## Files

**New:** `lib/theme.tsx`, `lib/xai/{types,event-log,narrate,ambient}.ts`,
`lib/historical/{types,queries}.ts`, `lib/historical/mock/events.ts`,
`components/CommandRail.tsx`, `components/ConsolePane.tsx`,
`components/ThemeToggle.tsx`, `routes/data.tsx`, `routes/report.tsx`.

**Modified:** `hazard-observations.ts` (60 → 8 records), `routes/index.tsx`
(rail extracted, console wired, Data button, theme toggle),
`routes/__root.tsx` (theme pre-paint script, ThemeProvider),
`lib/relocation/types.ts` + `mock/safe-sites.ts` + `geojson.ts` +
`map-popups.ts` (helpline), `RelocationPanel.tsx` (helpline, report button),
`styles.css` (print rules).

**Untouched:** every routing, safety, allocation and map-rendering module.

## Verification

1. `npx tsc --noEmit`, `npx eslint` on changed files, `npx vite build`.
2. A sweep script over the reduced risk layer reporting, with real numbers:
   Joshimath placement (expect 2,000 / 2,000 across two sites), the count of
   rejected routes (expect at least one), and zero unsafe routes leaking through
   `validateRouteSafety`.
3. Headless Chrome over CDP asserting computed state, not source: theme toggle
   adds `.dark` and survives reload; the console contains a real `ROUTE
   REJECTED` line naming a real zone; `/data` renders chart SVG nodes and table
   rows; `/report` renders with print styles applied; the site popup shows a
   helpline; the map still loads and the existing relocation flow still runs.

## Risks

- **The rejection demo.** Mitigated by the Joshimath/Rudraprayag corridor and
  measured in verification step 2. Reported honestly if it does not hold.
- **`index.tsx` growth.** Mitigated by extracting `CommandRail` and
  `ConsolePane` rather than inlining them.
- **`sessionStorage` handoff.** Absent or stale data must render an explicit
  "no plan selected" state on `/report`, never a half-filled document.
- **Console credibility.** Kept by making `narrate.ts` pure and read-only. Any
  drift toward the console computing its own numbers would make it theatre.
