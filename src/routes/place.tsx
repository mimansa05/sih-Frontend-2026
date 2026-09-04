import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CircleCheck,
  ExternalLink,
  LifeBuoy,
  Phone,
  ShieldAlert,
  Siren,
  Skull,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import { haversineKm, SAFE_SITES, summariseRiskArea } from "@/lib/relocation";
import { nearbyHospitals } from "@/lib/hospitals/hospitals";

export const Route = createFileRoute("/place")({
  validateSearch: (search: Record<string, unknown>): { zone?: string } =>
    typeof search["zone"] === "string" && search["zone"] ? { zone: search["zone"] } : {},
  head: () => ({
    meta: [
      { title: "RESCUE RASGULLA — Area Profile" },
      {
        name: "description",
        content:
          "Profile of a single risk area: a plain-language brief, its hazard history and event timeline, decade trend, state hazard mix, and what to do if it happens.",
      },
    ],
  }),
  component: PlacePage,
});

/* ── helpers ──────────────────────────────────────────────────────────── */

const num = (n: number) => n.toLocaleString("en-IN");
const compact = (n: number) =>
  n >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : num(n);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const LEVEL_ORDER: RiskLevel[] = ["critical", "high", "moderate"];
const CO_LOCATED_KM = 150;

/** Category palette — deliberately away from the red/orange/yellow risk ramp. */
const HAZARD_COLORS: Record<ObservedHazardType, string> = {
  landslide: "#b45309",
  flood: "#0ea5e9",
  cloudburst: "#6366f1",
  coastal_erosion: "#14b8a6",
};

/** Hazard-specific plain-language guidance shown in the "If it happens here" card. */
const PREPAREDNESS: Record<ObservedHazardType, { before: string[]; during: string[] }> = {
  cloudburst: {
    before: [
      "Fix the quickest route to higher ground from home, school and work.",
      "Keep a go-bag ready: documents, torch, power bank, water, medicines, whistle.",
      "Know which streams and nalas near you flash-flood — never park or camp in them.",
    ],
    during: [
      "Move uphill at once — do not wait for water to rise or try to cross a flowing channel.",
      "Cut power at the mains if water is entering the building.",
      "Call the control room and share your exact location.",
    ],
  },
  flood: {
    before: [
      "Move documents, grain and valuables to the highest floor or a raised platform.",
      "Note the nearest raised shelter, embankment or pucca building on high ground.",
      "Stock drinking water, ORS, a torch and a charged phone before the monsoon peak.",
    ],
    during: [
      "Switch off electricity and gas; never wade through moving or possibly live water.",
      "Move people and livestock to the assigned safe site early — roads flood fast.",
      "Treat all tap water as contaminated: boil or chlorinate before drinking.",
    ],
  },
  landslide: {
    before: [
      "Watch for warning signs: fresh cracks in ground or walls, tilting trees or poles, jamming doors.",
      "Plan a route away from the slope — not along it and not below it.",
      "Do not sleep or build at the toe of a steep, water-logged cut slope.",
    ],
    during: [
      "On a rumble or visible movement, leave immediately at right angles to the flow.",
      "Stay clear of the debris path and of river channels downslope of the slide.",
      "Account for everyone, then report the blockage and any trapped people.",
    ],
  },
  coastal_erosion: {
    before: [
      "Track shoreline retreat each year against a fixed marker.",
      "Keep essentials packed if the house is within one storm surge of the water.",
      "Maintain the seawall, groyne or mangrove belt fronting the settlement.",
    ],
    during: [
      "Move back from the active scarp at high tide and surge — it collapses without warning.",
      "Do not shelter in a structure the sea has already undercut.",
      "Follow the relocation plan to the assigned inland safe site.",
    ],
  },
};

interface TimelineEvent {
  year: number;
  name: string;
  district: string;
  state: string;
  deaths: number;
  displaced: number;
}

