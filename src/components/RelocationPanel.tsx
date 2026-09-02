import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Check,
  Cross,
  FileText,
  LifeBuoy,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RISK_META, type RiskZone } from "@/lib/discatra-data";
import { nearbyHospitals } from "@/lib/hospitals/hospitals";
import {
  availableCapacity,
  planDestinations,
  type NearestSafePlace,
  type PlanSite,
  type RelocationAlert,
  type RelocationPlan,
  type RiskAreaSummary,
} from "@/lib/relocation";

/**
 * Where CONTACT RESCUE TEAM sends its incident brief. A demo build ships no
 * live control-room integration, so the button opens WhatsApp with a
 * pre-filled message to this number instead — change it for a real deployment.
 * Digits only, including country code (91 = India).
 */
const RESCUE_CONTACT_PHONE = "917452066099";
/** Same number, formatted for display. */
const RESCUE_CONTACT_PHONE_DISPLAY = "+91 74520 66099";

/**
 * Authority relocation panel.
 *
 * Renders a plan produced by the relocation service — it performs no routing,
 * no allocation and no safety decisions of its own, so what an authority sees
 * here is exactly what an affected person is later shown.
 */

const num = (n: number) => n.toLocaleString("en-IN");

const SECTION = "border-b border-border p-4";
const LABEL = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

/**
 * Build a `https://wa.me/` link carrying the full incident brief for the
 * affected area — everything the rescue desk needs to respond: location,
 * hazard, risk, the relocation plan and the nearby helplines. WhatsApp opens
 * with the message pre-filled; the operator still presses send.
 */
function rescueWhatsAppHref(
  zone: RiskZone,
  summary: RiskAreaSummary,
  plan: RelocationPlan | null,
): string {
  const lines: string[] = [
    "*DISCATRA — RESCUE / EMERGENCY CONTACT REQUEST*",
    `Raised: ${new Date().toLocaleString("en-IN")}`,
    "",
    "*AFFECTED AREA*",
    `Area: ${zone.name}`,
    `District / State: ${zone.district}, ${zone.state}`,
    `Coordinates: ${zone.lat.toFixed(4)}, ${zone.lng.toFixed(4)}`,
    `Location: https://www.google.com/maps?q=${zone.lat},${zone.lng}`,
    `Hazard: ${zone.hazard}`,
    `Risk: ${summary.levelLabel.toUpperCase()} — score ${summary.riskScore}/100`,
    `People at risk: ${num(summary.populationAtRisk)}`,
    `Safe capacity nearby: ${num(summary.safeCapacityNearby)}`,
    "",
  ];

  if (plan) {
    lines.push(
      "*RELOCATION PLAN*",
      `Status: ${plan.status.toUpperCase()}`,
      `Assigned: ${num(plan.totalAssigned)} of ${num(plan.populationAtRisk)}`,
      `Unassigned: ${num(plan.unassigned)}`,
      "",
      "*ASSIGNED SAFE SITES*",
      ...planDestinations(plan).map(
        (d) =>
          `- ${d.site.name} (${d.site.district}): ${num(d.allocation)} people, ` +
          `${d.route ? `${d.route.distance} km / ${d.route.estimatedTime} min` : "route pending"}, ` +
          `helpline ${d.site.helpline}`,
      ),
      "",
    );
  } else {
    lines.push("No relocation plan has been built for this area yet.", "");
  }

  if (summary.helplines.length > 0) {
    lines.push(
      "*NEARBY HELPLINES*",
      ...summary.helplines.map((h) => `- ${h.siteName} (${h.distance} km): ${h.helpline}`),
      "",
    );
  }

  lines.push(
    "Please respond on this number about this calamity — coordination, resources and next steps.",
    "",
    "- Sent from DISCATRA GIS Risk Command (demo build)",
  );

  return `https://wa.me/${RESCUE_CONTACT_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className={LABEL}>{label}</span>
      <span className="text-xs font-medium" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Notice({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "danger" | "warn" | "ok";
  icon: typeof AlertTriangle;
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    warn: "border-[#ff8a1f]/40 bg-[#ff8a1f]/10 text-[#b25c00] dark:text-[#ffb066]",
    ok: "border-[#16a34a]/40 bg-[#16a34a]/10 text-[#15803d] dark:text-[#4ade80]",
  }[tone];
  return (
    <div className={`rounded-md border p-3 ${styles}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5 shrink-0" />
        {title}
      </p>
      {children && <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed">{children}</div>}
    </div>
  );
}

