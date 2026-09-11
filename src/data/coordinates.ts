import type { LatLon } from '../geo/offset';
import type { LocationGroup } from './locations';
import rawArtifact from './address-coordinates.json';

/**
 * The committed coordinate lookup (specification 3.2).
 *
 * This module is the whole positioning code path of the running application:
 * it reads a committed JSON file and nothing else. There is deliberately no
 * geocoding client here, which is what makes "no runtime request resolves an
 * address to a coordinate" true by construction rather than by discipline.
 *
 * Regeneration is a deliberate act: `npm run generate:coordinates`.
 */
export interface CoordinateArtifact {
  /** ISO date the artifact was generated. */
  generatedAt: string;
  /** Provenance of the road anchors, shown in the UI as a positioning note. */
  source: string;
  /** The offset model the address points were derived with. */
  offset: { model: string; minRadiusM: number; maxRadiusM: number };
  /** Road key -> geocoded anchor. */
  roads: Record<string, LatLon>;
  /** Exact `特店地址` -> display point. */
  addresses: Record<string, LatLon>;
}

/**
 * A JSON import types a coordinate as `number[]`, which loses the arity the
 * rest of the code depends on. Narrow it once, here, and fail loudly on a
 * malformed artifact rather than letting an `undefined` longitude reach a
 * marker.
 */
function toLatLon(pair: number[], label: string): LatLon {
  const [lat, lon] = pair;
  if (pair.length !== 2 || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`coordinate artifact entry ${label} is not a [lat, lon] pair`);
  }
  return [lat as number, lon as number];
}

function toLatLonMap(source: Record<string, number[]>, kind: string): Record<string, LatLon> {
  return Object.fromEntries(
    Object.entries(source).map(([key, pair]) => [key, toLatLon(pair, `${kind} ${key}`)]),
  );
}

export const ARTIFACT: CoordinateArtifact = {
  generatedAt: rawArtifact.generatedAt,
  source: rawArtifact.source,
  offset: rawArtifact.offset,
  roads: toLatLonMap(rawArtifact.roads, 'road'),
  addresses: toLatLonMap(rawArtifact.addresses, 'address'),
};

/** A location that the lookup could place. */
export type PlacedLocation = LocationGroup & { coordinate: LatLon };

export interface PlacementResult {
  placed: PlacedLocation[];
  /**
   * Locations absent from the artifact. Never silently dropped: the page is
   * required to display this count so a reader can tell "not shown" from
   * "not reported".
   */
  unplaceable: LocationGroup[];
}

/**
 * The display point of an exact `特店地址`, or `undefined` if the artifact
 * does not carry it. Lookup is by exact string, so two merchants at one
 * address are always exactly coincident.
 */
export function coordinateOf(address: string): LatLon | undefined {
  const point = ARTIFACT.addresses[address];
  return point === undefined ? undefined : [point[0], point[1]];
}

/** Split locations into those the artifact places and those it cannot. */
export function placeLocations(locations: LocationGroup[]): PlacementResult {
  const placed: PlacedLocation[] = [];
  const unplaceable: LocationGroup[] = [];

  for (const location of locations) {
    const coordinate = coordinateOf(location.address);
    if (coordinate === undefined) {
      unplaceable.push(location);
    } else {
      placed.push({ ...location, coordinate });
    }
  }

  return { placed, unplaceable };
}
