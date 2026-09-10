import { describe, expect, it } from 'vitest';
import { parseReports } from '../src/data/reports';
import { groupLocations } from '../src/data/locations';
import { placeLocations } from '../src/data/coordinates';
import { summarize } from '../src/ui/summary';
import { readReportCsv } from './helpers/fixtures';

const { rows } = parseReports(readReportCsv());

describe('map summary', () => {
  it('counts 612 displayed reports and 0 unplaceable locations for the current CSV', () => {
    const { placed, unplaceable } = placeLocations(groupLocations(rows));
    const summary = summarize(placed, unplaceable);

    expect(summary.displayedReports).toBe(612);
    expect(summary.displayedLocations).toBe(87);
    expect(summary.unplaceableLocations).toBe(0);
    expect(summary.unplaceableReports).toBe(0);
  });

  it('counts reports that could not be placed instead of dropping them', () => {
    const locations = groupLocations(rows);
    const { placed, unplaceable } = placeLocations(locations);
    const summary = summarize(placed.slice(1), [...unplaceable, placed[0]]);

    expect(summary.unplaceableLocations).toBe(1);
    expect(summary.unplaceableReports).toBe(placed[0].reports.length);
    expect(summary.displayedReports + summary.unplaceableReports).toBe(612);
  });
});
