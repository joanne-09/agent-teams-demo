import { describe, expect, it } from 'vitest';
import { parseReports } from '../src/data/reports';
import { groupLocations } from '../src/data/locations';
import { placeLocations } from '../src/data/coordinates';
import { buildMarkers, markerRadiusPx, SHARED_CLASS, SINGLE_CLASS } from '../src/map/markers';
import { cityOf } from '../src/geo/city';
import { readReportCsv } from './helpers/fixtures';

const { rows } = parseReports(readReportCsv());
const { placed } = placeLocations(groupLocations(rows));
const markers = buildMarkers(placed);

describe('marker construction', () => {
  it('renders each of the 87 locations as exactly one marker carrying all 612 reports', () => {
    expect(markers).toHaveLength(87);
    expect(new Set(markers.map((m) => m.address)).size).toBe(87);
    expect(markers.reduce((total, m) => total + m.reportCount, 0)).toBe(612);
  });

  it('places markers in all seven cities present in the data', () => {
    const cities = new Set(markers.map((m) => cityOf(m.address)));

    expect([...cities].sort()).toEqual(
      ['台中市', '台北市', '台南市', '新北市', '新竹市', '桃園市', '高雄市'].sort(),
    );
  });

  it('keeps two distinct addresses on one road as two separate markers', () => {
    const minsheng = markers.filter((m) => m.address.startsWith('台南市中西區民生路二段'));

    expect(minsheng).toHaveLength(19);
    expect(new Set(minsheng.map((m) => `${m.coordinate[0]},${m.coordinate[1]}`)).size).toBe(19);
  });

  it('marks shared locations with a distinct class from unshared ones', () => {
    const shared = markers.filter((m) => m.shared);

    expect(shared).toHaveLength(5);
    expect(SHARED_CLASS).not.toBe(SINGLE_CLASS);
    for (const marker of shared) {
      expect(marker.className).toBe(SHARED_CLASS);
      expect(marker.merchantCount).toBe(7);
    }
    for (const marker of markers.filter((m) => !m.shared)) {
      expect(marker.className).toBe(SINGLE_CLASS);
    }
  });

  it('encodes report count in marker radius, strictly increasing over the data range', () => {
    const counts = [...new Set(markers.map((m) => m.reportCount))].sort((a, b) => a - b);
    expect(counts.length).toBeGreaterThan(1);

    for (let i = 1; i < counts.length; i += 1) {
      expect(markerRadiusPx(counts[i])).toBeGreaterThan(markerRadiusPx(counts[i - 1]));
    }

    for (const marker of markers) {
      expect(marker.radiusPx).toBe(markerRadiusPx(marker.reportCount));
    }
  });

  it('labels every marker in Traditional Chinese without Latin letters', () => {
    for (const marker of markers) {
      expect(marker.label).toMatch(/[\u4e00-\u9fff]/);
      expect(marker.label).not.toMatch(/[A-Za-z]/);
    }
  });
});
