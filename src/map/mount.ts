import type * as Leaflet from 'leaflet';
import type { MarkerSpec } from './markers';
import { COPY } from '../ui/copy';

/** Opening view: the whole of Taiwan, so all seven cities are on screen. */
export const TAIWAN_CENTER: [number, number] = [23.75, 120.96];
export const TAIWAN_ZOOM = 7;

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_MAX_ZOOM = 19;

const SHARED_FILL = '#c2185b';
const SINGLE_FILL = '#1565c0';

/**
 * Attach the map to `container`.
 *
 * Markers are added *before* the tile layer. Tiles are a network resource and
 * the report markers are not; adding the markers first means an unreachable
 * tile server leaves a blank base map with every marker still drawn, which is
 * the behavior the specification's tile-availability risk requires.
 *
 * Leaflet is injected rather than imported so the ordering and the tile
 * failure path are testable without a rendering browser.
 */
export function mountMap(
  L: typeof Leaflet,
  container: HTMLElement,
  markers: readonly MarkerSpec[],
  onTileError: (message: string) => void,
): Leaflet.Map {
  // Leaflet's own attribution control is disabled: it prefixes an
  // untranslated "Leaflet" link, which would be the one non-Chinese string on
  // the page (AC-8), and the shell already renders the OpenStreetMap
  // attribution persistently — including when the map never mounts.
  const map = L.map(container, { attributionControl: false }).setView(
    TAIWAN_CENTER,
    TAIWAN_ZOOM,
  );

  const markerLayer = L.layerGroup();
  for (const marker of markers) {
    L.circleMarker(marker.coordinate, {
      radius: marker.radiusPx,
      className: marker.className,
      color: marker.shared ? SHARED_FILL : SINGLE_FILL,
      fillColor: marker.shared ? SHARED_FILL : SINGLE_FILL,
      fillOpacity: 0.55,
      weight: marker.shared ? 3 : 1,
    })
      .bindTooltip(marker.label)
      .addTo(markerLayer);
  }
  markerLayer.addTo(map);

  // `tileerror` fires on the tile layer, not on the map: Leaflet does not
  // forward layer events to their map, so a handler bound to the map would
  // never run and the failure notice would never appear.
  const tiles = L.tileLayer(TILE_URL, { maxZoom: TILE_MAX_ZOOM });
  tiles.on('tileerror', () => onTileError(COPY.tileUnavailable));
  tiles.addTo(map);

  return map;
}
