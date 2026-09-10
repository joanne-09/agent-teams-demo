import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Raw text of the committed dataset, UTF-8 BOM included. */
export function readReportCsv(): string {
  const url = new URL('../../data/suspicuous_shops_data.csv', import.meta.url);
  return readFileSync(fileURLToPath(url), 'utf8');
}
