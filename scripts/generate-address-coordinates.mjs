#!/usr/bin/env node
/**
 * Build-time generator for `src/data/address-coordinates.json`
 * (specification 3.2).
 *
 * Run by hand when the address set changes:
 *
 *     npm run generate:coordinates
 *
 * It is deliberately NOT wired into `install`, `dev`, `build`, or `test`, so
 * the application contains no address-to-coordinate code path at all and a
 * clean clone can be verified with no network access and no API key.
 *
 * What it does:
 *   1. reads every distinct `特店地址` from the committed CSV;
 *   2. truncates each at its first digit to get the road key, the only
 *      granularity this dataset's synthetic house numbers can resolve at;
 *   3. geocodes the road keys against OSM Nominatim, one request at a time,
 *      at least 1 second apart, as its usage policy requires;
 *   4. spreads the addresses of each road around a ring on its anchor.
 *
 * The ring formula below is the same model as `src/geo/offset.ts`. A `.mjs`
 * script cannot import the TypeScript module, so the two are bound instead by
 * `tests/coordinates.test.ts`, which re-derives every committed point with
 * the TypeScript implementation and fails on any drift.
 *
 * Flags:
 *   --anchors <file>  read road anchors from a JSON file instead of the
 *                     network; still cross-checked against the CSV road set.
 *   --out <file>      artifact path (default src/data/address-coordinates.json)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSV_PATH = resolve(ROOT, 'data/suspicuous_shops_data.csv');
const DEFAULT_OUT = resolve(ROOT, 'src/data/address-coordinates.json');

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'suspicious-merchant-map/0.1 (build-time road geocoder; run by hand)';
const MIN_INTERVAL_MS = 1100; // Nominatim policy: at most 1 request per second.
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;

const MIN_RADIUS_M = 40;
const MAX_RADIUS_M = 150;
const TARGET_ARC_M = 25;
const METRES_PER_DEGREE_LAT = 111320;

/** Taiwan, generously bounded: a match outside it is a geocoder error. */
const TAIWAN = { minLat: 21.8, maxLat: 25.4, minLon: 119.9, maxLon: 122.1 };

function log(message) {
  process.stdout.write(message + '\n');
}

function parseArgs(argv) {
  const args = { anchors: null, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--anchors') {
      i += 1;
      args.anchors = resolve(process.cwd(), argv[i]);
    } else if (argv[i] === '--out') {
      i += 1;
      args.out = resolve(process.cwd(), argv[i]);
    } else {
      throw new Error('unknown argument: ' + argv[i]);
    }
  }
  return args;
}

/**
 * Minimal RFC 4180 reader. The generator refuses to depend on the app's
 * runtime parser so a bug there cannot silently reshape the artifact.
 */
function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((value) => value !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (quoted) {
      if (c !== '"') {
        field += c;
      } else if (source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = false;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      endField();
    } else if (c === '\n') {
      endRow();
    } else if (c === '\r') {
      if (source[i + 1] === '\n') i += 1;
      endRow();
    } else {
      field += c;
    }
  }
  endRow();

  const header = rows[0];
  return rows.slice(1).map((values) =>
    Object.fromEntries(header.map((name, i) => [name, values[i] === undefined ? '' : values[i]])),
  );
}

/** Everything before the first digit: `...民生路二段5號3樓` -> `...民生路二段`. */
function roadKeyOf(address) {
  const match = /[0-9]/.exec(address);
  return match ? address.slice(0, match.index) : address;
}

function ringRadiusM(n) {
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, (TARGET_ARC_M * n) / (2 * Math.PI)));
}

function ringOffset(anchor, i, n) {
  if (n === 1) return [anchor[0], anchor[1]];
  const lat = anchor[0];
  const lon = anchor[1];
  const r = ringRadiusM(n);
  const theta = (2 * Math.PI * i) / n;
  return [
    lat + (r * Math.cos(theta)) / METRES_PER_DEGREE_LAT,
    lon + (r * Math.sin(theta)) / (METRES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180)),
  ];
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

async function geocodeRoad(road) {
  const url = new URL(NOMINATIM);
  url.searchParams.set('q', road);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'tw');
  url.searchParams.set('addressdetails', '0');

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'zh-TW' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const hits = await response.json();
      if (!Array.isArray(hits) || hits.length === 0) throw new Error('no match');
      return { lat: Number(hits[0].lat), lon: Number(hits[0].lon), matched: hits[0].display_name };
    } catch (error) {
      lastError = error;
      log('      attempt ' + attempt + '/' + MAX_ATTEMPTS + ' failed: ' + error.message);
      if (attempt < MAX_ATTEMPTS) await sleep(MIN_INTERVAL_MS * attempt);
    }
  }
  throw new Error('could not geocode ' + road + ': ' + (lastError ? lastError.message : 'unknown'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  log('reading ' + CSV_PATH);
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const addresses = [...new Set(rows.map((r) => r['特店地址']))].sort();
  const roads = [...new Set(addresses.map(roadKeyOf))].sort();
  log('  ' + rows.length + ' reports, ' + addresses.length + ' distinct addresses, ' + roads.length + ' roads');

  const anchors = {};

  if (args.anchors) {
    log('reading road anchors from ' + args.anchors + ' (no network)');
    const seed = JSON.parse(readFileSync(args.anchors, 'utf8'));
    for (const road of roads) {
      const value = seed[road];
      if (!value) throw new Error('anchors file has no entry for road ' + road);
      const pair = Array.isArray(value) ? value : [value.lat, value.lon];
      anchors[road] = [Number(pair[0]), Number(pair[1])];
    }
  } else {
    log('geocoding ' + roads.length + ' road anchors against Nominatim, >=1s apart');
    for (let index = 0; index < roads.length; index += 1) {
      const road = roads[index];
      if (index > 0) await sleep(MIN_INTERVAL_MS);
      process.stdout.write('  [' + (index + 1) + '/' + roads.length + '] ' + road + ' ... ');
      const hit = await geocodeRoad(road);
      anchors[road] = [hit.lat, hit.lon];
      log(hit.lat + ', ' + hit.lon + '  (' + hit.matched + ')');
    }
  }

  for (const road of roads) {
    const lat = anchors[road][0];
    const lon = anchors[road][1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error('anchor for ' + road + ' is not numeric');
    }
    if (lat < TAIWAN.minLat || lat > TAIWAN.maxLat || lon < TAIWAN.minLon || lon > TAIWAN.maxLon) {
      throw new Error('anchor for ' + road + ' falls outside Taiwan: ' + lat + ', ' + lon);
    }
  }

  log('spreading addresses around their road anchors');
  const addressPoints = {};
  for (const road of roads) {
    const onRoad = addresses.filter((a) => roadKeyOf(a) === road).sort();
    onRoad.forEach((address, i) => {
      addressPoints[address] = ringOffset(anchors[road], i, onRoad.length);
    });
    const radius = onRoad.length === 1 ? '0' : ringRadiusM(onRoad.length).toFixed(1);
    log('  ' + road + ': ' + onRoad.length + ' address(es), radius ' + radius + ' m');
  }

  const artifact = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'OSM Nominatim, road-level',
    offset: { model: 'ring', minRadiusM: MIN_RADIUS_M, maxRadiusM: MAX_RADIUS_M },
    roads: Object.fromEntries(roads.map((road) => [road, anchors[road]])),
    addresses: Object.fromEntries(addresses.map((a) => [a, addressPoints[a]])),
  };

  writeFileSync(args.out, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
  log('wrote ' + args.out + ': ' + roads.length + ' roads, ' + addresses.length + ' addresses');
}

main().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
