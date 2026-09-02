import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Building2,
  History as HistoryIcon,
  Info,
  MapPin,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ThemeToggle from "@/components/ThemeToggle";
import {
  HAZARD_META,
  RISK_META,
  RISK_ZONES,
  riskScore,
  type ObservedHazardType,
  type RiskLevel,
  type RiskZone,
} from "@/lib/discatra-data";
import { HISTORICAL_EVENTS } from "@/lib/historical/mock/events";
import { eventsPerYear, totals, worstEvents } from "@/lib/historical/queries";
import { haversineKm, SAFE_SITES, summariseRiskArea } from "@/lib/relocation";

export const Route = createFileRoute("/authority")({
  head: () => ({
    meta: [
      { title: "DISCATRA — Authority Risk Dashboard" },
      {
        name: "description",
        content:
          "Authority drilldown for a selected risk area: major risk classification, historical calamity record for the state and the chance of other co-located hazards.",
      },
    ],
  }),
  component: AuthorityPage,
});

/* ── formatting ─────────────────────────────────────────────────────────── */

const num = (n: number) => n.toLocaleString("en-IN");
const compact = (n: number) =>
  n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : num(n);

const LEVEL_ORDER: RiskLevel[] = ["critical", "high", "moderate"];

const chartConfig = {
  events: { label: "Events", color: "#1d4ed8" },
  deaths: { label: "Deaths", color: "#ef2d2d" },
  displaced: { label: "Displaced", color: "#ff8a1f" },
} satisfies ChartConfig;

/* ── "chance of other risks" derivation ─────────────────────────────────── */

const OTHER_HAZARDS: ObservedHazardType[] = ["landslide", "flood", "cloudburst", "coastal_erosion"];
/** Observations this close count as threatening the same area. */
const CO_LOCATED_KM = 160;

type Chance = "High" | "Moderate" | "Low" | "None";

const CHANCE_META: Record<Chance, { label: string; color: string }> = {
  High: { label: "High", color: "#ef2d2d" },
  Moderate: { label: "Moderate", color: "#ff8a1f" },
  Low: { label: "Low", color: "#f5d327" },
  None: { label: "No record", color: "#8b8b8b" },
};

/** Decade span of the whole historical catalogue — the denominator for frequency. */
const CATALOGUE_DECADES = (() => {
  const years = HISTORICAL_EVENTS.map((e) => e.year);
  return Math.max(1, (Math.max(...years) - Math.min(...years) + 1) / 10);
})();

function chanceFor(events: number): Chance {
  if (events === 0) return "None";
  const perDecade = events / CATALOGUE_DECADES;
  if (perDecade >= 3) return "High";
  if (perDecade >= 1.5) return "Moderate";
  return "Low";
}

interface OtherRisk {
  hazard: ObservedHazardType;
  label: string;
  /** Nearest active observation of this hazard, if one sits near the area. */
  nearby: { zone: RiskZone; km: number } | null;
  /** Past events of this hazard recorded in the same state. */
  pastEvents: number;
  lastYear: number | null;
  chance: Chance;
}

function otherRisksFor(zone: RiskZone): OtherRisk[] {
  const origin = { lng: zone.lng, lat: zone.lat };
  return OTHER_HAZARDS.filter((h) => h !== zone.type)
    .map((h): OtherRisk => {
      const nearby = RISK_ZONES.filter((z) => z.type === h)
        .map((z) => ({ zone: z, km: haversineKm({ lng: z.lng, lat: z.lat }, origin) }))
        .filter((c) => c.km <= CO_LOCATED_KM)
        .sort((a, b) => a.km - b.km)[0];
      const past = HISTORICAL_EVENTS.filter((e) => e.state === zone.state && e.hazard === h);
      const lastYear = past.length ? Math.max(...past.map((e) => e.year)) : null;
      return {
        hazard: h,
        label: HAZARD_META[h].label,
        nearby: nearby ?? null,
        pastEvents: past.length,
        lastYear,
        chance: chanceFor(past.length),
      };
    })
    .sort(
      (a, b) =>
        Number(!!b.nearby) - Number(!!a.nearby) ||
        (a.nearby?.km ?? 1e9) - (b.nearby?.km ?? 1e9) ||
        b.pastEvents - a.pastEvents,
    );
}

