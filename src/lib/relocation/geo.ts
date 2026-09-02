/**
 * Small planar-approximation geometry helpers used by the relocation services.
 *
 * Distances are kilometres. At the scale relocation planning works at (tens of
 * km) an equirectangular projection around the local latitude is accurate to
 * well under a percent, which keeps the safety checks cheap and dependency-free.
 * Deliberately free of any map/UI code so it can be unit-tested or reused server
 * side.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

/** GeoJSON ordering: [lng, lat]. */
export type Position = [number, number];

const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_DEG_LAT = 110.574;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const kmPerDegLng = (lat: number) => 111.32 * Math.cos(toRad(lat));

export const toPosition = (p: LngLat): Position => [p.lng, p.lat];
export const fromPosition = ([lng, lat]: Position): LngLat => ({ lng, lat });

/** Great-circle distance in km. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Shortest distance in km from `p` to the segment `a`→`b`. */
export function pointToSegmentKm(p: LngLat, a: LngLat, b: LngLat): number {
  const kx = kmPerDegLng((a.lat + b.lat) / 2);
  const ky = KM_PER_DEG_LAT;
  const bx = (b.lng - a.lng) * kx;
  const by = (b.lat - a.lat) * ky;
  const px = (p.lng - a.lng) * kx;
  const py = (p.lat - a.lat) * ky;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return Math.hypot(px - t * bx, py - t * by);
}

/** Move `origin` by an east/north offset in km. */
export function offsetKm(origin: LngLat, eastKm: number, northKm: number): LngLat {
  return {
    lng: origin.lng + eastKm / kmPerDegLng(origin.lat),
    lat: origin.lat + northKm / KM_PER_DEG_LAT,
  };
}

/** `count` evenly spaced points on a circle around `center`. */
export function ringAround(center: LngLat, radiusKm: number, count: number): LngLat[] {
  const points: LngLat[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    points.push(offsetKm(center, radiusKm * Math.cos(angle), radiusKm * Math.sin(angle)));
  }
  return points;
}

/** Total length in km of a polyline. */
export function pathLengthKm(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) total += haversineKm(a, b);
  }
  return total;
}

export const roundTo = (value: number, places = 1) => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};

/* ── Path sampling (drives the animated relocation flow) ──────────────────── */

/**
 * A polyline with cumulative distances precomputed, so a point can be sampled
 * along it every animation frame without re-walking the geometry. Road routes
 * carry thousands of vertices, which makes this worth doing once per plan.
 */
export interface PathIndex {
  coords: Position[];
  /** cum[i] = distance in km from the start to vertex i. */
  cum: number[];
  total: number;
}

export function indexPath(coords: Position[]): PathIndex {
  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const step = a && b ? haversineKm(fromPosition(a), fromPosition(b)) : 0;
    cum.push((cum[i - 1] as number) + step);
  }
  return { coords, cum, total: cum[cum.length - 1] ?? 0 };
}

/** Position at fraction `t` (0-1) along the indexed path. */
export function pointAtFraction(index: PathIndex, t: number): Position {
  const { coords, cum, total } = index;
  const first = coords[0] ?? [0, 0];
  if (coords.length < 2 || total === 0) return first;

  const goal = Math.min(Math.max(t, 0), 1) * total;
  // Binary search for the segment containing `goal`.
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if ((cum[mid] as number) <= goal) lo = mid;
    else hi = mid;
  }
  const a = coords[lo];
  const b = coords[hi];
  if (!a || !b) return first;

  const segment = (cum[hi] as number) - (cum[lo] as number);
  const f = segment > 0 ? (goal - (cum[lo] as number)) / segment : 0;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
