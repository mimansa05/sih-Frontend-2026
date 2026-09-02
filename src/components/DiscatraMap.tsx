import { useEffect, useRef, useState } from "react";
import {
  Map as MlMap,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type FilterSpecification,
  type LngLatLike,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre v6 ships its worker as a separate ESM chunk and resolves it relative
// to its own module URL. Vite's dep pre-bundling rewrites that URL into
// `.vite/deps/`, where the worker file does not exist — the 404 silently kills
// every GeoJSON-sourced layer (they are tiled in the worker) while raster tiles
// keep drawing. Hand MapLibre a worker Vite actually bundles instead.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { RISK_ZONES, riskGeoJSON, type HazardType, type RiskZone } from "@/lib/discatra-data";
import {
  EMPTY_FEATURE_COLLECTION,
  indexPath,
  planOriginsGeoJSON,
  planRoutesGeoJSON,
  planSitesGeoJSON,
  pointAtFraction,
  summariseRiskArea,
  type PathIndex,
  type RelocationPlan,
  type SafeSite,
} from "@/lib/relocation";
import { hospitalsGeoJSON } from "@/lib/hospitals/hospitals";
import {
  hospitalPopup,
  riskHoverPopup,
  safeSitePopup,
  type HospitalFeatureProps,
  type SiteFeatureProps,
} from "./map-popups";

setWorkerUrl(maplibreWorkerUrl);

export type Basemap = "satellite" | "terrain";

const ESRI_ATTR =
  'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN and the GIS User Community';

/**
 * Real raster tile services (Esri ArcGIS Online, no API key required).
 * These are genuine satellite imagery / shaded-relief terrain tiles.
 */
const TILES: Record<Basemap, string[]> = {
  satellite: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ],
  terrain: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  ],
};

const BOUNDARY_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
];

/** Layers driven by the hazard selection — all read the one `risk` source. */
const HAZARD_LAYERS = ["risk-heat", "risk-zone-fill", "risk-markers"] as const;

/** Relocation overlay layers — a separate layer group, never part of the risk filter. */
const ROUTE_LAYERS = ["route-casing", "route-line", "route-flow", "route-standby"] as const;
/** Moving markers that show which way the population is being moved. */
const FLOW_LAYERS = ["flow-dots"] as const;
const SITE_LAYERS = ["site-halo", "site-markers"] as const;
/** Departure points — one per evacuating batch. */
const ORIGIN_LAYERS = ["origin-halo", "origin-markers"] as const;
/** Nearby hospitals — an independent toggleable reference layer. */
const HOSPITAL_LAYERS = ["hospital-halo", "hospital-markers"] as const;

/** BLUE, per the relocation spec — distinct from every red/orange/yellow risk colour. */
const ROUTE_BLUE = "#1d4ed8";
const ROUTE_BLUE_STANDBY = "#38bdf8";

/**
 * Dash offsets for the marching highlight. Cycling through them shifts the gap
 * along the line, which reads as movement in the direction of travel.
 */
const DASH_CYCLE: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];
/** Evacuation markers travelling each route at once. */
const FLOW_MARKERS = 5;
/** Seconds for one marker to travel a whole route. */
const FLOW_PERIOD_S = 6;
/** ~30fps is plenty for this and leaves the map interaction budget alone. */
const FLOW_FRAME_MS = 33;

/**
 * One source, one filter: switching hazard type only swaps a layer filter, so
 * the map is never rebuilt. `all` = unfiltered.
 */
const hazardFilter = (hazard: HazardType): FilterSpecification | undefined =>
  hazard === "all" ? undefined : ["==", ["get", "type"], hazard];