/* ── small presentational bits ─────────────────────────────────────────── */

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className="mt-2 text-2xl font-semibold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex gap-2 py-0.5 text-[13px]">
      <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-2 border-b border-border pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {n} · {title}
    </h2>
  );
}

/* ── the drilldown dashboard for one selected area ─────────────────────── */

function AreaDashboard({ zone }: { zone: RiskZone }) {
  const meta = RISK_META[zone.level];
  const summary = useMemo(() => summariseRiskArea(zone, RISK_ZONES, SAFE_SITES), [zone]);

  const stateEvents = useMemo(
    () => HISTORICAL_EVENTS.filter((e) => e.state === zone.state),
    [zone.state],
  );
  const districtCount = useMemo(
    () => stateEvents.filter((e) => e.district === zone.district).length,
    [stateEvents, zone.district],
  );
  const stateTotals = useMemo(() => totals(stateEvents), [stateEvents]);
  const perYear = useMemo(() => eventsPerYear(stateEvents), [stateEvents]);
  const worst = useMemo(() => worstEvents(stateEvents, 6), [stateEvents]);
  const otherRisks = useMemo(() => otherRisksFor(zone), [zone]);

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: meta.color }}
          >
            {meta.label}
          </p>
        </div>
        <h1 className="mt-1 text-lg font-semibold">{zone.name}</h1>
        <p className="text-sm text-muted-foreground">
          {zone.district}, {zone.state} · {zone.lat.toFixed(2)}°N {zone.lng.toFixed(2)}°E
        </p>
      </div>

      {/* 1 · Major risk */}
      <section className="rounded-lg border border-border bg-card p-4">
        <SectionHeading n={1} title="Major risk" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Risk score"
            value={`${riskScore(zone)} / 100`}
            hint="observation intensity"
            icon={Activity}
            tone={meta.color}
          />
          <Kpi
            label="Population at risk"
            value={num(zone.populationAtRisk)}
            hint="inside the hazard footprint"
            icon={Users}
          />
          <Kpi
            label="Risk level"
            value={zone.level.toUpperCase()}
            hint={meta.label}
            icon={ShieldAlert}
            tone={meta.color}
          />
          <Kpi
            label="Safe capacity nearby"
            value={num(summary.safeCapacityNearby)}
            hint={summary.capacityCovered ? "covers the population" : "below population at risk"}
            icon={Building2}
            tone={summary.capacityCovered ? "#16a34a" : "#ff8a1f"}
          />
        </div>
        <div className="mt-3 space-y-0.5">
          <Field label="Hazard category" value={HAZARD_META[zone.type].label} />
          <Field label="Specific hazard" value={zone.hazard} />
          <Field label="Relocation posture" value={summary.posture.headline} tone={meta.color} />
          <Field label="Recommended action" value={summary.posture.action} />
          <Field label="Eligible safe sites" value={`${summary.eligibleSiteCount} in range`} />
        </div>
      </section>

      {/* 2 · History */}
      <section className="rounded-lg border border-border bg-card p-4">
        <SectionHeading n={2} title={`History — ${zone.state}`} />
        {stateEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calamity events are recorded for {zone.state} in the demo catalogue.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="Events"
                value={num(stateTotals.events)}
                hint={`${num(districtCount)} in ${zone.district} district`}
                icon={TrendingUp}
              />
              <Kpi
                label="Lives lost"
                value={num(stateTotals.deaths)}
                hint="recorded fatalities"
                icon={Users}
              />
              <Kpi
                label="Displaced"
                value={compact(stateTotals.displaced)}
                hint="people relocated"
                icon={Users}
              />
              <Kpi
                label="Damage"
                value={`₹${num(stateTotals.damageCr)} Cr`}
                hint="estimated"
                icon={Building2}
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Events and fatalities by year
              </p>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart data={perYear} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="deaths"
                    type="monotone"
                    stroke="var(--color-deaths)"
                    fill="var(--color-deaths)"
                    fillOpacity={0.15}
                  />
                  <Area
                    dataKey="events"
                    type="monotone"
                    stroke="var(--color-events)"
                    fill="var(--color-events)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Hazard</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead className="text-right">Deaths</TableHead>
                    <TableHead className="text-right">Displaced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worst.map((e) => (
                    <TableRow
                      key={e.id}
                      className={e.district === zone.district ? "bg-accent/60" : undefined}
                    >
                      <TableCell className="tabular-nums">{e.year}</TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {HAZARD_META[e.hazard].label}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.district}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(e.deaths)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {compact(e.displaced)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Rows highlighted sit in {zone.district} district. Showing {worst.length} of{" "}
                {stateEvents.length} recorded events, deadliest first.
              </p>
            </div>
          </>
        )}
      </section>

      {/* 3 · Chance of other risks */}
      <section className="rounded-lg border border-border bg-card p-4">
        <SectionHeading n={3} title="Chance of other risks" />
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          Other hazard categories that threaten this area — whether an active observation sits
          within {CO_LOCATED_KM} km today, and how often that hazard has struck {zone.state} in the
          record.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hazard</TableHead>
                <TableHead>Active nearby</TableHead>
                <TableHead className="text-right">Past events ({zone.state})</TableHead>
                <TableHead className="text-right">Last</TableHead>
                <TableHead className="text-right">Chance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherRisks.map((r) => (
                <TableRow key={r.hazard}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell>
                    {r.nearby ? (
                      <span className="flex items-center gap-1.5 text-[13px]">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: RISK_META[r.nearby.zone.level].color }}
                        />
                        {r.nearby.zone.name}
                        <span className="text-muted-foreground">
                          · {Math.round(r.nearby.km)} km
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.pastEvents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.lastYear ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: CHANCE_META[r.chance].color,
                        borderColor: CHANCE_META[r.chance].color,
                      }}
                    >
                      {CHANCE_META[r.chance].label}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
        <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Illustrative demo data. Risk observations, populations and the historical catalogue are
          invented for development against real place names — this is not an official disaster
          register. "Chance" is a coarse frequency band derived from the demo record, not a
          calibrated probability.
        </p>
      </div>
    </div>
  );
}