/** One destination card: capacity, allocation, distance and route status. */
function DestinationCard({
  planSite,
  index,
  onFocus,
}: {
  planSite: PlanSite;
  index: number;
  onFocus: (planSite: PlanSite) => void;
}) {
  const { site, origin, route, allocation, status } = planSite;
  const unusable = status === "no_safe_route";
  return (
    <li>
      <button
        onClick={() => onFocus(planSite)}
        className="w-full rounded-md border border-border p-2.5 text-left transition-colors hover:bg-accent"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {allocation > 0 && (
                <span className="text-muted-foreground">
                  Site {String.fromCharCode(65 + index)} ·{" "}
                </span>
              )}
              {site.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {site.kind} · {site.district}
            </p>
          </div>
          <span
            className="mt-0.5 size-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: unusable ? "#8b8b8b" : allocation > 0 ? "#16a34a" : "#0ea5e9",
            }}
          />
        </div>

        <div className="mt-2 space-y-0.5">
          <Stat label="Departs from" value={origin.name} />
          <Stat
            label="Capacity"
            value={`${num(availableCapacity(site))} of ${num(site.totalCapacity)} free`}
          />
          <Stat
            label="Allocation"
            value={allocation > 0 ? `${num(allocation)} people` : unusable ? "—" : "Standby"}
            tone={allocation > 0 ? "#16a34a" : undefined}
          />
          <Stat label="Distance" value={route ? `${route.distance} km` : "—"} />
          <Stat label="Est. travel" value={route ? `${route.estimatedTime} min` : "—"} />
          <Stat label="Safety score" value={`${site.safetyScore}%`} />
          <Stat label="Helpline" value={site.helpline} />
          <Stat
            label="Route"
            value={
              unusable
                ? "NO SAFE ROUTE"
                : !route?.direct
                  ? "SAFE (rerouted)"
                  : route.road
                    ? "SAFE (road route)"
                    : "SAFE (direct)"
            }
            tone={unusable ? "#ef2d2d" : "#16a34a"}
          />
        </div>

        {route && route.transferKm > 0.3 && (
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            Includes a {route.transferKm} km transfer from the assembly point to the road head.
          </p>
        )}

        {route && route.avoidedZones.length > 0 && (
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            Shortest path rejected — it crossed {route.avoidedZones.length} high-risk zone
            {route.avoidedZones.length === 1 ? "" : "s"}. Showing shortest safe alternative.
          </p>
        )}
      </button>
    </li>
  );
}

interface Props {
  zone: RiskZone;
  summary: RiskAreaSummary;
  plan: RelocationPlan | null;
  planning: boolean;
  nearest: NearestSafePlace | null;
  alerts: RelocationAlert[];
  onFindSites: () => void;
  onSendAlert: () => void;
  onOpenReport: () => void;
  onOpenAlert: (alert: RelocationAlert) => void;
  onFocusSite: (planSite: PlanSite) => void;
  onViewNearestRoute: () => void;
}

