import type { RiskZone } from "@/lib/discatra-data";
import { haversineKm } from "./geo";
import { MOCK_ASSEMBLY_POINTS } from "./mock/assembly-points";
import { assemblyLngLat, siteLngLat, type AssemblyPoint, type SafeSite } from "./types";

/**
 * Assembly-point access and batch pairing.
 *
 * Read through this module rather than the seed data directly, so a real
 * evacuation-plan API can replace it in one place.
 */

/**
 * Muster points for a zone, falling back to the zone centre when none are
 * seeded. The fallback keeps every zone plannable; it just cannot promise the
 * departure sits on a road.
 */
export function assemblyPointsFor(zone: RiskZone): AssemblyPoint[] {
  const seeded = MOCK_ASSEMBLY_POINTS[zone.id];
  if (seeded?.length) {
    return seeded.map((point, index) => ({
      id: `${zone.id}-ap${index + 1}`,
      name: `${point.dir} assembly point`,
      lng: point.lng,
      lat: point.lat,
    }));
  }
  return [
    {
      id: `${zone.id}-centre`,
      name: "Zone centre assembly point",
      lng: zone.lng,
      lat: zone.lat,
    },
  ];
}

/**
 * Give each destination its own departure point, so the batches leave from
 * different parts of the zone and take genuinely different roads.
 *
 * Each site takes the nearest point not already spoken for; if there are more
 * destinations than points the pool is reused rather than leaving a site
 * without an origin.
 */
export function pairAssemblyPoints(
  sites: SafeSite[],
  points: AssemblyPoint[],
): Map<string, AssemblyPoint> {
  const pairing = new Map<string, AssemblyPoint>();
  if (!points.length) return pairing;

  let pool = [...points];
  for (const site of sites) {
    if (!pool.length) pool = [...points];
    let bestIndex = 0;
    let bestDistance = Infinity;
    pool.forEach((point, index) => {
      const distance = haversineKm(assemblyLngLat(point), siteLngLat(site));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    pairing.set(site.id, pool[bestIndex] as AssemblyPoint);
    pool.splice(bestIndex, 1);
  }
  return pairing;
}
