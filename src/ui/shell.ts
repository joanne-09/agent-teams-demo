import { COPY } from './copy';
import type { MapSummary } from './summary';
import { SHARED_CLASS, SINGLE_CLASS } from '../map/markers';

export const HEADER_ID = 'page-header';
export const NOTICE_ID = 'approximation-notice';
export const MAP_ID = 'map';
export const TILE_ERROR_ID = 'tile-error';
export const LEGEND_ID = 'legend';

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className !== undefined) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/** A swatch and its label as one unbreakable unit, so a narrow viewport never
 *  wraps a legend colour away from the text that explains it. */
function legendItem(swatchClass: string, text: string): HTMLElement {
  const item = element('span', 'legend-item');
  item.append(element('span', `legend-swatch ${swatchClass}`));
  item.append(element('span', 'legend-text', text));
  return item;
}

function counter(label: string, value: number): HTMLElement {
  const item = element('span', 'counter');
  item.append(element('span', 'counter-label', label));
  item.append(element('span', 'counter-value', String(value)));
  return item;
}

/**
 * Build the persistent page furniture around the map: the disclaimer header
 * with both counts (AC-6), the road-level approximation notice (AC-7), the
 * legend, the tile attribution, and the map container itself.
 *
 * None of it touches the network, so it renders whether or not the tile server
 * or the report CSV is reachable. The map is a child of this shell rather than
 * its parent for the same reason.
 */
export function renderShell(root: HTMLElement, summary: MapSummary): void {
  root.ownerDocument.documentElement.lang = 'zh-Hant-TW';
  root.ownerDocument.title = COPY.documentTitle;
  root.replaceChildren();

  const header = element('header', 'page-header');
  header.id = HEADER_ID;
  header.append(element('h1', 'page-title', COPY.documentTitle));
  header.append(element('p', 'disclaimer', COPY.simulatedDataDisclaimer));

  const counts = element('div', 'counters');
  counts.append(counter(COPY.displayedReportsLabel, summary.displayedReports));
  counts.append(counter(COPY.displayedLocationsLabel, summary.displayedLocations));
  counts.append(counter(COPY.unplaceableLabel, summary.unplaceableLocations));
  header.append(counts);
  root.append(header);

  const notice = element('p', 'notice', COPY.approximationNotice);
  notice.id = NOTICE_ID;
  root.append(notice);

  const tileError = element('p', 'notice notice-error');
  tileError.id = TILE_ERROR_ID;
  tileError.hidden = true;
  root.append(tileError);

  const legend = element('div', 'legend');
  legend.id = LEGEND_ID;
  legend.append(element('span', 'legend-title', COPY.legendTitle));
  legend.append(legendItem(SHARED_CLASS, COPY.legendShared));
  legend.append(legendItem(SINGLE_CLASS, COPY.legendSingle));
  legend.append(element('span', 'legend-text', COPY.legendSize));
  root.append(legend);

  const map = element('div', 'map');
  map.id = MAP_ID;
  root.append(map);

  root.append(element('footer', 'attribution', COPY.tileAttribution));
}

/** Reveal the tile failure notice without disturbing anything already drawn. */
export function showTileError(root: ParentNode, message: string): void {
  const node = root.querySelector<HTMLElement>(`#${TILE_ERROR_ID}`);
  if (node !== null) {
    node.textContent = message;
    node.hidden = false;
  }
}
