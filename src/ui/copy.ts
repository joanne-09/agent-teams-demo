/**
 * Every visible string on the page, in Traditional Chinese (AC-8).
 *
 * Copy lives in one module so "is every visible string Traditional Chinese"
 * is a question a test can answer, rather than a review of scattered literals.
 */
export const COPY = {
  documentTitle: '模擬可疑特店通報地圖',
  simulatedDataDisclaimer:
    '模擬資料：本頁所有通報與特店資料皆為模擬產生，並非真實案件，不得作為任何判斷或指控的依據。',
  approximationNotice:
    '位置說明：圖上的位置為道路層級的近似位置，並非確切的門牌或建築物座標，請勿以此推斷特定店家的實際位置。',
  displayedReportsLabel: '顯示通報數',
  unplaceableLabel: '無法定位地點數',
  displayedLocationsLabel: '顯示地點數',
  legendTitle: '圖例',
  legendShared: '共用地址：同一地址登記多家特店',
  legendSingle: '單一特店地址',
  legendSize: '圓圈越大代表該地點的通報數越多',
  tileAttribution: '圖磚來源：OpenStreetMap 貢獻者',
  tileUnavailable: '目前無法載入地圖圖磚，通報標記與說明仍照常顯示。',
  loading: '資料載入中……',
  loadFailed: '通報資料載入失敗，請確認資料檔是否存在。',
  sharedMarkerPrefix: '共用地址',
  singleMarkerPrefix: '單一地址',
  reportsUnit: '筆通報',
  merchantsUnit: '家特店',
} as const;

/**
 * The only copy keys allowed to contain Latin letters. The OpenStreetMap tile
 * usage policy requires the project be named in the attribution, and a
 * translated name would not identify it.
 */
export const LATIN_ALLOWED_KEYS: string[] = ['tileAttribution'];