/* ── page shell ───────────────────────────────────────────────────────── */

function AuthorityPage() {
  const zones = useMemo(
    () =>
      [...RISK_ZONES].sort(
        (a, b) =>
          LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
          a.name.localeCompare(b.name),
      ),
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    zones.find((z) => z.level === "critical")?.id ?? zones[0]?.id ?? null,
  );
  const selected = zones.find((z) => z.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" /> Risk map
          </Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-1.5 text-sm font-semibold tracking-wide">
            <Building2 className="size-4" /> Authority risk dashboard
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Select a risk area for its major risk, history and other-hazard outlook.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/data">
              <HistoryIcon className="size-4" /> Full record
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:flex-row md:p-6">
        {/* Risk-area picker */}
        <aside className="shrink-0 md:w-72">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Risk areas ({zones.length})
          </p>
          <ul className="space-y-1.5">
            {zones.map((z) => (
              <li key={z.id}>
                <button
                  onClick={() => setSelectedId(z.id)}
                  className={`flex w-full items-start gap-2 rounded-md border p-2 text-left transition-colors hover:bg-accent ${
                    selectedId === z.id ? "border-ring bg-accent" : "border-border"
                  }`}
                >
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: RISK_META[z.level].color }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{z.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {z.hazard} · {z.district}, {z.state}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Drilldown */}
        <section className="min-w-0 flex-1">
          {selected ? (
            <AreaDashboard zone={selected} />
          ) : (
            <div className="grid h-full min-h-[40vh] place-items-center rounded-lg border border-dashed border-border text-center">
              <div className="max-w-xs space-y-2 p-6">
                <MapPin className="mx-auto size-5 text-muted-foreground" />
                <p className="text-sm font-medium">Select a risk area</p>
                <p className="text-[12px] text-muted-foreground">
                  Pick a zone on the left — red areas are critical and need immediate relocation
                  planning.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
