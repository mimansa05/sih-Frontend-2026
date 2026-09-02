import { planDestinations, type RelocationAlert, type RelocationPlan } from "./types";

/**
 * Alert construction. One alert per assigned destination, so people sent to
 * Site B are told about Site B — never a generic broadcast.
 *
 * Building the message here (rather than in a component) keeps the authority
 * dashboard and the affected-person view reading exactly the same text.
 */

export function buildAlertMessage(alert: Omit<RelocationAlert, "message">): string {
  return [
    "⚠ EMERGENCY ALERT",
    "",
    "Your area has been identified as HIGH RISK.",
    "",
    `Affected area: ${alert.area}, ${alert.district}`,
    `Report to: ${alert.assemblyPoint}`,
    `Hazard: ${alert.hazard}`,
    "",
    `Assigned safe relocation site: ${alert.siteName}`,
    `Assigned capacity: ${alert.allocation.toLocaleString("en-IN")} people`,
    `Distance: ${alert.distance} km · approx ${alert.estimatedTime} min`,
    "",
    "Tap to view the safe relocation route.",
  ].join("\n");
}

/** Alerts for every destination that actually received people. */
export function buildAlerts(plan: RelocationPlan): RelocationAlert[] {
  const sentAt = new Date().toISOString();
  return planDestinations(plan).map((destination) => {
    const route = destination.route!;
    const base: Omit<RelocationAlert, "message"> = {
      id: `alert-${plan.zone.id}-${destination.site.id}`,
      zoneId: plan.zone.id,
      area: plan.zone.name,
      district: plan.zone.district,
      state: plan.zone.state,
      hazard: plan.zone.hazard,
      riskLevel: plan.zone.level,
      siteId: destination.site.id,
      siteName: destination.site.name,
      assemblyPoint: destination.origin.name,
      allocation: destination.allocation,
      distance: route.distance,
      estimatedTime: route.estimatedTime,
      routeStatus: "SAFE",
      sentAt,
    };
    return { ...base, message: buildAlertMessage(base) };
  });
}
