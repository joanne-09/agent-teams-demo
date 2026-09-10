import type { LatLon } from '../geo/offset';
import type { PlacedLocation } from '../data/coordinates';
import { COPY } from '../ui/copy';

/** Applied to a location where more than one distinct 特店統一編號 registers. */
export const SHARED_CLASS = 'marker-shared';
/** Applied to a location carrying a single merchant. */
export const SINGLE_CLASS = 'marker-single';

const BASE_RADIUS_PX = 5;
const RADIUS_PER_SQRT_REPORT_PX = 2.2;
const MAX_RADIUS_PX = 24;

/**
 * One rendered marker. This is a plain description rather than a Leaflet
 * object so the whole of AC-3 — one marker per exact address, shared markers
 * visually distinct, size encoding report count — is testable without a map.
 */
export interface MarkerSpec {
  address: string;
  coordinate: LatLon;
  reportCount: number;
  merchantCount: number;
  shared: boolean;
  radiusPx: number;
  className: string;
  label: string;
}

/**
 * Marker radius for a location carrying `reportCount` reports.
 *
 * Square root, so the *area* of the circle grows with the count: a reader
 * compares areas, and a linear radius would exaggerate a busy location by its
 * square. Strictly increasing below the cap, which is what makes the size a
 * readable encoding rather than decoration.
 */
export function markerRadiusPx(reportCount: number): number {
  return Math.min(
    MAX_RADIUS_PX,
    BASE_RADIUS_PX + RADIUS_PER_SQRT_REPORT_PX * Math.sqrt(reportCount),
  );
}

function labelOf(location: PlacedLocation): string {
  const kind = location.shared ? COPY.sharedMarkerPrefix : COPY.singleMarkerPrefix;
  return `${kind}：${location.address}（${location.merchants.length}${COPY.merchantsUnit}、${location.reports.length}${COPY.reportsUnit}）`;
}

/**
 * One marker per placed location, never per merchant and never per road.
 *
 * Because a location is one exact `特店地址`, merchants sharing an address
 * collapse to one marker while two addresses on one road stay two markers.
 */
export function buildMarkers(placed: readonly PlacedLocation[]): MarkerSpec[] {
  return placed.map((location) => ({
    address: location.address,
    coordinate: [location.coordinate[0], location.coordinate[1]],
    reportCount: location.reports.length,
    merchantCount: location.merchants.length,
    shared: location.shared,
    radiusPx: markerRadiusPx(location.reports.length),
    className: location.shared ? SHARED_CLASS : SINGLE_CLASS,
    label: labelOf(location),
  }));
}
