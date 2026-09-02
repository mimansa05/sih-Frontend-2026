import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Cross,
  Layers,
  Map as MapIcon,
  Mountain,
  PanelRightOpen,
  Radar,
  Satellite,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  HAZARD_META,
  INDIAN_STATES,
  RISK_META,
  RISK_ZONES,
  zonesForHazard,
  type HazardType,
  type RiskLevel,
  type RiskZone,
} from "@/lib/discatra-data";
import {
  buildAlerts,
  buildRelocationPlan,
  findNearestSafePlace,
  planDestinations,
  routeFeatureId,
  SAFE_SITES,
  summariseRiskArea,
  type NearestSafePlace,
  type PlanSite,
  type RelocationAlert,
  type RelocationPlan,
} from "@/lib/relocation";
import type { Basemap } from "@/components/DiscatraMap";
import CommandRail from "@/components/CommandRail";
import HazardSelector from "@/components/HazardSelector";
import ThemeToggle from "@/components/ThemeToggle";
import { emit } from "@/lib/xai/event-log";
import {
  narrateAlerts,
  narratePlan,
  narratePlanStart,
  narrateZoneSelected,
} from "@/lib/xai/narrate";
import { stashReport } from "@/lib/report/handoff";
import RelocationPanel from "@/components/RelocationPanel";
import CitizenAlertView from "@/components/CitizenAlertView";

const DiscatraMap = lazy(() => import("@/components/DiscatraMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DISCATRA GIS — Live Disaster Risk Command Map of India" },
      {
        name: "description",
        content:
          "DISCATRA disaster-risk dashboard: real satellite and terrain basemap of India with live hazard heatmaps, red/orange/yellow risk zones, district-level drilldown and safe-route relocation planning.",
      },
      { property: "og:title", content: "DISCATRA GIS — Disaster Risk Command Map" },
      {
        property: "og:description",
        content:
          "Real satellite/terrain basemap with DISCATRA hazard heatmaps, district-level risk zones and safe relocation routing across India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const LEVEL_ORDER: RiskLevel[] = ["critical", "high", "moderate"];

function MapSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-muted">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Radar className="size-4 animate-spin" /> Loading satellite tiles…
      </div>
    </div>
  );
}

/** Frame the affected area and every destination it routes to. */
function planTarget(zone: RiskZone, plan: RelocationPlan) {
  const reachable = plan.sites.filter((s) => s.route);
  const lngs = [zone.lng, ...reachable.map((s) => s.site.lng)];
  const lats = [zone.lat, ...reachable.map((s) => s.site.lat)];
  const span = Math.max(
    Math.max(...lngs) - Math.min(...lngs),
    Math.max(...lats) - Math.min(...lats),
  );
  const zoom = span > 1.2 ? 7.6 : span > 0.6 ? 8.4 : span > 0.3 ? 9.2 : span > 0.12 ? 10.2 : 11;
  return {
    lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
    lat: (Math.max(...lats) + Math.min(...lats)) / 2,
    zoom,
    key: Date.now(),
  };
}

/**
 * True only while the `lg` side panel is hidden — i.e. while the bottom sheet
 * really is the relocation panel. Mirrors the `lg:hidden` on the drawer trigger
 * so the sheet can never open over a screen that already shows the panel.
 */
function useCompactPanel() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setCompact(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return compact;
}

