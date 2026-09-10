/**
 * Deterministic per-address ring offsets (specification 3.1).
 *
 * A road anchor is the only coordinate the geocoder can resolve for this
 * dataset. Placing every address of a road on its anchor would assert a
 * co-location the data does not support, and would be indistinguishable from
 * the genuine shared-address fraud signal. So the `n` distinct addresses of a
 * road are spread evenly around a ring centred on the anchor, indexed by
 * their Unicode code point order, which makes the result a pure function of
 * the address set and therefore reproducible from the CSV alone.
 *
 * The ring is a claim about the road segment, never a surveyed position.
 */

/** Metres per degree of latitude, the spherical constant the model fixes. */
export const METRES_PER_DEGREE_LAT = 111320;

export const MIN_RADIUS_M = 40;
export const MAX_RADIUS_M = 150;

/** Target arc, in metres, between neighbouring addresses on one road. */
export const TARGET_ARC_M = 25;

/** A `[latitude, longitude]` pair, the compact artifact shape of 3.2. */
export type LatLon = [number, number];

/**
 * Ring radius for a road carrying `n` distinct addresses.
 *
 * The unclamped radius keeps neighbours roughly `TARGET_ARC_M` apart; the
 * clamp keeps a two-address road from collapsing below marker separation and
 * a large road from spreading wider than a plausible street segment.
 */
export function ringRadiusM(n: number): number {
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, (TARGET_ARC_M * n) / (2 * Math.PI)));
}

/**
 * The display point of address index `i` of `n` on the road anchored at
 * `anchor`.
 *
 * A lone address returns the anchor itself, unchanged, so a road with one
 * address carries no invented spread at all.
 */
export function ringOffset(anchor: LatLon, i: number, n: number): LatLon {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`ring size must be a positive integer, received ${n}`);
  }
  if (!Number.isInteger(i) || i < 0 || i >= n) {
    throw new Error(`ring index ${i} is outside a ring of ${n}`);
  }
  if (n === 1) {
    return [anchor[0], anchor[1]];
  }

  const [lat, lon] = anchor;
  const r = ringRadiusM(n);
  const theta = (2 * Math.PI * i) / n;

  const dLat = (r * Math.cos(theta)) / METRES_PER_DEGREE_LAT;
  const dLon =
    (r * Math.sin(theta)) / (METRES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));

  return [lat + dLat, lon + dLon];
}
