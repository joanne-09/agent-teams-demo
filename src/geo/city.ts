import type { LocationGroup } from '../data/locations';

/**
 * The city token of an exact address: the leading two or three characters
 * ending in 市 or 縣.
 *
 * `台南市中西區民生路二段5號3樓` -> `台南市`
 *
 * The set of cities is never hardcoded. The header and the map extent are
 * claims about the data that is actually loaded, so both are derived from it.
 */
export function cityOf(address: string): string | undefined {
  return address.match(/^.{1,2}[市縣]/)?.[0];
}

/** Every city present in the given locations, in first-seen-sorted order. */
export function citiesOf(locations: LocationGroup[]): string[] {
  const cities = new Set<string>();
  for (const location of locations) {
    const city = cityOf(location.address);
    if (city !== undefined) {
      cities.add(city);
    }
  }
  return [...cities].sort();
}