function buildStyle(basemap: Basemap, hazard: HazardType): StyleSpecification {
  const filter = hazardFilter(hazard);
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: {
        type: "raster",
        tiles: TILES[basemap],
        tileSize: 256,
        maxzoom: 19,
        attribution: ESRI_ATTR,
      },
      boundaries: {
        type: "raster",
        tiles: BOUNDARY_TILES,
        tileSize: 256,
        maxzoom: 19,
      },
      risk: { type: "geojson", data: riskGeoJSON() as never },
      // Relocation overlay — empty until a plan is built, so the map looks and
      // behaves exactly as before when relocation is not in use.
      "relocation-routes": { type: "geojson", data: EMPTY_FEATURE_COLLECTION as never },
      "relocation-sites": { type: "geojson", data: EMPTY_FEATURE_COLLECTION as never },
      // Animated evacuation-flow markers, rewritten each frame by the flow loop.
      "relocation-flow": { type: "geojson", data: EMPTY_FEATURE_COLLECTION as never },
      "relocation-origins": { type: "geojson", data: EMPTY_FEATURE_COLLECTION as never },
      // Reference hospital directory — static, hidden until toggled on.
      hospitals: { type: "geojson", data: hospitalsGeoJSON() as never },
    },
    layers: [
      // 1. REAL satellite / terrain imagery — always the bottom, never covered.
      { id: "basemap", type: "raster", source: "basemap", paint: { "raster-opacity": 1 } },
      // 2. Real state / district boundaries + place labels (transparent overlay).
      {
        id: "boundaries",
        type: "raster",
        source: "boundaries",
        paint: { "raster-opacity": 0.9 },
      },
      // 3. Geographic hazard heatmap for the selected hazard only.
      {
        id: "risk-heat",
        type: "heatmap",
        source: "risk",
        maxzoom: 12,
        ...(filter ? { filter } : {}),
        paint: {
          // Floor the weight so even a moderate observation paints a visible
          // field rather than disappearing into the basemap.
          "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0.3, 1, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 3, 1.4, 6, 2.1, 12, 3.4],
          // Wide kernel so neighbouring observations merge into one regional
          // risk field instead of reading as a halo around each point.
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            34,
            5,
            58,
            7,
            85,
            10,
            135,
            12,
            180,
          ],
          /*
           * Eased back at country view as well as when zoomed in. At z3-5 the
           * kernel is wide and the field was dense enough to swallow the zone
           * rings drawn on top of it, which is the one zoom level where those
           * rings are the only thing showing where a hazard actually is.
           */
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.5,
            6,
            0.62,
            9,
            0.6,
            12,
            0.35,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(56,189,248,0)",
            0.15,
            "rgba(56,189,248,0.45)",
            0.35,
            "rgba(34,197,94,0.6)",
            0.55,
            "rgba(250,204,21,0.72)",
            0.75,
            "rgba(249,115,22,0.82)",
            1,
            "rgba(220,38,38,0.9)",
          ],
        },
      },
      // 4. Localised risk zones (semi-transparent, imagery still visible through them).
      {
        id: "risk-zone-fill",
        type: "circle",
        source: "risk",
        ...(filter ? { filter } : {}),
        paint: {
          "circle-color": ["get", "color"],
          "circle-opacity": 0.28,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": 0.85,
          /*
           * Two jobs, one expression. Zoomed in, the circle must sit at real
           * ground scale — it is the hazard footprint the router avoids, so it
           * cannot lie about its size. Zoomed out to the country view, true
           * scale is about 2 px across and vanishes, leaving only the diffuse
           * heat field and no sense of *where* a zone actually is.
           *
           * So the divisor is itself interpolated: a floor that keeps the ring
           * legible at overview, easing into metres-per-pixel by z9 and holding
           * the previous z12 value so the zoomed-in read is unchanged.
           */
          "circle-radius": [
            "interpolate",
            ["exponential", 2],
            ["zoom"],
            3,
            ["/", ["get", "radius"], 3600],
            5,
            ["/", ["get", "radius"], 2400],
            7,
            ["/", ["get", "radius"], 1300],
            9,
            ["/", ["get", "radius"], 300],
            12,
            ["/", ["get", "radius"], 60],
          ],
        },
      },
      // 5. BLUE relocation routes. White casing keeps them legible over
      //    satellite imagery; they sit above the risk field but below the
      //    risk markers so the existing risk read is unchanged.
      {
        id: "route-casing",
        type: "line",
        source: "relocation-routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "rgba(255,255,255,0.9)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 4, 12, 8],
          "line-opacity": 0.9,
        },
      },
      {
        id: "route-line",
        type: "line",
        source: "relocation-routes",
        filter: ["==", ["get", "assigned"], true],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ROUTE_BLUE,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 12, 4.5],
          "line-opacity": 0.95,
        },
      },
      // Marching highlight along the assigned routes — shows direction of travel.
      {
        id: "route-flow",
        type: "line",
        source: "relocation-routes",
        filter: ["==", ["get", "assigned"], true],
        layout: { "line-cap": "butt", "line-join": "round" },
        paint: {
          "line-color": "#bfdbfe",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 12, 4.5],
          "line-opacity": 0.9,
          "line-dasharray": [0, 4, 3],
        },
      },
      // Sites in range with a safe route but no people assigned yet.
      {
        id: "route-standby",
        type: "line",
        source: "relocation-routes",
        filter: ["==", ["get", "assigned"], false],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ROUTE_BLUE_STANDBY,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 12, 3],
          "line-dasharray": [2, 2],
          "line-opacity": 0.8,
        },
      },
      // Population moving along each assigned route.
      {
        id: "flow-dots",
        type: "circle",
        source: "relocation-flow",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.2, 12, 4.5],
          "circle-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": ROUTE_BLUE,
        },
      },
      // 5b. Reference hospitals — hidden until the header toggle turns them on.
      //     Placed under the risk markers so a hospital pin never hides a zone.
      {
        id: "hospital-halo",
        type: "circle",
        source: "hospitals",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 8, 12, 16],
          "circle-color": "rgba(147,51,234,0.22)",
        },
      },
      {
        id: "hospital-markers",
        type: "circle",
        source: "hospitals",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4.5, 12, 8],
          "circle-color": "#9333ea",
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.95)",
        },
      },
      // 6. Risk markers.
      {
        id: "risk-markers",
        type: "circle",
        source: "risk",
        ...(filter ? { filter } : {}),
        paint: {
          // The marker is what says "a zone is here" at country view, where the
          // footprint ring is only a few pixels across, so it carries a white
          // stroke and stays a legible pin rather than shrinking to a speck.
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4.5, 5, 5, 8, 5.5, 11, 6.5],
          "circle-color": ["get", "color"],
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 10, 2],
          "circle-stroke-color": "rgba(255,255,255,0.9)",
        },
      },
      // 7. Highlight ring around the zone selected in the side panel.
      {
        id: "risk-selected",
        type: "circle",
        source: "risk",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": 12,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "rgba(255,255,255,0.95)",
        },
      },
      // 8. Assembly points — where each batch departs from inside the hazard zone.
      {
        id: "origin-halo",
        type: "circle",
        source: "relocation-origins",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 8, 12, 16],
          "circle-color": "rgba(239,45,45,0.28)",
        },
      },
      {
        id: "origin-markers",
        type: "circle",
        source: "relocation-origins",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 12, 7],
          "circle-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ef2d2d",
        },
      },
      // 9. Safe relocation sites, on top of everything.
      {
        id: "site-halo",
        type: "circle",
        source: "relocation-sites",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 9, 12, 18],
          "circle-color": [
            "match",
            ["get", "status"],
            "assigned",
            "rgba(22,163,74,0.30)",
            "no_safe_route",
            "rgba(120,120,120,0.25)",
            "rgba(56,189,248,0.22)",
          ],
        },
      },
      {
        id: "site-markers",
        type: "circle",
        source: "relocation-sites",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4.5, 12, 8],
          "circle-color": [
            "match",
            ["get", "status"],
            "assigned",
            "#16a34a",
            "no_safe_route",
            "#8b8b8b",
            "#0ea5e9",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.95)",
        },
      },
    ],
  };
}

