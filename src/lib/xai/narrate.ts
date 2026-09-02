import { RISK_META, type RiskZone } from "@/lib/discatra-data";
import {
  availableCapacity,
  planDestinations,
  type RelocationAlert,
  type RelocationPlan,
} from "@/lib/relocation";
import type { LogSeed } from "./types";

/**
 * Domain events → console lines.
 *
 * Pure and strictly read-only. Every number here is read off a plan the
 * relocation service already produced, so the console explains real decisions
 * rather than performing them. Nothing in this module may compute a routing,
 * safety or allocation outcome of its own — the moment it does, the console
 * stops being explainable and becomes theatre.
 *
 * Seeds carry no id and no timestamp; `emit()` stamps those. That is what keeps
 * these functions deterministic and testable.
 */

const num = (n: number) => n.toLocaleString("en-IN");

export function narrateBoot(): LogSeed[] {
  return [
    { level: "info", tag: "SYS", text: "DISCATRA risk engine online" },
    {
      level: "info",
      tag: "SAT",
      text: "Earth-observation feed attached",
      detail: "Sentinel-1 SAR + Sentinel-2 MSI composite · 12 m GSD",
    },
    { level: "info", tag: "SYS", text: "Awaiting operator zone selection" },
  ];
}

export function narrateZoneSelected(zone: RiskZone): LogSeed[] {
  const meta = RISK_META[zone.level];
  return [
    {
      level: "info",
      tag: "SAT",
      text: `Scene ingested · ${zone.district}, ${zone.state}`,
      detail: `lat ${zone.lat.toFixed(3)} · lng ${zone.lng.toFixed(3)}`,
    },
    {
      level: zone.level === "critical" ? "error" : "warn",
      tag: "RISK",
      text: `${zone.name} → ${meta.label.toUpperCase()}`,
      detail: `${zone.hazard} · risk score ${Math.round(zone.weight * 100)}/100`,
    },
    {
      level: "info",
      tag: "POP",
      text: `populationAtRisk = ${num(zone.populationAtRisk)}`,
      detail: "Read from the hazard footprint — never assumed",
    },
  ];
}

export function narratePlanStart(zone: RiskZone): LogSeed[] {
  return [
    { level: "info", tag: "SITE", text: `Screening safe sites for ${zone.name}…` },
    {
      level: "info",
      tag: "ROUTE",
      text: "Safety gate armed",
      detail: "Any path intersecting a red zone buffer will be rejected",
    },
  ];
}

export function narratePlan(plan: RelocationPlan): LogSeed[] {
  const seeds: LogSeed[] = [];
  const destinations = planDestinations(plan);

  seeds.push({
    level: "info",
    tag: "SITE",
    text: `${plan.sites.length} candidate site${plan.sites.length === 1 ? "" : "s"} screened · ${plan.excluded.length} excluded`,
    detail: plan.excluded.length > 0 ? plan.excluded.map((e) => e.reason).join(" · ") : undefined,
  });

  for (const planSite of plan.sites) {
    if (planSite.route?.isSafe) {
      const { route } = planSite;
      seeds.push({
        level: "ok",
        tag: "ROUTE",
        text: `SAFE · ${planSite.site.name} — ${route.distance} km · ${route.estimatedTime} min`,
        detail: [
          route.road ? "follows road network" : "direct geometry",
          route.avoidedZones.length > 0
            ? `detoured around ${route.avoidedZones.length} hazard zone${route.avoidedZones.length === 1 ? "" : "s"}`
            : "0 hazard intersections",
          `departs ${route.origin.name}`,
        ].join(" · "),
      });
    } else {
      seeds.push({
        level: "error",
        tag: "ROUTE",
        text: `REJECTED · ${planSite.site.name} — no safe path`,
        detail: "Every candidate path crossed a red zone. Safety outranks distance.",
      });
    }
  }

  if (destinations.length > 0) {
    seeds.push({
      level: "info",
      tag: "ALLOC",
      text: destinations.map((d) => `${num(d.allocation)} → ${d.site.name}`).join("  ·  "),
      detail: destinations
        .map((d) => `${d.site.name}: ${num(availableCapacity(d.site))} places free`)
        .join(" · "),
    });
  }

  seeds.push({
    level: plan.unassigned > 0 ? "warn" : "ok",
    tag: "ALLOC",
    text: `${num(plan.totalAssigned)}/${num(plan.populationAtRisk)} placed · status ${plan.status.toUpperCase()}`,
    detail:
      plan.unassigned > 0
        ? `${num(plan.unassigned)} unplaced — reachable safe capacity is ${num(plan.reachableCapacity)}. Authority intervention required.`
        : `Routed by ${plan.routing.label}`,
  });

  return seeds;
}

export function narrateAlerts(alerts: RelocationAlert[]): LogSeed[] {
  const recipients = alerts.reduce((n, a) => n + a.allocation, 0);
  return [
    {
      level: "ok",
      tag: "ALERT",
      text: `${alerts.length} batch${alerts.length === 1 ? "" : "es"} dispatched · ${num(recipients)} recipients`,
      detail: alerts.map((a) => `${num(a.allocation)} → ${a.siteName}`).join(" · "),
    },
  ];
}