interface Profile {
  decades: { decade: string; thisHazard: number; other: number }[];
  mix: { hazard: ObservedHazardType; label: string; value: number }[];
  timeline: TimelineEvent[];
  /** True when the timeline had to fall back to events outside this state. */
  timelineNational: boolean;
  coverage: number;
  narrative: string;
  contacts: {
    hospital: { name: string; km: number; helpline: string } | null;
    siteHelplines: { name: string; helpline: string; distance: number }[];
  };
  facts: {
    lastEvent: { year: number; name: string; district: string } | null;
    deadliest: { year: number; name: string; deaths: number } | null;
    trend: "rising" | "steady" | "easing";
    coLocated: { label: string; name: string; km: number; level: RiskLevel }[];
    hazardCountState: number;
    hazardCountDistrict: number;
  };
}

function buildProfile(zone: RiskZone): Profile {
  const stateAll = HISTORICAL_EVENTS.filter((e) => e.state === zone.state);
  const sameHazardNational = HISTORICAL_EVENTS.filter((e) => e.hazard === zone.type);
  const sameHazardState = stateAll.filter((e) => e.hazard === zone.type);
  const sameHazardDistrict = sameHazardState.filter((e) => e.district === zone.district);

  const summary = summariseRiskArea(zone, RISK_ZONES, SAFE_SITES);

  const decadeMap = new Map<number, { thisHazard: number; other: number }>();
  for (const e of stateAll) {
    const d = Math.floor(e.year / 10) * 10;
    const b = decadeMap.get(d) ?? { thisHazard: 0, other: 0 };
    if (e.hazard === zone.type) b.thisHazard += 1;
    else b.other += 1;
    decadeMap.set(d, b);
  }
  const decades = [...decadeMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([d, b]) => ({ decade: `${d}s`, ...b }));

  const mixMap = new Map<ObservedHazardType, number>();
  for (const e of stateAll) mixMap.set(e.hazard, (mixMap.get(e.hazard) ?? 0) + 1);
  const mix = [...mixMap.entries()]
    .map(([hazard, value]) => ({ hazard, label: HAZARD_META[hazard].label, value }))
    .sort((a, b) => b.value - a.value);

  // Trend: first half vs second half of this hazard's timeline in the state.
  const yrs = sameHazardState.map((e) => e.year).sort((a, b) => a - b);
  let trend: Profile["facts"]["trend"] = "steady";
  if (yrs.length >= 2) {
    const mid = (yrs[0]! + yrs[yrs.length - 1]!) / 2;
    const early = yrs.filter((y) => y <= mid).length;
    const late = yrs.length - early;
    trend = late > early ? "rising" : late < early ? "easing" : "steady";
  }

  const origin = { lng: zone.lng, lat: zone.lat };
  const coLocated = RISK_ZONES.filter((z) => z.id !== zone.id && z.type !== zone.type)
    .map((z) => ({
      label: HAZARD_META[z.type].label,
      name: z.name,
      level: z.level,
      km: Math.round(haversineKm({ lng: z.lng, lat: z.lat }, origin)),
    }))
    .filter((c) => c.km <= CO_LOCATED_KM)
    .sort((a, b) => a.km - b.km);

  const lastEvent = sameHazardState.length
    ? [...sameHazardState].sort((a, b) => b.year - a.year)[0]!
    : null;
  const deadliest = sameHazardState.length
    ? [...sameHazardState].sort((a, b) => b.deaths - a.deaths)[0]!
    : null;

  const timelineNational = sameHazardState.length === 0;
  const timeline: TimelineEvent[] = (timelineNational ? sameHazardNational : sameHazardState)
    .slice()
    .sort((a, b) => b.year - a.year)
    .slice(0, 8)
    .map((e) => ({
      year: e.year,
      name: e.name,
      district: e.district,
      state: e.state,
      deaths: e.deaths,
      displaced: e.displaced,
    }));

  const hz = HAZARD_META[zone.type].label.toLowerCase();
  const coverage = clamp(
    (summary.safeCapacityNearby / Math.max(1, summary.populationAtRisk)) * 100,
  );
  const narrative = [
    `${zone.name} is a ${RISK_META[zone.level].label.toLowerCase()} in ${zone.district} district, ${zone.state}; the defining hazard here is ${zone.hazard.toLowerCase()}.`,
    sameHazardState.length === 0
      ? `The demo record holds no past ${hz} events for ${zone.state}.`
      : `${hz.charAt(0).toUpperCase() + hz.slice(1)} has been recorded ${sameHazardState.length} time${
          sameHazardState.length === 1 ? "" : "s"
        } in ${zone.state}${
          sameHazardDistrict.length ? ` (${sameHazardDistrict.length} in this district)` : ""
        }${lastEvent ? `, most recently in ${lastEvent.year}` : ""}.${
          deadliest
            ? ` The deadliest, ${deadliest.name} in ${deadliest.year}, cost ${num(deadliest.deaths)} lives.`
            : ""
        }`,
    `About ${num(zone.populationAtRisk)} people live inside the hazard footprint, and eligible safe capacity within reach covers ${coverage}% of them${
      coverage >= 100 ? "" : " — the shortfall is an authority action item"
    }.`,
    coLocated.length
      ? `${coLocated.length} other hazard zone${coLocated.length === 1 ? "" : "s"} sit within ${CO_LOCATED_KM} km, so a compound event is plausible.`
      : `No other hazard zones sit within ${CO_LOCATED_KM} km.`,
  ].join(" ");

  const nearestHospital = nearbyHospitals({ lng: zone.lng, lat: zone.lat }, undefined, 1)[0];

  return {
    decades,
    mix,
    timeline,
    timelineNational,
    coverage,
    narrative,
    contacts: {
      hospital: nearestHospital
        ? {
            name: nearestHospital.hospital.name,
            km: nearestHospital.distance,
            helpline: nearestHospital.hospital.helpline,
          }
        : null,
      siteHelplines: summary.helplines.slice(0, 2).map((h) => ({
        name: h.siteName,
        helpline: h.helpline,
        distance: h.distance,
      })),
    },
    facts: {
      lastEvent: lastEvent
        ? { year: lastEvent.year, name: lastEvent.name, district: lastEvent.district }
        : null,
      deadliest: deadliest
        ? { year: deadliest.year, name: deadliest.name, deaths: deadliest.deaths }
        : null,
      trend,
      coLocated,
      hazardCountState: sameHazardState.length,
      hazardCountDistrict: sameHazardDistrict.length,
    },
  };
}

