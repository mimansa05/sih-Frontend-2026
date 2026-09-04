import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { availableCapacity, planDestinations } from "@/lib/relocation";
import { readReport, type ReportPayload } from "@/lib/report/handoff";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "RESCUE RASGULLA — Relocation Advisory" }] }),
  component: ReportPage,
});

const num = (n: number) => n.toLocaleString("en-IN");

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-0.5 text-[13px]">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ReportPage() {
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  // sessionStorage is client-only, so read after mount rather than during render.
  useEffect(() => {
    setPayload(readReport());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (!payload) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold">No relocation plan selected</h1>
          <p className="text-sm text-muted-foreground">
            Open a red zone on the risk map, build its relocation plan, then choose “Authority
            report”.
          </p>
          <Button asChild size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" /> Back to the risk map
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { plan, reference, issuedAt } = payload;
  const { zone } = plan;
  const destinations = planDestinations(plan);
  const rejected = plan.sites.filter((s) => s.status === "no_safe_route");
  const issued = new Date(issuedAt);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" /> Risk map
          </Link>
        </Button>
        <p className="text-sm font-medium">Relocation advisory · {reference}</p>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
      </header>

      <main className="report-sheet mx-auto max-w-3xl space-y-5 p-6 md:p-10">
        {/* Letterhead */}
        <div className="report-block border-b-2 border-foreground pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Rescue Rasgulla"
                width={44}
                height={44}
                className="size-11 shrink-0 rounded-full"
              />
              <div>
                <p className="text-lg font-semibold tracking-wide">RESCUE RASGULLA</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  GIS Risk Command · Relocation Directorate
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] leading-relaxed">
              <p>
                <span className="text-muted-foreground">Ref. </span>
                <span className="font-medium">{reference}</span>
              </p>
              <p className="text-muted-foreground">
                Issued {issued.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
              </p>
            </div>
          </div>
        </div>

        <div className="report-block space-y-1 text-[13px]">
          <p className="text-muted-foreground">To,</p>
          <p className="font-medium">
            The District Magistrate / District Disaster Management Authority
          </p>
          <p>
            {zone.district}, {zone.state}
          </p>
        </div>

        <div className="report-block">
          <p className="text-[13px]">
            <span className="font-semibold">Subject: </span>
            Advance intimation of population relocation into your jurisdiction — {zone.name} (
            {zone.hazard}).
          </p>
        </div>

        <div className="report-block">
          <p className="text-[13px] leading-relaxed">
            This advisory records a validated relocation plan for the affected area named below.{" "}
            <span className="font-semibold">{num(plan.totalAssigned)}</span> persons are to be
            received across <span className="font-semibold">{destinations.length}</span> relief
            facilities. Receiving facilities are requested to confirm readiness for the allocations
            in the table below.
          </p>
        </div>

        {/* Affected area */}
        <section className="report-block">
          <h2 className="mb-1.5 border-b border-border pb-1 text-[11px] font-semibold uppercase tracking-widest">
            1 · Affected area
          </h2>
          <Field label="Risk area" value={zone.name} />
          <Field label="District / State" value={`${zone.district}, ${zone.state}`} />
          <Field label="Hazard" value={zone.hazard} />
          <Field label="Risk classification" value="CRITICAL — RED ZONE" />
          <Field label="Population at risk" value={num(zone.populationAtRisk)} />
          <Field
            label="Plan status"
            value={plan.status === "ready" ? "READY FOR RELOCATION" : plan.status.toUpperCase()}
          />
        </section>

        {/* Allocation */}
        <section className="report-block">
          <h2 className="mb-1.5 border-b border-border pb-1 text-[11px] font-semibold uppercase tracking-widest">
            2 · Allocation of affected population
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receiving facility</TableHead>
                <TableHead>District</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Free after intake</TableHead>
                <TableHead>Helpline</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinations.map((d) => (
                <TableRow key={d.site.id}>
                  <TableCell>
                    <span className="font-medium">{d.site.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{d.site.kind}</span>
                  </TableCell>
                  <TableCell>{d.site.district}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {num(d.allocation)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(Math.max(0, availableCapacity(d.site) - d.allocation))}
                  </TableCell>
                  <TableCell className="tabular-nums">{d.site.helpline}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.route ? `${d.route.distance} km` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.route ? `${d.route.estimatedTime} min` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-2 space-y-0.5">
            <Field
              label="Total to be received"
              value={`${num(plan.totalAssigned)} of ${num(plan.populationAtRisk)}`}
            />
            {plan.unassigned > 0 && (
              <Field
                label="Unplaced — action required"
                value={`${num(plan.unassigned)} persons; reachable safe capacity is ${num(plan.reachableCapacity)}`}
              />
            )}
          </div>
        </section>

        {/* Route safety */}
        <section className="report-block">
          <h2 className="mb-1.5 border-b border-border pb-1 text-[11px] font-semibold uppercase tracking-widest">
            3 · Route safety certification
          </h2>
          <p className="text-[13px] leading-relaxed">
            Every route in Section 2 was validated against the active hazard layer before
            allocation. No route intersects a red zone or its avoidance buffer. Where the shortest
            path crossed a hazard it was rejected and the shortest safe alternative substituted:
            safety takes priority over distance in all cases. Routing was performed by{" "}
            {plan.routing.label}
            {plan.routing.roadRouted ? " over the road network" : ""}.
          </p>
        </section>

        {/* Annexure */}
        {rejected.length > 0 && (
          <section className="report-block">
            <h2 className="mb-1.5 border-b border-border pb-1 text-[11px] font-semibold uppercase tracking-widest">
              Annexure A · Facilities not assigned
            </h2>
            <p className="mb-1.5 text-[13px]">
              The following facilities were in range but could only be reached by crossing a
              high-risk area, and were therefore not assigned any population:
            </p>
            <ul className="list-inside list-disc text-[13px]">
              {rejected.map((s) => (
                <li key={s.site.id}>
                  {s.site.name} — {s.site.district}, {s.site.state}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Signature */}
        <section className="report-block flex justify-end pt-10">
          <div className="w-64 border-t border-foreground pt-1.5 text-center text-[11px]">
            <p className="font-medium">Authorised Signatory</p>
            <p className="text-muted-foreground">Relocation Directorate, RESCUE RASGULLA</p>
          </div>
        </section>

        <p className="report-block border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Generated by RESCUE RASGULLA GIS Risk Command from a validated relocation plan. Facility
          records, capacities and helpline numbers in this build are demonstration data and are not
          an official register.
        </p>
      </main>
    </div>
  );
}