export default function RelocationPanel({
  zone,
  summary,
  plan,
  planning,
  nearest,
  alerts,
  onFindSites,
  onSendAlert,
  onOpenReport,
  onOpenAlert,
  onFocusSite,
  onViewNearestRoute,
}: Props) {
  const meta = RISK_META[zone.level];
  const destinations = plan ? planDestinations(plan) : [];
  const unreachable = plan?.sites.filter((s) => s.status === "no_safe_route") ?? [];
  const standby = plan?.sites.filter((s) => s.status === "standby") ?? [];

  const sent = alerts.length > 0;
  const [broadcast, setBroadcast] = useState<"idle" | "done">("idle");
  const hospitals = nearbyHospitals({ lng: zone.lng, lat: zone.lat });

  /**
   * Push the compiled alert text out of the app: the native share sheet where
   * the browser has one (phones), otherwise the clipboard so the operator can
   * paste it into whatever channel actually reaches people.
   */
  const handleBroadcast = async () => {
    const text = alerts.map((a) => a.message).join("\n\n----------\n\n");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `DISCATRA alert — ${zone.name}`, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setBroadcast("done");
      setTimeout(() => setBroadcast("idle"), 2000);
    } catch {
      // Share cancelled or clipboard blocked — nothing to recover, leave as is.
    }
  };

  return (
    <div className="flex flex-col">
      {/* Posture — how this risk level maps onto relocation. */}
      <div className={SECTION}>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: meta.color }}
          >
            {summary.posture.headline}
          </p>
        </div>
        <p className="mt-2 text-sm font-semibold">{zone.name}</p>
        <p className="text-xs text-muted-foreground">
          {zone.district}, {zone.state}
        </p>
        <div className="mt-2.5 space-y-0.5">
          <Stat label="Population at risk" value={num(zone.populationAtRisk)} />
          <Stat label="Risk level" value={meta.label.toUpperCase()} tone={meta.color} />
          <Stat label="Risk score" value={`${summary.riskScore} / 100`} />
          <Stat
            label="Safe capacity nearby"
            value={num(summary.safeCapacityNearby)}
            tone={summary.capacityCovered ? "#16a34a" : "#ff8a1f"}
          />
        </div>

        <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
          <Link to="/place" search={{ zone: zone.id }}>
            <Info className="size-4" /> KNOW MORE ABOUT THIS AREA
          </Link>
        </Button>
        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
          Visual profile for {zone.district}: risk fingerprint, {zone.hazard.toLowerCase()} history
          and cumulative toll.
        </p>

        {!plan && (
          <Button className="mt-3 w-full" size="sm" onClick={onFindSites} disabled={planning}>
            {planning ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Finding safe sites…
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" /> FIND SAFE SITES
              </>
            )}
          </Button>
        )}
      </div>

      {/* Helplines for the eligible safe sites near this area. */}
      {summary.helplines.length > 0 && (
        <div className={SECTION}>
          <p className={LABEL}>
            <Phone className="mr-1 inline size-3 align-[-1px]" />
            Helplines
          </p>
          <ul className="mt-2 space-y-1.5">
            {summary.helplines.map((h) => (
              <li key={h.helpline} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{h.siteName}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {h.distance} km away
                  </span>
                </span>
                <a
                  href={`tel:${h.helpline.replace(/[^0-9+]/g, "")}`}
                  className="shrink-0 text-xs font-semibold text-[#1d4ed8]"
                >
                  {h.helpline}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Demo numbers — not live emergency lines.
          </p>
        </div>
      )}

      {/* Nearby hospitals for the affected area. */}
      {hospitals.length > 0 && (
        <div className={SECTION}>
          <p className={LABEL}>
            <Cross className="mr-1 inline size-3 align-[-1px]" />
            Nearby hospitals
          </p>
          <ul className="mt-2 space-y-1.5">
            {hospitals.map(({ hospital, distance }) => (
              <li key={hospital.id} className="rounded-md border border-border p-2">
                <p className="truncate text-xs font-medium">{hospital.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {hospital.kind} · {distance} km · {num(hospital.beds)} beds
                </p>
                <div className="mt-1 flex gap-3">
                  <a
                    href={`tel:${hospital.helpline.replace(/[^0-9+]/g, "")}`}
                    className="text-[11px] font-semibold text-[#1d4ed8]"
                  >
                    {hospital.helpline}
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${zone.lat},${zone.lng}&destination=${hospital.lat},${hospital.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-muted-foreground underline"
                  >
                    Directions
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Demo facilities — turn on “Hospitals” in the header to see them on the map.
          </p>
        </div>
      )}

      {/* Nearest safe place — shown before a full plan is built too. */}
      {nearest && (
        <div className={SECTION}>
          <p className={LABEL}>Nearest safe place</p>
          <p className="mt-1 text-sm font-medium">{nearest.site.name}</p>
          <div className="mt-1.5 space-y-0.5">
            <Stat label="Distance" value={`${nearest.route.distance} km`} />
            <Stat label="Available capacity" value={num(availableCapacity(nearest.site))} />
            <Stat label="Safety" value="SAFE" tone="#16a34a" />
          </div>
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={onViewNearestRoute}>
            <Navigation className="size-4" /> VIEW SAFE ROUTE
          </Button>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Nearest is not automatically suitable — sites that fail the safety, capacity or
            safe-route checks are excluded before this one is chosen.
          </p>
        </div>
      )}

      {/* The plan itself. */}
      {plan && (
        <div className={SECTION}>
          <div className="flex items-center justify-between">
            <p className={LABEL}>Relocation plan</p>
            <span className="text-[10px] text-muted-foreground">
              {plan.routing.roadRouted ? "road routes" : "estimated routes"}
            </span>
          </div>

          {plan.status === "no_site" && (
            <div className="mt-2">
              <Notice tone="danger" icon={AlertTriangle} title="NO SAFE RELOCATION SITE FOUND">
                <p>
                  No currently available safe relocation site satisfies the required safety and
                  capacity conditions.
                </p>
                <p className="font-semibold">Authority intervention required.</p>
              </Notice>
            </div>
          )}

          {plan.status === "no_safe_route" && (
            <div className="mt-2">
              <Notice tone="danger" icon={AlertTriangle} title="NO SAFE ROUTE FOUND">
                <p>
                  The available routes pass through high-risk or restricted areas. No destination
                  has been assigned.
                </p>
                <p className="font-semibold">Authority intervention required.</p>
              </Notice>
            </div>
          )}

          {destinations.length > 0 && (
            <>
              <ul className="mt-2 space-y-2">
                {destinations.map((planSite, i) => (
                  <DestinationCard
                    key={planSite.site.id}
                    planSite={planSite}
                    index={i}
                    onFocus={onFocusSite}
                  />
                ))}
              </ul>

              <div className="mt-3 rounded-md border border-border p-2.5">
                <Stat
                  label="Total assigned"
                  value={`${num(plan.totalAssigned)} / ${num(plan.populationAtRisk)}`}
                />
                <Stat
                  label="Unassigned"
                  value={num(plan.unassigned)}
                  tone={plan.unassigned > 0 ? "#ef2d2d" : "#16a34a"}
                />
                <Stat label="Destinations" value={String(destinations.length)} />
                <Stat
                  label="Status"
                  value={plan.status === "ready" ? "READY FOR RELOCATION" : "PARTIAL PLAN"}
                  tone={plan.status === "ready" ? "#16a34a" : "#ff8a1f"}
                />
              </div>
            </>
          )}

          {plan.status === "partial" && (
            <div className="mt-3">
              <Notice tone="warn" icon={AlertTriangle} title="INSUFFICIENT RELOCATION CAPACITY">
                <p>People at risk: {num(plan.populationAtRisk)}</p>
                <p>Available safe capacity: {num(plan.reachableCapacity)}</p>
                <p>Unassigned: {num(plan.unassigned)}</p>
                <p className="font-semibold">Authority intervention required.</p>
              </Notice>
            </div>
          )}

          {unreachable.length > 0 && (
            <div className="mt-3">
              <Notice tone="warn" icon={AlertTriangle} title="ROUTES REJECTED">
                <p>
                  {unreachable.length} nearby site{unreachable.length === 1 ? "" : "s"} could only
                  be reached through a high-risk area and{" "}
                  {unreachable.length === 1 ? "was" : "were"} not assigned:
                </p>
                <ul className="list-inside list-disc">
                  {unreachable.map((s) => (
                    <li key={s.site.id}>{s.site.name}</li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}

          {standby.length > 0 && (
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              {standby.length} further safe site{standby.length === 1 ? "" : "s"} in range on
              standby ({num(standby.reduce((n, s) => n + availableCapacity(s.site), 0))} spare
              places).
            </p>
          )}

          {plan.excluded.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted-foreground">
                {plan.excluded.length} site{plan.excluded.length === 1 ? "" : "s"} excluded
              </summary>
              <ul className="mt-1 space-y-0.5">
                {plan.excluded.map((e) => (
                  <li key={e.site.id} className="text-[10px] text-muted-foreground">
                    {e.site.name} — {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {destinations.length > 0 && (
            <div className="mt-3 space-y-2">
              <Button
                className="w-full"
                size="sm"
                variant={sent ? "outline" : "default"}
                onClick={onSendAlert}
              >
                <BellRing className="size-4" />
                {sent ? `ALERTS DISPATCHED (${alerts.length}) · RESEND` : "SEND ALERT"}
              </Button>
              <Button className="w-full" size="sm" variant="outline" onClick={onOpenReport}>
                <FileText className="size-4" /> AUTHORITY REPORT
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Alerts issued for this plan. */}
      {alerts.length > 0 && (
        <div className={SECTION}>
          <div className="flex items-center justify-between gap-2">
            <p className={LABEL}>Alerts sent</p>
            <button
              type="button"
              onClick={() => void handleBroadcast()}
              className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              {broadcast === "done" ? (
                <>
                  <Check className="size-3" /> Copied
                </>
              ) : (
                <>
                  <Share2 className="size-3" /> Share / copy
                </>
              )}
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <button
                  onClick={() => onOpenAlert(alert)}
                  className="flex w-full items-center gap-2 rounded-md border border-border p-2 text-left transition-colors hover:bg-accent"
                >
                  <Users className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {num(alert.allocation)} people → {alert.siteName}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      Open as affected person
                    </span>
                  </span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Emergency footer. */}
      <div className={SECTION}>
        <p className={LABEL}>Need immediate help?</p>
        <Button variant="destructive" size="sm" className="mt-2 w-full" asChild>
          <a
            href={rescueWhatsAppHref(zone, summary, plan)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LifeBuoy className="size-4" /> CONTACT RESCUE TEAM
          </a>
        </Button>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Demo build — opens WhatsApp with a pre-filled message to the configured rescue desk (
          {RESCUE_CONTACT_PHONE_DISPLAY}) carrying this area's hazard, risk, relocation plan and
          helplines. Review and send it in WhatsApp.
        </p>
      </div>

      <div className="p-4 text-[10px] leading-relaxed text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <MapPin className="size-3" /> Demo data
        </p>
        <p className="mt-1">
          Safe sites, capacities and populations are illustrative development data.{" "}
          {plan?.routing.roadRouted
            ? `Routes follow the real road network (${plan.routing.label}) and avoid every red and orange zone; travel times come from the routing engine.`
            : "Routes avoid every red and orange zone; where the road router is unreachable, geometry and travel time fall back to a 30 km/h straight-line estimate."}
        </p>
      </div>
    </div>
  );
}
