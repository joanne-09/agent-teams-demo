import { describe, expect, it } from 'vitest';
import { MAX_RADIUS_M, MIN_RADIUS_M, ringOffset, ringRadiusM } from '../src/geo/offset';
import { distanceMetres } from './helpers/distance';

const ANCHOR: [number, number] = [22.9968258, 120.1916173];

describe('ring offset model', () => {
  it('places a lone address on its road anchor exactly', () => {
    expect(ringOffset(ANCHOR, 0, 1)).toEqual(ANCHOR);
  });

  it('clamps the ring radius between 40 and 150 metres', () => {
    expect(ringRadiusM(2)).toBe(MIN_RADIUS_M);
    expect(ringRadiusM(19)).toBeCloseTo((25 * 19) / (2 * Math.PI), 6);
    expect(ringRadiusM(1000)).toBe(MAX_RADIUS_M);
  });

  it('puts every point of a ring at the ring radius from the anchor', () => {
    const n = 19;
    for (let i = 0; i < n; i += 1) {
      expect(distanceMetres(ANCHOR, ringOffset(ANCHOR, i, n))).toBeCloseTo(ringRadiusM(n), 0);
    }
  });

  it('is deterministic: the same index and count give the same point', () => {
    expect(ringOffset(ANCHOR, 3, 11)).toEqual(ringOffset(ANCHOR, 3, 11));
  });

  it('keeps neighbouring ring points at least 20 metres apart for every road size', () => {
    for (let n = 2; n <= 40; n += 1) {
      const gap = distanceMetres(ringOffset(ANCHOR, 0, n), ringOffset(ANCHOR, 1, n));
      expect(gap, `n=${n}`).toBeGreaterThan(20);
    }
  });

  it('rejects an index outside the ring', () => {
    expect(() => ringOffset(ANCHOR, 5, 5)).toThrow();
    expect(() => ringOffset(ANCHOR, -1, 5)).toThrow();
  });
});
