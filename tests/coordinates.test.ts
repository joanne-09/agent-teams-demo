import { describe, expect, it } from 'vitest';
import { parseReports } from '../src/data/reports';
import { groupLocations } from '../src/data/locations';
import { ARTIFACT, coordinateOf, placeLocations } from '../src/data/coordinates';
import { MAX_RADIUS_M, MIN_RADIUS_M, ringOffset } from '../src/geo/offset';
import { roadKeyOf } from '../src/geo/roadKey';
import { distanceMetres } from './helpers/distance';
import { readReportCsv } from './helpers/fixtures';

const { rows } = parseReports(readReportCsv());
const locations = groupLocations(rows);

/** Taiwan, generously bounded. A sign flip or a swapped pair leaves it. */
const TAIWAN = { minLat: 21.8, maxLat: 25.4, minLon: 119.9, maxLon: 122.1 };

describe('committed coordinate lookup', () => {
  it('resolves all 87 distinct addresses to coordinates and reports 0 unplaceable', () => {
    const { placed, unplaceable } = placeLocations(locations);

    expect(unplaceable).toEqual([]);
    expect(placed).toHaveLength(87);
    expect(placed.reduce((total, l) => total + l.reports.length, 0)).toBe(612);

    // Every address in the data is in the artifact, and vice versa: an
    // artifact carrying a stale address is as wrong as one missing a live one.
    const fromData = [...new Set(rows.map((r) => r.特店地址))].sort();
    expect(Object.keys(ARTIFACT.addresses).sort()).toEqual(fromData);
    expect(Object.keys(ARTIFACT.roads).sort()).toEqual([...new Set(fromData.map(roadKeyOf))].sort());

    for (const location of placed) {
      const [lat, lon] = location.coordinate;
      expect(Number.isFinite(lat) && Number.isFinite(lon), location.address).toBe(true);
      expect(lat).toBeGreaterThan(TAIWAN.minLat);
      expect(lat).toBeLessThan(TAIWAN.maxLat);
      expect(lon).toBeGreaterThan(TAIWAN.minLon);
      expect(lon).toBeLessThan(TAIWAN.maxLon);
    }
  });

  it('assigns identical coordinates to every merchant sharing one exact address', () => {
    const shared = placeLocations(locations).placed.filter((l) => l.shared);
    expect(shared).toHaveLength(5);

    for (const location of shared) {
      expect(location.merchants).toHaveLength(7);
      for (const merchant of location.merchants) {
        for (const report of merchant.reports) {
          // Resolved independently from the report's own address text, so the
          // coincidence is a property of the lookup, not of the grouping.
          expect(coordinateOf(report.特店地址), merchant.統一編號).toEqual(location.coordinate);
        }
      }
    }
  });

  it('separates distinct addresses on one road by at least 20 metres', () => {
    const byRoad = new Map<string, { address: string; coordinate: [number, number] }[]>();
    for (const location of placeLocations(locations).placed) {
      const bucket = byRoad.get(location.roadKey) ?? [];
      bucket.push({ address: location.address, coordinate: location.coordinate });
      byRoad.set(location.roadKey, bucket);
    }
    expect(byRoad.size).toBe(12);

    let pairsChecked = 0;
    for (const [road, entries] of byRoad) {
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          const gap = distanceMetres(entries[i]!.coordinate, entries[j]!.coordinate);
          expect(gap, `${road}: ${entries[i]!.address} vs ${entries[j]!.address}`).toBeGreaterThanOrEqual(20);
          pairsChecked += 1;
        }
      }
    }
    // Every pair on a multi-address road: roads of 19, 13, 11, 11, 10, 8, 7
    // and 4 addresses contribute C(n, 2) pairs each, 459 in total.
    expect(pairsChecked).toBe(459);
  });

  it('derives every committed address point from its road anchor by the specified ring model', () => {
    const addressesByRoad = new Map<string, string[]>();
    for (const address of Object.keys(ARTIFACT.addresses)) {
      const road = roadKeyOf(address);
      addressesByRoad.set(road, [...(addressesByRoad.get(road) ?? []), address]);
    }

    for (const [road, addresses] of addressesByRoad) {
      const anchor = ARTIFACT.roads[road];
      expect(anchor, road).toBeDefined();
      // Unicode code point order is what the offset model indexes against.
      const sorted = [...addresses].sort();
      sorted.forEach((address, i) => {
        expect(ARTIFACT.addresses[address], address).toEqual(ringOffset(anchor!, i, sorted.length));
      });
    }

    expect(ARTIFACT.offset).toEqual({ model: 'ring', minRadiusM: MIN_RADIUS_M, maxRadiusM: MAX_RADIUS_M });
    // A road with one address must sit exactly on its anchor, un-offset.
    for (const [road, addresses] of addressesByRoad) {
      if (addresses.length === 1) {
        expect(ARTIFACT.addresses[addresses[0]!]).toEqual(ARTIFACT.roads[road]);
      }
    }
  });
});
