import { describe, expect, it } from 'vitest';
import { COPY, LATIN_ALLOWED_KEYS } from '../src/ui/copy';

/**
 * Characters whose Traditional counterpart this UI uses. Any of them appearing
 * in visible copy means a Simplified string slipped in (AC-8).
 */
const SIMPLIFIED_ONLY = [...'号资数显点图说并实际产术无为与页类处别单请击详细险张个来这样运营点'];

describe('UI copy', () => {
  it('is Traditional Chinese everywhere except the required OSM attribution', () => {
    for (const [key, text] of Object.entries(COPY)) {
      expect(text, `${key} must contain Han characters`).toMatch(/[\u4e00-\u9fff]/);

      if (!LATIN_ALLOWED_KEYS.includes(key)) {
        expect(text, `${key} must not contain Latin letters`).not.toMatch(/[A-Za-z]/);
      }
    }
  });

  it('uses no Simplified Chinese characters', () => {
    for (const [key, text] of Object.entries(COPY)) {
      for (const char of SIMPLIFIED_ONLY) {
        expect(text.includes(char), `${key} contains Simplified ${char}`).toBe(false);
      }
    }
  });

  it('carries the simulated-data disclaimer and the road-level approximation notice', () => {
    expect(COPY.simulatedDataDisclaimer).toContain('模擬資料');
    expect(COPY.approximationNotice).toContain('道路');
    expect(COPY.tileAttribution).toContain('OpenStreetMap');
    expect(LATIN_ALLOWED_KEYS).toEqual(['tileAttribution']);
  });
});
