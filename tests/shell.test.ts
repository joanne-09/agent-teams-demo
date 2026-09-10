// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderShell, HEADER_ID, NOTICE_ID, MAP_ID, TILE_ERROR_ID } from '../src/ui/shell';
import { COPY } from '../src/ui/copy';

const summary = {
  displayedReports: 612,
  displayedLocations: 87,
  unplaceableLocations: 0,
  unplaceableReports: 0,
};

beforeEach(() => {
  document.documentElement.lang = '';
  document.body.innerHTML = '<div id="app"></div>';
});

describe('page shell', () => {
  it('declares the document language as zh-Hant-TW', () => {
    renderShell(document.getElementById('app')!, summary);

    expect(document.documentElement.lang).toBe('zh-Hant-TW');
  });

  it('shows the simulated-data disclaimer and both counts in a persistent header', () => {
    const root = document.getElementById('app')!;
    renderShell(root, summary);
    const header = root.querySelector(`#${HEADER_ID}`)!;

    expect(header.tagName).toBe('HEADER');
    expect(header.textContent).toContain('模擬資料');
    expect(header.textContent).toContain('612');
    expect(header.textContent).toContain(COPY.displayedReportsLabel);
    expect(header.textContent).toContain(COPY.unplaceableLabel);
    expect(header.textContent).toMatch(/無法定位地點數[^0-9]*0/);
  });

  it('shows the road-level approximation notice and the tile attribution persistently', () => {
    const root = document.getElementById('app')!;
    renderShell(root, summary);

    expect(root.querySelector(`#${NOTICE_ID}`)!.textContent).toBe(COPY.approximationNotice);
    expect(root.textContent).toContain('OpenStreetMap');
  });

  it('renders the header and notices without any map tile being reachable', () => {
    const root = document.getElementById('app')!;
    renderShell(root, summary);

    // jsdom performs no network request at all, so a shell that renders here
    // is a shell that renders with the tile server unreachable.
    expect(root.querySelector(`#${HEADER_ID}`)).not.toBeNull();
    expect(root.querySelector(`#${NOTICE_ID}`)).not.toBeNull();
    expect(root.querySelector(`#${MAP_ID}`)).not.toBeNull();
    expect(root.querySelector(`#${TILE_ERROR_ID}`)!.hasAttribute('hidden')).toBe(true);
  });

  it('reports an unplaceable count truthfully when locations cannot be placed', () => {
    const root = document.getElementById('app')!;
    renderShell(root, { ...summary, displayedReports: 605, unplaceableLocations: 1, unplaceableReports: 7 });

    expect(root.querySelector(`#${HEADER_ID}`)!.textContent).toMatch(/無法定位地點數[^0-9]*1/);
  });
});
