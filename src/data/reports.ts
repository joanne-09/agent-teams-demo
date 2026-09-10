import Papa from 'papaparse';

/**
 * The 25 columns of `data/suspicuous_shops_data.csv`, in file order.
 * Declared once so a schema drift fails a test rather than a rendered page.
 */
export const REPORT_COLUMNS = [
  '通報ID',
  '三支業者通報時間',
  '特店名稱',
  '特店統一編號',
  '特店地址',
  '特店電話',
  '特店註冊日期',
  '特店網址',
  '三支業者通報案由',
  '三支業者示警',
  '執法機構處理狀態',
  '三支業者聯絡人',
  '三支通報業者',
  '特店成立至通報天數',
  '跨業者通報數',
  '是否跨業者重複通報',
  '是否節慶高風險期間',
  '節慶／消費檔期名稱',
  '距節慶中心日天數',
  '關聯群組',
  '共用地址群組',
  '共用電話群組',
  '共用網址群組',
  '建議綜合風險分數',
  '資料性質',
] as const;

export type ReportColumn = (typeof REPORT_COLUMNS)[number];

/** One filing by one provider. Every cell is kept as text; empty means absent. */
export type Report = Record<ReportColumn, string>;

export interface ParsedReports {
  rows: Report[];
  fields: string[];
}

/**
 * Parse the report CSV. A leading UTF-8 BOM is stripped before parsing so the
 * first header does not become `\uFEFF通報ID` and silently break every lookup
 * of `通報ID`.
 */
export function parseReports(csvText: string): ParsedReports {
  const withoutBom = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;

  const parsed = Papa.parse<Report>(withoutBom, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = parsed.meta.fields ?? [];
  const missing = REPORT_COLUMNS.filter((column) => !fields.includes(column));
  if (missing.length > 0) {
    throw new Error(`report CSV is missing expected columns: ${missing.join(', ')}`);
  }

  return { rows: parsed.data, fields };
}