/** Dim everything except the focused route (used by the affected-person view). */
const focusOpacity = (
  focusRouteId: string | null,
  base: number,
  dimmed = 0.1,
): number | ExpressionSpecification =>
  focusRouteId ? ["case", ["==", ["get", "routeId"], focusRouteId], base, dimmed] : base;

interface Props {
  basemap: Basemap;
  target: { lng: number; lat: number; zoom: number; key: number } | null;
  showRisk: boolean;
  /** Toggles the reference hospital layer. */
  showHospitals: boolean;
  hazard: HazardType;
  selectedId: string | null;
  onSelectZone: (zone: RiskZone) => void;
  /** Validated relocation plan — the only source of route/site geometry. */
  plan: RelocationPlan | null;
  /** When set, only this route stays bright. */
  focusRouteId: string | null;
  /** Fired by the hover popup's PLAN RELOCATION action. */
  onPlanRelocation: (zone: RiskZone) => void;
  /** Site catalogue, used for the "safe capacity nearby" line in the hover card. */
  safeSites: SafeSite[];
}

export default function DiscatraMap({
  basemap,
  target,
  showRisk,
  showHospitals,
  hazard,
  selectedId,
  onSelectZone,
  plan,
  focusRouteId,
  onPlanRelocation,
  safeSites,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);

  // Kept in refs so the map is created exactly once and never torn down when a
  // parent re-render hands us a new callback / initial hazard.
  const onSelect = useRef(onSelectZone);
  useEffect(() => {
    onSelect.current = onSelectZone;
  }, [onSelectZone]);
  const onPlan = useRef(onPlanRelocation);
  useEffect(() => {
    onPlan.current = onPlanRelocation;
  }, [onPlanRelocation]);
  const sitesRef = useRef(safeSites);
  useEffect(() => {
    sitesRef.current = safeSites;
  }, [safeSites]);
  const initialHazard = useRef(hazard);

  useEffect(() => {
    if (!container.current || map.current) return;
    const m = new MlMap({
      container: container.current,
      style: buildStyle("satellite", initialHazard.current),
      center: [80.5, 22.5],
      zoom: 4.1,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    map.current = m;
    (window as unknown as { __discatraMap?: MlMap }).__discatraMap = m;
    m.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");
    m.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");
    m.on("error", (e) => console.error("MAPERR", e.error?.message));
    // Overlay updates only need a parsed style (layers exist from `styledata`
    // onwards), so don't make them wait on the first rendered frame.
    m.on("styledata", () => setReady(true));
    m.on("load", () => {
      m.resize();
      setReady(true);
    });
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(container.current);

    /* ── Popups ─────────────────────────────────────────────────────────── */
    const hover = new Popup({
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      maxWidth: "none",
      offset: 14,
      className: "discatra-popup",
    });
    const sitePopup = new Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "none",
      offset: 14,
      className: "discatra-popup",
    });
    let hoverId: string | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelClose = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = null;
    };
    const closeHover = () => {
      cancelClose();
      hoverId = null;
      hover.remove();
    };
    // Small grace period so the pointer can travel from the marker into the
    // popup (and press its buttons) without the card vanishing.
    const scheduleClose = () => {
      if (closeTimer || !hoverId) return;
      closeTimer = setTimeout(closeHover, 260);
    };

    const showHover = (zoneId: string) => {
      const zone = RISK_ZONES.find((z) => z.id === zoneId);
      if (!zone) return;
      hoverId = zoneId;
      const node = riskHoverPopup(summariseRiskArea(zone, RISK_ZONES, sitesRef.current), {
        onDetails: () => {
          closeHover();
          onSelect.current(zone);
        },
        onPlanRelocation: () => {
          closeHover();
          onPlan.current(zone);
        },
      });
      node.addEventListener("mouseenter", cancelClose);
      node.addEventListener("mouseleave", scheduleClose);
      hover.setLngLat([zone.lng, zone.lat]).setDOMContent(node).addTo(m);
    };

    /*
     * A clicked site card is pinned: hover opens the card, but `mouseleave`
     * must not tear down a card the operator deliberately clicked open —
     * otherwise the close button and any text in it are unreachable.
     */
    let sitePinned = false;
    let siteCloseTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelSiteClose = () => {
      if (siteCloseTimer) clearTimeout(siteCloseTimer);
      siteCloseTimer = null;
    };
    /*
     * Same grace period as the risk hover: leaving the tiny marker must not
     * yank the card away before the pointer can reach the links inside it.
     */
    const scheduleSiteClose = () => {
      if (sitePinned || siteCloseTimer) return;
      siteCloseTimer = setTimeout(() => {
        siteCloseTimer = null;
        if (!sitePinned) sitePopup.remove();
      }, 260);
    };
    /** Show a site / hospital card, wiring the pointer-grace listeners on it. */
    const showSiteCard = (lngLat: LngLatLike, node: HTMLElement) => {
      cancelSiteClose();
      node.addEventListener("mouseenter", cancelSiteClose);
      node.addEventListener("mouseleave", scheduleSiteClose);
      sitePopup.setLngLat(lngLat).setDOMContent(node).addTo(m);
    };

    /** Only query layers that currently exist, or MapLibre throws. */
    const present = (ids: readonly string[]) => ids.filter((id) => m.getLayer(id));
    /*
     * The zone's tight centre pin and its broad translucent footprint are
     * queried separately. The pin always wins a click; the footprint is only a
     * fallback, so a hospital marker sitting *inside* a footprint stays
     * clickable — only the zone's own pin outranks it.
     */
    const RISK_MARKER = ["risk-markers"];
    const RISK_AREA = ["risk-zone-fill"];

    const selectZone = (f: { properties?: Record<string, unknown> | null }) => {
      sitePinned = false;
      cancelSiteClose();
      sitePopup.remove();
      const zone = RISK_ZONES.find((z) => z.id === f.properties?.["id"]);
      if (zone) {
        closeHover();
        onSelect.current(zone);
        m.flyTo({ center: [zone.lng, zone.lat], zoom: Math.max(m.getZoom(), 9), speed: 0.9 });
      }
    };

    m.on("click", (e) => {
      const site = m.queryRenderedFeatures(e.point, { layers: present(SITE_LAYERS) })[0];
      if (site) {
        sitePinned = true;
        showSiteCard(e.lngLat, safeSitePopup(site.properties as unknown as SiteFeatureProps));
        return;
      }
      const marker = m.queryRenderedFeatures(e.point, { layers: present(RISK_MARKER) })[0];
      if (marker) {
        selectZone(marker);
        return;
      }
      const hospital = m.queryRenderedFeatures(e.point, { layers: present(HOSPITAL_LAYERS) })[0];
      if (hospital) {
        sitePinned = true;
        closeHover();
        showSiteCard(
          e.lngLat,
          hospitalPopup(hospital.properties as unknown as HospitalFeatureProps),
        );
        return;
      }
      const area = m.queryRenderedFeatures(e.point, { layers: present(RISK_AREA) })[0];
      if (area) {
        selectZone(area);
        return;
      }
      sitePinned = false;
      cancelSiteClose();
      sitePopup.remove();
    });

    /*
     * Sites answer to hover as well as to the click binding above, which stays
     * as the way to pin the card at an exact point. Both drive the one
     * `sitePopup` instance, so moving between markers replaces the card instead
     * of stacking a second one, and the effect's existing `sitePopup.remove()`
     * teardown still covers it.
     *
     * Only `site-markers` is bound. `site-halo` draws the same source
     * underneath it, so binding both would fire leave-then-enter as the pointer
     * crossed from the halo onto the marker and flicker the card.
     */
    m.on("mouseenter", "site-markers", (e) => {
      const site = e.features?.[0];
      if (!site) return;
      sitePinned = false;
      closeHover();
      showSiteCard(e.lngLat, safeSitePopup(site.properties as unknown as SiteFeatureProps));
    });
    m.on("mouseleave", "site-markers", scheduleSiteClose);

    // Hospitals behave like safe sites — hover opens the shared card, click
    // (above) pins it. Only a zone's own centre pin suppresses the hospital
    // card; sitting inside a zone's footprint does not.
    m.on("mouseenter", "hospital-markers", (e) => {
      const hospital = e.features?.[0];
      if (!hospital) return;
      if (m.queryRenderedFeatures(e.point, { layers: present(RISK_MARKER) }).length > 0) return;
      sitePinned = false;
      closeHover();
      showSiteCard(e.lngLat, hospitalPopup(hospital.properties as unknown as HospitalFeatureProps));
    });
    m.on("mouseleave", "hospital-markers", scheduleSiteClose);

    m.on("mousemove", (e) => {
      const site = m.queryRenderedFeatures(e.point, { layers: present(SITE_LAYERS) })[0];
      const marker = m.queryRenderedFeatures(e.point, { layers: present(RISK_MARKER) })[0];
      const hospital = m.queryRenderedFeatures(e.point, { layers: present(HOSPITAL_LAYERS) })[0];
      const area = m.queryRenderedFeatures(e.point, { layers: present(RISK_AREA) })[0];
      m.getCanvas().style.cursor = site || marker || hospital || area ? "pointer" : "";
      /*
       * Risk hover shows for the zone pin or its footprint. A hospital under
       * the cursor (with no zone pin) shows its own card instead, so an
       * overlapping hospital stays reachable. Safe sites always suppress it.
       */
      const riskFeature = marker ?? (hospital ? null : area);
      const zoneId =
        !site && riskFeature
          ? ((riskFeature.properties?.["id"] as string | undefined) ?? null)
          : null;
      if (!zoneId) {
        scheduleClose();
        return;
      }
      if (!sitePinned) {
        cancelSiteClose();
        sitePopup.remove();
      }
      cancelClose();
      if (zoneId !== hoverId) showHover(zoneId);
    });
    m.on("mouseout", scheduleClose);

    return () => {
      cancelClose();
      cancelSiteClose();
      hover.remove();
      sitePopup.remove();
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Swap only the basemap raster tiles — overlays are untouched.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const src = m.getSource("basemap");
    if (src && "setTiles" in src) {
      (src as unknown as { setTiles: (t: string[]) => void }).setTiles(TILES[basemap]);
    }
  }, [basemap, ready]);

  // Hazard switch = filter update only. No source reload, no style rebuild.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const filter = hazardFilter(hazard);
    for (const id of HAZARD_LAYERS) {
      if (m.getLayer(id)) m.setFilter(id, filter ?? null);
    }
  }, [hazard, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !m.getLayer("risk-selected")) return;
    m.setFilter("risk-selected", ["==", ["get", "id"], selectedId ?? ""]);
  }, [selectedId, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    for (const id of [...HAZARD_LAYERS, "risk-selected"]) {
      if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", showRisk ? "visible" : "none");
    }
  }, [showRisk, ready]);

  // Reference hospital layer — independent of every other overlay.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    for (const id of HOSPITAL_LAYERS) {
      if (m.getLayer(id)) {
        m.setLayoutProperty(id, "visibility", showHospitals ? "visible" : "none");
      }
    }
  }, [showHospitals, ready]);

  // Relocation overlay: a pure projection of the validated plan.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const routes = m.getSource("relocation-routes");
    const sites = m.getSource("relocation-sites");
    const origins = m.getSource("relocation-origins");
    if (routes && "setData" in routes) {
      (routes as unknown as { setData: (d: unknown) => void }).setData(planRoutesGeoJSON(plan));
    }
    if (sites && "setData" in sites) {
      (sites as unknown as { setData: (d: unknown) => void }).setData(planSitesGeoJSON(plan));
    }
    if (origins && "setData" in origins) {
      (origins as unknown as { setData: (d: unknown) => void }).setData(planOriginsGeoJSON(plan));
    }
  }, [plan, ready]);

  /*
   * Evacuation flow animation.
   *
   * Markers travel each assigned route from the affected area towards its safe
   * site, and a dashed highlight marches along underneath, so the map shows who
   * is moving where rather than just drawing a static line. Purely decorative:
   * it reads the same validated geometry the plan produced and never changes it.
   */
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;

    const source = m.getSource("relocation-flow");
    const setFlow = (data: unknown) => {
      if (source && "setData" in source) {
        (source as unknown as { setData: (d: unknown) => void }).setData(data);
      }
    };

    const paths: { routeId: string; index: PathIndex }[] = (plan?.sites ?? [])
      .filter((s) => s.route?.isSafe && s.allocation > 0)
      .map((s) => ({
        routeId: `${s.route!.source}->${s.site.id}`,
        index: indexPath(s.route!.coordinates),
      }))
      .filter((p) => p.index.total > 0);

    if (!paths.length) {
      setFlow(EMPTY_FEATURE_COLLECTION);
      return;
    }

    // Honour the viewer's motion preference — draw the markers, hold them still.
    const still =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let last = 0;
    const start = performance.now();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < FLOW_FRAME_MS) return;
      last = now;

      const phase = still ? 0 : ((now - start) / 1000 / FLOW_PERIOD_S) % 1;
      const features = paths.flatMap(({ routeId, index }) =>
        Array.from({ length: FLOW_MARKERS }, (_, i) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: pointAtFraction(index, (phase + i / FLOW_MARKERS) % 1),
          },
          properties: { routeId },
        })),
      );
      setFlow({ type: "FeatureCollection", features });

      if (!still && m.getLayer("route-flow")) {
        const step = DASH_CYCLE[Math.floor(((now - start) / 60) % DASH_CYCLE.length)];
        if (step) m.setPaintProperty("route-flow", "line-dasharray", step);
      }
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      setFlow(EMPTY_FEATURE_COLLECTION);
    };
  }, [plan, ready]);

  // Affected-person view: keep only their own route bright.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const opacities: Record<(typeof ROUTE_LAYERS)[number], number> = {
      "route-casing": 0.9,
      "route-line": 0.95,
      "route-flow": 0.9,
      "route-standby": 0.8,
    };
    for (const id of ROUTE_LAYERS) {
      if (m.getLayer(id)) {
        m.setPaintProperty(id, "line-opacity", focusOpacity(focusRouteId, opacities[id], 0.08));
      }
    }
    for (const id of FLOW_LAYERS) {
      if (m.getLayer(id)) {
        m.setPaintProperty(id, "circle-opacity", focusOpacity(focusRouteId, 1, 0.08));
        m.setPaintProperty(id, "circle-stroke-opacity", focusOpacity(focusRouteId, 1, 0.08));
      }
    }
    for (const id of [...ORIGIN_LAYERS, ...SITE_LAYERS]) {
      if (m.getLayer(id)) {
        m.setPaintProperty(id, "circle-opacity", focusOpacity(focusRouteId, 1, 0.15));
        m.setPaintProperty(id, "circle-stroke-opacity", focusOpacity(focusRouteId, 1, 0.15));
      }
    }
  }, [focusRouteId, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !target) return;
    m.flyTo({ center: [target.lng, target.lat], zoom: target.zoom, speed: 1.1, curve: 1.4 });
  }, [target]);

  return <div ref={container} className="h-full w-full" />;
}
