import type { Report } from './reports';
import { roadKeyOf } from '../geo/roadKey';

/** One business, identified by its uniform number. */
export interface Merchant {
  統一編號: string;
  名稱: string;
  reports: Report[];
}

/** One exact `特店地址`: the unit this map places and this Card positions. */
export interface LocationGroup {
  address: string;
  roadKey: string;
  merchants: Merchant[];
  reports: Report[];
  /** True when more than one distinct `特店統一編號` registers at this address. */
  shared: boolean;
}

/**
 * Group reports into locations by *exact* address.
 *
 * Shared status is computed from the merchant identifiers present at the
 * address, never read from `共用地址群組`, so the grouping stays correct if
 * the CSV gains or loses a co-located merchant (specification 3.4).
 *
 * Locations are returned sorted by address code point, matching the ordering
 * the offset model indexes against.
 */
export function groupLocations(rows: Report[]): LocationGroup[] {
  const byAddress = new Map<string, Report[]>();
  for (const row of rows) {
    const address = row.特店地址;
    const bucket = byAddress.get(address);
    if (bucket) {
      bucket.push(row);
    } else {
      byAddress.set(address, [row]);
    }
  }

  const locations: LocationGroup[] = [];
  for (const [address, reports] of byAddress) {
    const byMerchant = new Map<string, Merchant>();
    for (const report of reports) {
      const id = report.特店統一編號;
      const merchant = byMerchant.get(id);
      if (merchant) {
        merchant.reports.push(report);
      } else {
        byMerchant.set(id, { 統一編號: id, 名稱: report.特店名稱, reports: [report] });
      }
    }

    const merchants = [...byMerchant.values()].sort((a, b) =>
      a.統一編號 < b.統一編號 ? -1 : a.統一編號 > b.統一編號 ? 1 : 0,
    );

    locations.push({
      address,
      roadKey: roadKeyOf(address),
      merchants,
      reports,
      shared: merchants.length > 1,
    });
  }

  return locations.sort((a, b) => (a.address < b.address ? -1 : a.address > b.address ? 1 : 0));
}
