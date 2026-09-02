import type { RiskAreaSummary } from "@/lib/relocation";

/**
 * DOM builders for the MapLibre popups.
 *
 * Kept out of the map component (and out of React) because MapLibre owns these
 * nodes. They use the same design tokens as the rest of the dashboard so the
 * popups read as part of the existing map chrome.
 */

const num = (n: number) => n.toLocaleString("en-IN");

const el = (tag: string, className: string, html?: string) => {
  const node = document.createElement(tag);
  node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
};

const ROW = "flex items-baseline justify-between gap-3 py-0.5";
const KEY = "text-[10px] uppercase tracking-wide text-muted-foreground";
const VAL = "text-xs font-medium text-foreground";
const BTN =
  "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer";

export interface RiskPopupHandlers {
  onDetails: () => void;
  onPlanRelocation: () => void;
}

/**
 * Compact hover card for a risk area. Deliberately short — it must fit above or
 * below the marker even on a shallow map, so the two drill-in buttons are never
 * clipped. Everything else lives behind OPEN DETAILS.
 */
export function riskHoverPopup(summary: RiskAreaSummary, handlers: RiskPopupHandlers): HTMLElement {
  const { zone } = summary;
  const nearestHelpline = summary.helplines[0];
  const root = el("div", "w-60 space-y-2");

  root.appendChild(
    el(
      "div",
      "",
      `<p class="text-sm font-semibold leading-tight text-foreground">${zone.name}</p>
       <p class="text-[11px] text-muted-foreground">${zone.district}, ${zone.state}</p>
       <p class="mt-1 text-[11px] leading-snug">
         <span class="text-muted-foreground">${summary.hazards.join(", ")}</span>
         · <span class="font-semibold" style="color:${summary.levelColor}">${summary.levelLabel.toUpperCase()}</span>
       </p>`,
    ),
  );

  root.appendChild(
    el(
      "div",
      "rounded-md border border-border px-2 py-1.5",
      `<div class="${ROW}"><span class="${KEY}">Risk score</span>
         <span class="${VAL}">${summary.riskScore} / 100</span></div>
       <div class="${ROW}"><span class="${KEY}">People at risk</span>
         <span class="${VAL}">${num(summary.populationAtRisk)}</span></div>
       <div class="${ROW}"><span class="${KEY}">Safe capacity nearby</span>
         <span class="${VAL}" style="color:${summary.capacityCovered ? "#16a34a" : "#ff8a1f"}">
           ${num(summary.safeCapacityNearby)}
         </span></div>${
           nearestHelpline
             ? `<div class="${ROW}"><span class="${KEY}">Nearest helpline</span>
                  <a href="tel:${nearestHelpline.helpline.replace(
                    /[^0-9+]/g,
                    "",
                  )}" class="text-xs font-semibold" style="color:#1d4ed8">${nearestHelpline.helpline}</a></div>`
             : ""
         }`,
    ),
  );

  const actions = el("div", "flex gap-1.5");
  const details = el("button", `${BTN} border border-border hover:bg-accent`, "OPEN DETAILS");
  details.addEventListener("click", handlers.onDetails);
  actions.appendChild(details);

  if (summary.posture.planningRequired) {
    const plan = el(
      "button",
      `${BTN} bg-primary text-primary-foreground hover:bg-primary/90`,
      "PLAN RELOCATION",
    );
    plan.addEventListener("click", handlers.onPlanRelocation);
    actions.appendChild(plan);
  }
  root.appendChild(actions);

  return root;
}

/** Properties carried by a safe-site map feature (see relocation/geojson.ts). */
export interface SiteFeatureProps {
  name: string;
  kind: string;
  district: string;
  state: string;
  totalCapacity: number;
  occupiedCapacity: number;
  availableCapacity: number;
  safetyScore: number;
  helpline: string;
  allocation: number;
  distance: number;
  estimatedTime: number;
  routeStatus: string;
}

/** Detail card shown when a safe-site marker is clicked. */
export function safeSitePopup(p: SiteFeatureProps): HTMLElement {
  const safeRoute = p.routeStatus.startsWith("SAFE");
  const row = (key: string, value: string, color?: string) =>
    `<div class="${ROW}"><span class="${KEY}">${key}</span>
       <span class="${VAL}"${color ? ` style="color:${color}"` : ""}>${value}</span></div>`;

  return el(
    "div",
    "w-60 space-y-2",
    `<div>
       <p class="${KEY}">Safe relocation site</p>
       <p class="text-sm font-semibold leading-tight text-foreground">${p.name}</p>
       <p class="text-[11px] text-muted-foreground">${p.kind} · ${p.district}, ${p.state}</p>
     </div>
     <div class="rounded-md border border-border px-2 py-1.5">
       ${row("Capacity", num(p.totalCapacity))}
       ${row("Occupied", num(p.occupiedCapacity))}
       ${row("Available", num(p.availableCapacity), "#16a34a")}
       ${row("Assigned population", num(p.allocation))}
     </div>
     <div class="rounded-md border border-border px-2 py-1.5">
       ${row("Safety score", `${p.safetyScore}%`)}
       ${row("Route distance", `${p.distance} km`)}
       ${row("Est. travel", p.estimatedTime ? `${p.estimatedTime} min` : "—")}
       ${row("Route status", p.routeStatus, safeRoute ? "#16a34a" : "#ef2d2d")}
     </div>
     <div class="rounded-md border border-border px-2 py-1.5">
       ${row("Helpline", p.helpline, "#1d4ed8")}
       <p class="mt-1 text-[9px] leading-tight text-muted-foreground">Demo number — not a live emergency line.</p>
     </div>`,
  );
}

/** Properties carried by a hospital map feature (see hospitals/hospitals.ts). */
export interface HospitalFeatureProps {
  name: string;
  kind: string;
  district: string;
  state: string;
  beds: number;
  helpline: string;
  lng: number;
  lat: number;
}

/** Hover/click card for a hospital marker. */
export function hospitalPopup(p: HospitalFeatureProps): HTMLElement {
  const tel = p.helpline.replace(/[^0-9+]/g, "");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  return el(
    "div",
    "w-56 space-y-2",
    `<div>
       <p class="${KEY}">Hospital</p>
       <p class="text-sm font-semibold leading-tight text-foreground">${p.name}</p>
       <p class="text-[11px] text-muted-foreground">${p.kind} · ${p.district}, ${p.state}</p>
     </div>
     <div class="rounded-md border border-border px-2 py-1.5">
       <div class="${ROW}"><span class="${KEY}">Beds</span><span class="${VAL}">${num(p.beds)}</span></div>
       <div class="${ROW}"><span class="${KEY}">Helpline</span>
         <a href="tel:${tel}" class="${VAL}" style="color:#1d4ed8">${p.helpline}</a></div>
     </div>
     <a href="${directions}" target="_blank" rel="noopener noreferrer"
        class="block rounded-md border border-border px-2 py-1.5 text-center text-[11px] font-medium hover:bg-accent">
       Directions
     </a>
     <p class="text-[9px] leading-tight text-muted-foreground">Demo facility — bed count and helpline are illustrative.</p>`,
  );
}
