import { describe, expect, it, vi } from 'vitest';
import { mountMap, TAIWAN_CENTER, TAIWAN_ZOOM } from '../src/map/mount';
import type { MarkerSpec } from '../src/map/markers';
import { COPY } from '../src/ui/copy';

const markers: MarkerSpec[] = [
  {
    address: '台南市中西區民生路二段5號3樓',
    coordinate: [22.9915, 120.1994],
    reportCount: 7,
    merchantCount: 7,
    shared: true,
    radiusPx: 11,
    className: 'marker-shared',
    label: '共用地址，通報數 7',
  },
];

function fakeLeaflet() {
  const order: string[] = [];
  const map = {
    setView: vi.fn((_center: [number, number], _zoom: number) => map),
    on: vi.fn((_event: string, _handler: () => void) => map),
    addLayer: vi.fn((_layer: unknown) => map),
  };
  const layer = {
    addTo: vi.fn((_target: unknown) => layer),
    bindTooltip: vi.fn((_text: string) => layer),
    on: vi.fn((_event: string, _handler: () => void) => layer),
  };
  const L = {
    map: vi.fn((_container: unknown, _options?: Record<string, unknown>) => {
      order.push('map');
      return map;
    }),
    tileLayer: vi.fn((_url: string, _options: Record<string, unknown>) => {
      order.push('tileLayer');
      return layer;
    }),
    circleMarker: vi.fn((_latlon: [number, number], _options: Record<string, unknown>) => {
      order.push('circleMarker');
      return layer;
    }),
    layerGroup: vi.fn(() => {
      order.push('layerGroup');
      return layer;
    }),
  };
  return { L, map, layer, order };
}

describe('map mounting', () => {
  it('opens on Taiwan', () => {
    const { L, map } = fakeLeaflet();
    mountMap(L as never, {} as never, markers, () => {});

    expect(map.setView).toHaveBeenCalledWith(TAIWAN_CENTER, TAIWAN_ZOOM);
  });

  it('adds markers before the tile layer so an unreachable tile server cannot block them', () => {
    const { L, order } = fakeLeaflet();
    mountMap(L as never, {} as never, markers, () => {});

    expect(order.indexOf('circleMarker')).toBeLessThan(order.indexOf('tileLayer'));
  });

  it('requests OpenStreetMap raster tiles', () => {
    const { L } = fakeLeaflet();
    mountMap(L as never, {} as never, markers, () => {});

    const [url] = L.tileLayer.mock.calls[0];
    expect(url).toContain('openstreetmap.org');
  });

  it("suppresses Leaflet's own attribution control, which the shell replaces", () => {
    const { L } = fakeLeaflet();
    mountMap(L as never, {} as never, markers, () => {});

    const [, options] = L.map.mock.calls[0];
    expect(options?.attributionControl).toBe(false);
  });

  it('creates one circle marker per spec, styled by its class and radius', () => {
    const { L } = fakeLeaflet();
    mountMap(L as never, {} as never, markers, () => {});

    expect(L.circleMarker).toHaveBeenCalledTimes(1);
    const [latlon, options] = L.circleMarker.mock.calls[0];
    expect(latlon).toEqual(markers[0].coordinate);
    expect(options.radius).toBe(markers[0].radiusPx);
    expect(options.className).toBe(markers[0].className);
  });

  it('binds the tile failure handler to the tile layer, which is what fires it', () => {
    const { L, map, layer } = fakeLeaflet();
    const onTileError = vi.fn();
    mountMap(L as never, {} as never, markers, onTileError);

    // Leaflet does not forward layer events to the map, so a `tileerror`
    // handler on the map is a handler that never runs.
    expect(map.on.mock.calls.some(([event]) => event === 'tileerror')).toBe(false);

    const handler = layer.on.mock.calls.find(([event]) => event === 'tileerror')?.[1];
    expect(handler).toBeTypeOf('function');
    handler?.();

    expect(onTileError).toHaveBeenCalledWith(COPY.tileUnavailable);
  });
});