/* ── presentational ───────────────────────────────────────────────────── */

function Card({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${wide ? "lg:col-span-2" : ""}`}
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-2"}>{children}</div>
    </section>
  );
}

const decadeConfig = {
  thisHazard: { label: "This hazard", color: "#6366f1" },
  other: { label: "Other hazards", color: "#cbd5e1" },
} satisfies ChartConfig;

/* ── the profile ──────────────────────────────────────────────────────── */

function AreaProfile({ zone }: { zone: RiskZone }) {
  const meta = RISK_META[zone.level];
  const p = useMemo(() => buildProfile(zone), [zone]);
  const hazardLabel = HAZARD_META[zone.type].label;
  const TrendIcon = p.facts.trend === "rising" ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div
        className="overflow-hidden rounded-xl border p-5"
        style={{ borderColor: `${meta.color}55`, background: `${meta.color}12` }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: meta.color }}
        >
          {meta.label}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{zone.name}</h1>
        <p className="text-sm text-muted-foreground">
          {zone.district}, {zone.state} · {hazardLabel} · {zone.lat.toFixed(2)}°N{" "}
          {zone.lng.toFixed(2)}°E
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Risk score", v: `${riskScore(zone)}/100` },
            { k: "People at risk", v: num(zone.populationAtRisk) },
            {
              k: `${hazardLabel} on record`,
              v: `${p.facts.hazardCountState} in ${zone.state}`,
            },
            {
              k: "Safe-capacity coverage",
              v: `${p.coverage}%`,
            },
          ].map((s) => (
            <div key={s.k} className="rounded-lg bg-background/60 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.k}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* In brief — plain-language read, no chart */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <ShieldAlert className="size-4" style={{ color: meta.color }} /> In brief
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground">{p.narrative}</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span
            className="rounded-full border px-2 py-0.5 font-medium"
            style={{ color: meta.color, borderColor: `${meta.color}66` }}
          >
            {meta.label}
          </span>
          <span
            className="rounded-full border px-2 py-0.5 font-medium"
            style={{
              color: p.coverage >= 100 ? "#15803d" : "#b45309",
              borderColor: p.coverage >= 100 ? "#16a34a66" : "#ff8a1f66",
            }}
          >
            {p.coverage >= 100 ? "Capacity covered" : `Capacity gap ${100 - p.coverage}%`}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            Trend: {p.facts.trend}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            {p.facts.coLocated.length
              ? `${p.facts.coLocated.length} other hazard${p.facts.coLocated.length === 1 ? "" : "s"} within ${CO_LOCATED_KM} km`
              : "No co-located hazards"}
          </span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Events by decade */}
        <Card
          title={`Calamities by decade — ${zone.state}`}
          subtitle="This area's hazard highlighted against everything else on record."
        >
          <ChartContainer config={decadeConfig} className="h-[220px] w-full">
            <BarChart data={p.decades} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="decade" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="thisHazard"
                stackId="d"
                fill="var(--color-thisHazard)"
                radius={[0, 0, 0, 0]}
              />
              <Bar dataKey="other" stackId="d" fill="var(--color-other)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Card>

        {/* Hazard mix in state */}
        <Card
          title={`Hazard mix — ${zone.state}`}
          subtitle="Share of every recorded calamity in the state, by category."
        >
          <ChartContainer
            config={
              Object.fromEntries(
                p.mix.map((m) => [m.hazard, { label: m.label, color: HAZARD_COLORS[m.hazard] }]),
              ) as ChartConfig
            }
            className="mx-auto h-[240px] w-full"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
              <Pie
                data={p.mix}
                dataKey="value"
                nameKey="label"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={2}
                strokeWidth={2}
              >
                {p.mix.map((m) => (
                  <Cell key={m.hazard} fill={HAZARD_COLORS[m.hazard]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
            {p.mix.map((m) => (
              <li key={m.hazard} className="flex items-center gap-1 text-muted-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: HAZARD_COLORS[m.hazard] }}
                />
                {m.label} · {m.value}
              </li>
            ))}
          </ul>
        </Card>

        {/* Key facts */}
        <Card title="What to know" wide>
          <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
            <li className="flex items-start gap-2 rounded-md border border-border p-2.5">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">Most recent {hazardLabel.toLowerCase()}: </span>
                {p.facts.lastEvent
                  ? `${p.facts.lastEvent.name} (${p.facts.lastEvent.district}), ${p.facts.lastEvent.year}`
                  : "none on the demo record"}
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-md border border-border p-2.5">
              <Skull className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">Deadliest on record: </span>
                {p.facts.deadliest
                  ? `${p.facts.deadliest.name}, ${p.facts.deadliest.year} — ${num(
                      p.facts.deadliest.deaths,
                    )} lives`
                  : "none on the demo record"}
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-md border border-border p-2.5">
              <TrendIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">Frequency trend: </span>
                {p.facts.trend === "rising"
                  ? `more ${hazardLabel.toLowerCase()} events in the recent half of the record`
                  : p.facts.trend === "easing"
                    ? `fewer ${hazardLabel.toLowerCase()} events lately`
                    : "roughly steady over the record"}
                {" · "}
                {p.facts.hazardCountDistrict} in {zone.district} district
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-md border border-border p-2.5">
              <Waves className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">Other hazards within {CO_LOCATED_KM} km: </span>
                {p.facts.coLocated.length
                  ? p.facts.coLocated
                      .slice(0, 3)
                      .map((c) => `${c.label} (${c.km} km)`)
                      .join(", ")
                  : "none active nearby"}
              </span>
            </li>
          </ul>
        </Card>

        {/* Event history — timeline, not a chart */}
        <Card
          title={`${hazardLabel} event history`}
          subtitle={
            p.timeline.length === 0
              ? "No events on the demo record."
              : p.timelineNational
                ? `No ${hazardLabel.toLowerCase()} on record in ${zone.state} — showing events elsewhere in India.`
                : `Recorded ${hazardLabel.toLowerCase()} events in ${zone.state}, most recent first.`
          }
          wide
        >
          {p.timeline.length > 0 && (
            <ol className="relative ml-2 space-y-4 border-l border-border pl-5">
              {p.timeline.map((e, i) => (
                <li key={`${e.year}-${e.name}-${i}`} className="relative">
                  <span
                    className="absolute -left-[27px] mt-0.5 grid size-4 place-items-center rounded-full border-2 border-background"
                    style={{ backgroundColor: meta.color }}
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold tabular-nums">{e.year}</span>
                    <span className="text-sm font-medium">{e.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {e.district}
                      {p.timelineNational ? `, ${e.state}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded bg-[#ef2d2d]/10 px-1.5 py-0.5 font-medium text-[#b91c1c] dark:text-[#f87171]">
                      {num(e.deaths)} lives lost
                    </span>
                    <span className="rounded bg-[#ff8a1f]/10 px-1.5 py-0.5 font-medium text-[#b45309] dark:text-[#fdba74]">
                      {compact(e.displaced)} displaced
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* If it happens here — guidance + contacts, not a chart */}
        <Card
          title={`If a ${hazardLabel.toLowerCase()} hits here`}
          subtitle="Plain-language steps for this hazard, plus who to call."
          wide
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <CircleCheck className="size-3.5" /> Before
              </p>
              <ul className="mt-1.5 space-y-1.5 text-[12px] leading-relaxed">
                {PREPAREDNESS[zone.type].before.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Siren className="size-3.5" /> During the event
              </p>
              <ul className="mt-1.5 space-y-1.5 text-[12px] leading-relaxed">
                {PREPAREDNESS[zone.type].during.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span
                      className="mt-1 size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Phone className="size-3.5" /> Emergency contacts
            </p>
            <ul className="mt-1.5 space-y-1 text-[12px]">
              {p.contacts.hospital && (
                <li className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <LifeBuoy className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {p.contacts.hospital.name}
                      <span className="text-[10px] text-muted-foreground">
                        {" "}
                        · {p.contacts.hospital.km} km
                      </span>
                    </span>
                  </span>
                  <a
                    href={`tel:${p.contacts.hospital.helpline.replace(/[^0-9+]/g, "")}`}
                    className="shrink-0 font-semibold text-[#1d4ed8]"
                  >
                    {p.contacts.hospital.helpline}
                  </a>
                </li>
              )}
              {p.contacts.siteHelplines.map((s) => (
                <li key={s.helpline} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {s.name}
                      <span className="text-[10px] text-muted-foreground"> · {s.distance} km</span>
                    </span>
                  </span>
                  <a
                    href={`tel:${s.helpline.replace(/[^0-9+]/g, "")}`}
                    className="shrink-0 font-semibold text-[#1d4ed8]"
                  >
                    {s.helpline}
                  </a>
                </li>
              ))}
              {!p.contacts.hospital && p.contacts.siteHelplines.length === 0 && (
                <li className="text-muted-foreground">
                  No facilities within range on the demo data.
                </li>
              )}
            </ul>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              Demo numbers — not live emergency lines.
            </p>
          </div>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
        <Building2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Illustrative demo data — risk observations and the historical catalogue are invented for
          development against real place names. Scaled axes and “coverage” are relative indicators,
          not calibrated figures.
        </p>
      </div>
    </div>
  );
}

/* ── page shell ───────────────────────────────────────────────────────── */

function PlacePage() {
  const { zone: zoneParam } = Route.useSearch();
  const navigate = useNavigate();

  const zones = useMemo(
    () =>
      [...RISK_ZONES].sort(
        (a, b) =>
          LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
          a.name.localeCompare(b.name),
      ),
    [],
  );
  const selected =
    zones.find((z) => z.id === zoneParam) ?? zones.find((z) => z.level === "critical") ?? zones[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" /> Risk map
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-wide">Area profile</h1>
          <p className="text-[11px] text-muted-foreground">
            A visual read on one risk area and its hazard history.
          </p>
        </div>

        <label className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          Area
          <select
            value={selected.id}
            onChange={(e) => void navigate({ to: "/place", search: { zone: e.target.value } })}
            className="max-w-[220px] rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} — {z.state}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="sm" asChild>
          <Link to="/authority" search={{ zone: selected.id }}>
            <ExternalLink className="size-4" /> Authority view
          </Link>
        </Button>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <AreaProfile zone={selected} />
      </main>
    </div>
  );
}
