import { describe, expect, it } from 'vitest';
import { parseReports } from '../src/data/reports';
import { groupLocations } from '../src/data/locations';
import { readReportCsv } from './helpers/fixtures';

const { rows } = parseReports(readReportCsv());

describe('location grouping', () => {
  it('identifies exactly 5 shared locations, each with 7 merchants, from the data', () => {
    const locations = groupLocations(rows);

    expect(locations).toHaveLength(87);
    expect(locations.reduce((total, l) => total + l.reports.length, 0)).toBe(612);

    const shared = locations.filter((l) => l.shared);
    expect(shared).toHaveLength(5);
    for (const location of shared) {
      expect(location.merchants).toHaveLength(7);
      expect(new Set(location.merchants.map((m) => m.統一編號)).size).toBe(7);
    }

    // Shared status is derived from the data, never from the `ADDR-G0n` labels.
    // The labels are only a cross-check that the derivation agrees with the CSV.
    const derived = new Set(shared.map((l) => l.address));
    const labelled = new Set(
      rows.filter((r) => r.共用地址群組 !== '').map((r) => r.特店地址),
    );
    expect([...derived].sort()).toEqual([...labelled].sort());

    // Every unshared location carries exactly one merchant, by definition.
    for (const location of locations.filter((l) => !l.shared)) {
      expect(location.merchants).toHaveLength(1);
    }
  });

  it('groups by exact address, keeping distinct addresses on one road apart', () => {
    const locations = groupLocations(rows);
    const minshengRoad = locations.filter(
      (l) => l.roadKey === '台南市中西區民生路二段',
    );

    expect(minshengRoad).toHaveLength(19);
    expect(new Set(minshengRoad.map((l) => l.address)).size).toBe(19);
    expect(new Set(locations.map((l) => l.roadKey)).size).toBe(12);
  });
});