function Dashboard() {
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [showRisk, setShowRisk] = useState(true);
  const [showHospitals, setShowHospitals] = useState(false);
  const [hazard, setHazard] = useState<HazardType>("all");
  const [query, setQuery] = useState("");
  const [activeState, setActiveState] = useState<string | null>(null);
  const [selected, setSelected] = useState<RiskZone | null>(null);
  const [target, setTarget] = useState<{
    lng: number;
    lat: number;
    zoom: number;
    key: number;
  } | null>(null);

  /*
   * Relocation state is stored against the zone it belongs to and read back
   * through a derivation, so switching zones can never leave a stale plan,
   * alert or route focus on screen — and an in-flight plan can never be wiped
   * by a re-render race.
   */
  const [planState, setPlanState] = useState<{ zoneId: string; plan: RelocationPlan } | null>(null);
  const [planning, setPlanning] = useState(false);
  const [nearestState, setNearestState] = useState<{
    zoneId: string;
    nearest: NearestSafePlace | null;
  } | null>(null);
  const [alertState, setAlertState] = useState<{
    zoneId: string;
    alerts: RelocationAlert[];
  } | null>(null);
  const [citizenState, setCitizenState] = useState<RelocationAlert | null>(null);
  const [focusState, setFocusState] = useState<{ zoneId: string; routeId: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const compactPanel = useCompactPanel();
  const navigate = useNavigate();

  // Widening past `lg` brings the side panel back, so the sheet must go.
  useEffect(() => {
    if (!compactPanel) setPanelOpen(false);
  }, [compactPanel]);

  const plan = selected && planState?.zoneId === selected.id ? planState.plan : null;
  const nearest = selected && nearestState?.zoneId === selected.id ? nearestState.nearest : null;
  const alerts = selected && alertState?.zoneId === selected.id ? alertState.alerts : [];
  const citizen = selected && citizenState?.zoneId === selected.id ? citizenState : null;
  const focusRouteId = selected && focusState?.zoneId === selected.id ? focusState.routeId : null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INDIAN_STATES.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const zones = useMemo(
    () =>
      zonesForHazard(hazard)
        .filter((z) => !activeState || z.state === activeState)
        .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)),
    [hazard, activeState],
  );

  /** Hazard-only count for the map control (ignores the state filter). */
  const hazardCount = useMemo(() => zonesForHazard(hazard).length, [hazard]);

  /*
   * Only levels actually present in the layer get a tile. The seeded catalogue
   * is red-only today, so rendering all three would show two permanent zeroes.
   */
  const counts = useMemo(
    () =>
      LEVEL_ORDER.map((level) => ({
        level,
        n: zones.filter((z) => z.level === level).length,
      })).filter((c) => c.n > 0),
    [zones],
  );

  /*
   * Relocation always reasons over the *whole* risk layer, never the hazard
   * filter: hiding landslides from the map must not hide them from the router.
   */
  const summary = useMemo(
    () => (selected ? summariseRiskArea(selected, RISK_ZONES, SAFE_SITES) : null),
    [selected],
  );

  // Nearest suitable safe place for the selected area, for the detail panel.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    void findNearestSafePlace(selected, SAFE_SITES, RISK_ZONES).then((result) => {
      if (!cancelled) setNearestState({ zoneId: selected.id, nearest: result });
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const changeHazard = (next: HazardType) => {
    setHazard(next);
    // Drop a selection that no longer belongs to the visible hazard.
    setSelected((s) => (s && next !== "all" && s.type !== next ? null : s));
  };

  const flyToState = (name: string) => {
    const s = INDIAN_STATES.find((x) => x.name === name);
    if (!s) return;
    setActiveState(name);
    setQuery("");
    setSelected(null);
    setTarget({ lng: s.lng, lat: s.lat, zoom: s.zoom, key: Date.now() });
  };

  const flyToZone = (z: RiskZone) => {
    setSelected(z);
    emit(narrateZoneSelected(z));
    setTarget({ lng: z.lng, lat: z.lat, zoom: 10.5, key: Date.now() });
  };

  const resetView = () => {
    setActiveState(null);
    setSelected(null);
    setTarget({ lng: 80.5, lat: 22.5, zoom: 4.1, key: Date.now() });
  };

  /** Build (or reuse) the validated relocation plan for a zone. */
  const runPlan = useCallback(async (zone: RiskZone): Promise<RelocationPlan> => {
    setPlanning(true);
    emit(narratePlanStart(zone));
    try {
      const result = await buildRelocationPlan(zone, SAFE_SITES, RISK_ZONES);
      emit(narratePlan(result));
      setPlanState({ zoneId: zone.id, plan: result });
      setTarget(planTarget(zone, result));
      return result;
    } finally {
      setPlanning(false);
    }
  }, []);

  const handleFindSites = () => {
    if (selected) void runPlan(selected);
  };

  /** Hover-popup shortcut: select the zone and plan in one action. */
  const handlePlanRelocation = useCallback(
    (zone: RiskZone) => {
      setSelected(zone);
      emit(narrateZoneSelected(zone));
      if (compactPanel) setPanelOpen(true);
      void runPlan(zone);
    },
    [runPlan, compactPanel],
  );

  const handleSendAlert = () => {
    if (!plan || !selected) return;
    const next = buildAlerts(plan);
    emit(narrateAlerts(next));
    setAlertState({ zoneId: selected.id, alerts: next });
  };

  /** Hand the validated plan to the report route — never recompute it there. */
  const handleOpenReport = () => {
    if (!plan) return;
    stashReport(plan);
    void navigate({ to: "/report" });
  };

  const findPlanSite = (siteId: string): PlanSite | null =>
    plan?.sites.find((s) => s.site.id === siteId) ?? null;

  const focusOn = (planSite: PlanSite) => {
    if (!selected || !planSite.route) return;
    setFocusState({ zoneId: selected.id, routeId: routeFeatureId(planSite) });
  };

  const handleOpenAlert = (alert: RelocationAlert) => {
    const destination = findPlanSite(alert.siteId);
    if (!destination) return;
    setCitizenState(alert);
    focusOn(destination);
    if (plan && selected) setTarget(planTarget(selected, plan));
  };

  const handleFocusSite = (planSite: PlanSite) => {
    setTarget({ lng: planSite.site.lng, lat: planSite.site.lat, zoom: 11.5, key: Date.now() });
  };

  const handleViewNearestRoute = async () => {
    if (!selected || !nearest) return;
    const current = plan ?? (await runPlan(selected));
    const destination = current.sites.find((s) => s.site.id === nearest.site.id);
    if (destination?.route) {
      setFocusState({ zoneId: selected.id, routeId: routeFeatureId(destination) });
    }
  };

  /* Panel body — rendered into the desktop sidebar and the mobile drawer. */
  const panelBody =
    citizen && findPlanSite(citizen.siteId) ? (
      <CitizenAlertView
        alert={citizen}
        destination={findPlanSite(citizen.siteId)!}
        onBack={() => {
          setCitizenState(null);
          setFocusState(null);
        }}
        onShowRoute={() => {
          const destination = findPlanSite(citizen.siteId);
          if (destination) focusOn(destination);
          if (plan && selected) setTarget(planTarget(selected, plan));
        }}
      />
    ) : (
      <>
        <div
          className="grid gap-2 border-b border-border p-4"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, counts.length)}, minmax(0, 1fr))` }}
        >
          {counts.map(({ level, n }) => (
            <div key={level} className="rounded-md border border-border p-2 text-center">
              <p className="text-lg font-semibold" style={{ color: RISK_META[level].color }}>
                {n}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{level}</p>
            </div>
          ))}
        </div>

        {selected && (
          <div className="border-b border-border p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Selected zone
            </p>
            <p className="mt-1 font-semibold">{selected.name}</p>
            <p className="text-sm text-muted-foreground">
              {selected.district}, {selected.state}
            </p>
            <p className="mt-2 text-xs">
              Hazard: <span className="font-medium">{selected.hazard}</span> ·{" "}
              <span style={{ color: RISK_META[selected.level].color }}>
                {RISK_META[selected.level].label}
              </span>
            </p>
          </div>
        )}

        {selected && summary && (
          <RelocationPanel
            zone={selected}
            summary={summary}
            plan={plan}
            planning={planning}
            nearest={nearest}
            alerts={alerts}
            onFindSites={handleFindSites}
            onSendAlert={handleSendAlert}
            onOpenReport={handleOpenReport}
            onOpenAlert={handleOpenAlert}
            onFocusSite={handleFocusSite}
            onViewNearestRoute={() => void handleViewNearestRoute()}
          />
        )}

        <div className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {activeState
              ? `${activeState} — ${HAZARD_META[hazard].label}`
              : HAZARD_META[hazard].panel}
          </p>
          <ul className="space-y-1.5">
            {zones.map((z) => (
              <li key={z.id}>
                <button
                  onClick={() => flyToZone(z)}
                  className={`flex w-full items-start gap-2 rounded-md border p-2 text-left transition-colors hover:bg-accent ${
                    selected?.id === z.id ? "border-ring bg-accent" : "border-border"
                  }`}
                >
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: RISK_META[z.level].color }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{z.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {z.hazard} · {z.district}, {z.state} ·{" "}
                      {z.populationAtRisk.toLocaleString("en-IN")} at risk
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {zones.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No {HAZARD_META[hazard].label.toLowerCase()} data for this selection.
              </li>
            )}
          </ul>
        </div>
      </>
    );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <CommandRail />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search state or UT…"
              className="pl-9"
            />
            {matches.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                {matches.map((s) => (
                  <li key={s.name}>
                    <button
                      onClick={() => flyToState(s.name)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link to="/authority">
              <Building2 className="size-4" /> Authority
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/data">
              <BarChart3 className="size-4" /> Data
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={resetView}>
            <MapIcon className="size-4" /> {activeState ?? "State"}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={basemap === "satellite" ? "default" : "outline"}
              size="sm"
              onClick={() => setBasemap("satellite")}
            >
              <Satellite className="size-4" /> Satellite
            </Button>
            <Button
              variant={basemap === "terrain" ? "default" : "outline"}
              size="sm"
              onClick={() => setBasemap("terrain")}
            >
              <Mountain className="size-4" /> Terrain
            </Button>
            <Button
              variant={showRisk ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRisk((v) => !v)}
            >
              <Layers className="size-4" /> Risk overlay
            </Button>
            <Button
              variant={showHospitals ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHospitals((v) => !v)}
              aria-pressed={showHospitals}
            >
              <Cross className="size-4" /> Hospitals
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex min-h-0 flex-1">
          {/* Map */}
          <section className="relative min-w-0 flex-1">
            <ClientOnly fallback={<MapSkeleton />}>
              <Suspense fallback={<MapSkeleton />}>
                <DiscatraMap
                  basemap={basemap}
                  target={target}
                  showRisk={showRisk}
                  showHospitals={showHospitals}
                  hazard={hazard}
                  selectedId={selected?.id ?? null}
                  onSelectZone={flyToZone}
                  plan={plan}
                  focusRouteId={focusRouteId}
                  onPlanRelocation={handlePlanRelocation}
                  safeSites={SAFE_SITES}
                />
              </Suspense>
            </ClientOnly>

            {/* Hazard filter */}
            <HazardSelector value={hazard} onChange={changeHazard} count={hazardCount} />

            {/* Legend */}
            <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-card/85 px-3 py-2 text-xs shadow-lg backdrop-blur">
              <p className="mb-1.5 font-semibold">Risk overlay</p>
              {/* Only levels actually on screen — the legend must not advertise a
                  colour the current selection contains none of. */}
              {counts.map(({ level }) => (
                <div key={level} className="flex items-center gap-2 py-0.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: RISK_META[level].color }}
                  />
                  <span className="text-muted-foreground">{RISK_META[level].label}</span>
                </div>
              ))}
              <p className="mb-1 mt-2 font-semibold">Relocation</p>
              <div className="flex items-center gap-2 py-0.5">
                <span className="h-0.5 w-4 rounded-full bg-[#1d4ed8]" />
                <span className="text-muted-foreground">Safe route</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="size-2.5 rounded-full bg-[#16a34a]" />
                <span className="text-muted-foreground">Assigned safe site</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="size-2.5 rounded-full bg-[#0ea5e9]" />
                <span className="text-muted-foreground">Standby site</span>
              </div>
              {showHospitals && (
                <>
                  <p className="mb-1 mt-2 font-semibold">Reference</p>
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="size-2.5 rounded-full bg-[#9333ea]" />
                    <span className="text-muted-foreground">Hospital</span>
                  </div>
                </>
              )}
            </div>

            {/* Mobile / tablet: the same panel as a bottom sheet. */}
            <Drawer open={compactPanel && panelOpen} onOpenChange={setPanelOpen}>
              <DrawerTrigger asChild>
                <Button
                  size="sm"
                  className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 shadow-lg lg:hidden"
                >
                  <PanelRightOpen className="size-4" />
                  {selected ? "Relocation panel" : "Risk panel"}
                  {alerts.length > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                      {alerts.length}
                    </span>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="mx-auto max-h-[85vh] w-full max-w-2xl">
                <DrawerHeader className="pb-0 text-left">
                  <DrawerTitle className="text-sm">
                    {selected ? selected.name : "Risk overview"}
                  </DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto">{panelBody}</div>
              </DrawerContent>
            </Drawer>
          </section>

          {/* Panels */}
          <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-card lg:flex">
            {panelBody}
          </aside>
        </main>
      </div>
    </div>
  );
}
