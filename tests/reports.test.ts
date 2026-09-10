import { describe, expect, it } from 'vitest';
import { REPORT_COLUMNS, parseReports } from '../src/data/reports';
import { readReportCsv } from './helpers/fixtures';

describe('report parsing', () => {
  it('parses 612 rows with 25 columns and strips the UTF-8 BOM', () => {
    const csv = readReportCsv();
    expect(csv.charCodeAt(0)).toBe(0xfeff);

    const { rows, fields } = parseReports(csv);

    expect(rows).toHaveLength(612);
    expect(fields).toHaveLength(25);
    expect(fields).toEqual([...REPORT_COLUMNS]);
    expect(fields[0]).toBe('通報ID');
    expect(fields[0]?.charCodeAt(0)).not.toBe(0xfeff);

    for (const row of rows) {
      expect(Object.keys(row)).toHaveLength(25);
    }
    expect(rows[0]?.通報ID).toBe('R00001');
    expect(rows[0]?.特店地址).toBe('桃園市桃園區中正路22號2樓');
  });
});
