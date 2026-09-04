import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Info, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { HAZARD_META, HAZARD_TYPES, type HazardType } from "@/lib/discatra-data";
import { HISTORICAL_EVENTS } from "@/lib/historical/mock/events";
import {
  ALL_STATES,
  byHazard,
  decadesIn,
  eventsPerYear,
  filterEvents,
  statesIn,
  totals,
  worstEvents,
} from "@/lib/historical/queries";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "RESCUE RASGULLA — Historical Calamity Record" },
      {
        name: "description",
        content:
          "Historical disaster analytics for India: events per year, hazard breakdown, deaths, displacement and damage by state and decade.",
      },
    ],
  }),
  component: DataPage,
});

const num = (n: number) => n.toLocaleString("en-IN");

const compact = (n: number) =>
  n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : num(n);

const chartConfig = {
  events: { label: "Events", color: "#1d4ed8" },
  deaths: { label: "Deaths", color: "#ef2d2d" },
  displaced: { label: "Displaced", color: "#ff8a1f" },
} satisfies ChartConfig;

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function DataPage() {
  const [hazard, setHazard] = useState<HazardType>("all");
  const [state, setState] = useState<string>(ALL_STATES);
  const [decade, setDecade] = useState<number | null>(null);

  const events = useMemo(
    () => filterEvents(HISTORICAL_EVENTS, { hazard, state, decade }),
    [hazard, state, decade],
  );

  const summary = useMemo(() => totals(events), [events]);
  const perYear = useMemo(() => eventsPerYear(events), [events]);
  const hazards = useMemo(() => byHazard(events), [events]);
  const worst = useMemo(() => worstEvents(events, 12), [events]);

  const allStates = useMemo(() => statesIn(HISTORICAL_EVENTS), []);
  const allDecades = useMemo(() => decadesIn(HISTORICAL_EVENTS), []);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition-colors ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" /> Risk map
          </Link>
        </Button>
        <div>
          <h1 className="text-sm font-semibold tracking-wide">Historical calamity record</h1>
          <p className="text-[11px] text-muted-foreground">
            {num(summary.events)} events · {num(summary.states)} states
          </p>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Illustrative demo dataset. Figures are invented for development against real place names
            and plausible years — this is not an official disaster register and must not be cited as
            one.
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {HAZARD_TYPES.map((h) => (
              <button key={h} onClick={() => setHazard(h)} className={chip(hazard === h)}>
                {HAZARD_META[h].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setDecade(null)} className={chip(decade === null)}>
              All decades
            </button>
            {allDecades.map((d) => (
              <button key={d} onClick={() => setDecade(d)} className={chip(decade === d)}>
                {d}s
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setState(ALL_STATES)} className={chip(state === ALL_STATES)}>
              All states
            </button>
            {allStates.map((s) => (
              <button key={s} onClick={() => setState(s)} className={chip(state === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Events"
            value={num(summary.events)}
            hint="in current selection"
            icon={TrendingUp}
          />
          <Kpi
            label="Lives lost"
            value={num(summary.deaths)}
            hint="recorded fatalities"
            icon={Users}
          />
          <Kpi
            label="Displaced"
            value={compact(summary.displaced)}
            hint="people relocated"
            icon={Users}
          />
          <Kpi
            label="Damage"
            value={`₹${num(summary.damageCr)} Cr`}
            hint="estimated"
            icon={Building2}
          />
        </div>

        {events.length === 0 ? (
          <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
            No events match this selection.
          </div>
        ) : (
          <>
            {/* Trend */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Events and fatalities by year</h2>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Fatalities on the left axis, event count on the right.
              </p>
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
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
            </section>

            {/* Hazard breakdown */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Displacement by hazard</h2>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Total people displaced per calamity category.
              </p>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <BarChart data={hazards} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="displaced" fill="var(--color-displaced)" radius={4} />
                </BarChart>
              </ChartContainer>
            </section>

            {/* Table */}
            <section className="rounded-lg border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 className="text-sm font-semibold">Most severe events</h2>
                <p className="text-[11px] text-muted-foreground">
                  Ranked by recorded fatalities. Showing {worst.length} of {events.length}.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Hazard</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Deaths</TableHead>
                      <TableHead className="text-right">Displaced</TableHead>
                      <TableHead className="text-right">Damage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worst.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="tabular-nums">{e.year}</TableCell>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {HAZARD_META[e.hazard].label}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.district}, {e.state}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{num(e.deaths)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {compact(e.displaced)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ₹{num(e.damageCr)} Cr
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
