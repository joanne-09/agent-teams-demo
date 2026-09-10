import type { LocationGroup } from '../data/locations';
import type { PlacedLocation } from '../data/coordinates';

/**
 * The counts the header is required to display (AC-2, AC-6).
 *
 * `unplaceable*` exists so a report that has no coordinate is *counted* rather
 * than dropped: a reader must be able to tell "not shown" from "not reported".
 */
export interface MapSummary {
  displayedReports: number;
  displayedLocations: number;
  unplaceableLocations: number;
  unplaceableReports: number;
}

function countReports(locations: readonly { reports: unknown[] }[]): number {
  return locations.reduce((total, location) => total + location.reports.length, 0);
}

export function summarize(
  placed: readonly PlacedLocation[],
  unplaceable: readonly LocationGroup[],
): MapSummary {
  return {
    displayedReports: countReports(placed),
    displayedLocations: placed.length,
    unplaceableLocations: unplaceable.length,
    unplaceableReports: countReports(unplaceable),
  };
}
