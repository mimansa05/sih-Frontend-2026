import { ArrowLeft, BellRing, Navigation, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RISK_META } from "@/lib/discatra-data";
import type { PlanSite, RelocationAlert } from "@/lib/relocation";

/**
 * Affected-person view of an issued alert.
 *
 * It renders the *same* `PlanSite` the authority dashboard assigned — the route
 * geometry, distance and travel time are read from the validated plan, never
 * recalculated here. There is no routing code in this file by design.
 */

const num = (n: number) => n.toLocaleString("en-IN");

const Row = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string | undefined;
}) => (
  <div className="border-b border-border py-2 last:border-b-0">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-sm font-medium" style={tone ? { color: tone } : undefined}>
      {value}
    </p>
  </div>
);

interface Props {
  alert: RelocationAlert;
  /** The assigned destination straight out of the authority's plan. */
  destination: PlanSite;
  onBack: () => void;
  onShowRoute: () => void;
}

export default function CitizenAlertView({ alert, destination, onBack, onShowRoute }: Props) {
  const meta = RISK_META[alert.riskLevel];
  const route = destination.route;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="size-4" /> Authority view
        </Button>
      </div>

      <div className="border-b border-border p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
          <BellRing className="size-3.5" /> EMERGENCY ALERT
        </p>
        <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
          {alert.message}
        </p>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Your relocation information
        </p>
        <div className="mt-2">
          <Row label="Current location" value={`${alert.area}, ${alert.district}`} />
          <Row label="Risk" value={meta.label.toUpperCase()} tone={meta.color} />
          <Row label="Hazard" value={alert.hazard} />
          <Row label="Report to" value={alert.assemblyPoint} />
          <Row label="Assigned safe site" value={alert.siteName} />
          <Row label="Distance" value={`${alert.distance} km`} />
          <Row label="Estimated travel" value={`${alert.estimatedTime} min`} />
          <Row label="Route" value="SAFE" tone="#16a34a" />
          <Row label="People assigned to this site" value={num(alert.allocation)} />
        </div>

        <Button className="mt-3 w-full" size="sm" onClick={onShowRoute}>
          <Navigation className="size-4" /> SHOW MY SAFE ROUTE
        </Button>

        <p className="mt-3 flex items-start gap-1.5 rounded-md border border-[#16a34a]/40 bg-[#16a34a]/10 p-2.5 text-[11px] leading-relaxed text-[#15803d] dark:text-[#4ade80]">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          <span>
            The blue route on the map is the same validated route the authority approved
            {route && !route.direct
              ? " — it takes a longer path to keep clear of high-risk areas."
              : "."}
          </span>
        </p>
      </div>
    </div>
  );
}
