# Public map of the 612 simulated suspicious-merchant reports

- Card: [#1](https://github.com/joanne-09/agent-teams-demo/issues/1)
- Status: specification
- Date: 2026-09-10

## 1. Problem

`data/suspicuous_shops_data.csv` holds 612 simulated suspicious-merchant
reports but has no coordinates, and the repository has no application code. A
member of the public cannot currently see where the reports cluster or what
kind of fraud was reported.

The hard part is not drawing a map. It is that the data carries several
different notions of "same place", and a naive map destroys the distinction
between them:

| Level | Count | Meaning |
|---|---|---|
| Report (`通報ID`) | 612 | one filing by one provider |
| Merchant (`特店統一編號`) | 117 | one business |
| Exact address (`特店地址`) | 87 | one building or floor |
| Road (address truncated at first digit) | 12 | one street segment |

Only the 12 road keys are geocodable (see 3.1). Placing merchants at road
granularity renders 612 records as 12 pins and asserts a co-location the data
does not support, visually indistinguishable from the genuine shared-address
fraud signal.

## 2. Scope and non-goals

### In scope

A static, client-side, locally run web page that maps all 612 reports, lets a
visitor filter them, inspect the merchants at a location, and understand both
the simulated nature of the data and the imprecision of the positions.

### Non-goals

Carried from Card #1 and binding:

- **No deployment.** Success is `npm install` plus a documented dev command.
  No hosting, no GitHub Pages, no public URL.
- No backend, database, or authentication.
- No editing, uploading, or annotating data. The page is read-only.
- No anonymization. Full merchant names are shown, with a prominent
  disclaimer.
- No time-series or trend analysis.

Added by this specification:

- **No `共用電話群組` or `共用網址群組` visualization.** This resolves Card #1
  open question 4. Those columns group merchants that are *not* co-located, so
  honouring them means drawing relationships between distant points, which is
  a different map interaction from the address grouping this Card requires and
  belongs to a later slice. Criterion 3 requires only the address grouping.
- **No TGOS integration.** See 3.1.

## 3. Design decisions

### 3.1 Positioning: committed lookup, road anchor plus deterministic offset

Resolves Card #1 open question 1.

**Decision.** Positions come from a committed lookup keyed by the *exact*
`特店地址`. Each of the 87 addresses maps to a coordinate derived from its road
anchor plus a deterministic offset.

**Rejected: TGOS 全國門牌地址定位服務.** It resolves house numbers, but requires
registration and a key, which makes the build non-reproducible for a third
party checking the acceptance criteria. Card #1 also records that these
addresses are synthetic, so house-number lookup is not expected to succeed on
them regardless of provider precision.

**Rejected: marker clustering over the 12 road points.** Clustering expresses
"markers are near each other at this zoom". It cannot express "these seven
merchants registered at one office suite", because both render as one
expandable cluster. This fails criterion 3 by construction.

**Accepted: per-address deterministic offsets.** For each road key with `n`
distinct addresses, sort those addresses by Unicode code point and assign each
an index `i` in the range 0 to n-1:

- if `n` is 1, the display point is the road anchor itself;
- otherwise, with `r = min(150, max(40, 25n / 2pi))` metres and
  `theta = 2 pi i / n`:
  - `dLat = (r * cos(theta)) / 111320`
  - `dLon = (r * sin(theta)) / (111320 * cos(lat_anchor))`

This satisfies both halves of criterion 3 without inventing precision the data
does not have:

- One exact address is one lookup entry, so every merchant at it is *exactly*
  coincident. The five shared-address groups each collapse to a single point.
- Distinct addresses on one road get distinct offsets. The worst case,
  台南市中西區民生路二段 with 19 addresses, gives `r` of about 75.6 m and about
  25 m of arc between neighbours, instead of one pin.

The spread is a claim about the road segment, not about buildings, and is
smaller than a real Taiwanese road segment. Criterion 7 requires this be
stated in the UI. It must not be presented as a surveyed position.

### 3.2 Geocoding runs at build time only, never at runtime

Resolves Card #1 open question 2.

**Decision.** A committed generator script resolves the 12 road anchors
against OSM Nominatim and writes a committed lookup artifact. The script is
**not** wired into `install`, `dev`, `build`, or `test`. It is run by hand when
the address set changes.

This satisfies criterion 1 unconditionally: the running application issues no
geocoding request because it contains no geocoding code path at all.

**Format.** The artifact must stay compact enough to review in a diff. Road
anchors and per-address points are separate maps, and each coordinate is a
two-element array rather than an object:

```json
{
  "generatedAt": "2026-09-10",
  "source": "OSM Nominatim, road-level",
  "offset": { "model": "ring", "minRadiusM": 40, "maxRadiusM": 150 },
  "roads": { "台南市中西區民生路二段": [22.9912, 120.1998] },
  "addresses": { "台南市中西區民生路二段5號3樓": [22.9915, 120.1994] }
}
```

Clarification for criterion 1: **map tiles are not a geocoding service.**
Fetching OSM raster tiles and fetching the local CSV are permitted at runtime.
Only address-to-coordinate resolution is forbidden.

### 3.3 Stack

Resolves Card #1 open question 3.

| Concern | Choice | Rationale |
|---|---|---|
| Build and dev server | Vite | `npm install` plus `npm run dev` with no further setup, matching criterion 1 |
| Language | TypeScript | the 25-column schema is worth typing once |
| Map | Leaflet with OSM raster tiles | no API key, no style JSON, no account; MapLibre GL vector tiles are keyed in practice |
| CSV | PapaParse | handles the UTF-8 BOM and quoted fields correctly |
| Tests | Vitest | CI already runs `npm test`, and `test` is the required check |

OSM tile attribution must be displayed, as the tile usage policy requires.

### 3.4 Grouping and identity

A **location** is one exact `特店地址`. A location is **shared** when it carries
more than one distinct `特店統一編號`. In this dataset that set is exactly the
five non-empty `共用地址群組` values, `ADDR-G01` through `ADDR-G05`, each being
one address with seven merchants. This was verified against the data: the set
of multi-merchant addresses equals the set of grouped addresses.

Shared status must be computed from the data rather than hardcoded to those
five identifiers, so the page stays correct if the CSV changes.

## 4. Observable behavior

1. The page opens on a map of Taiwan showing all seven cities present in the
   data: 台北市, 新北市, 桃園市, 台中市, 台南市, 高雄市, 新竹市.
2. Each of the 87 locations is one marker. A marker's appearance encodes
   whether the location is shared (3.4) and how many reports it carries.
3. A persistent header shows the 模擬資料 disclaimer, the count of reports
   currently displayed, and the count that could not be placed.
4. A persistent notice states that positions are road-level approximations.
5. Filter controls for `三支業者示警` (高, 中, 低) and `三支業者通報案由` (10
   values) update the markers.
6. Clicking a marker opens a detail panel listing every merchant at that
   location with the six required fields, and repeating the disclaimer.
7. All UI copy is Traditional Chinese, and the document declares
   `lang="zh-Hant-TW"`.

## 5. Acceptance criteria

These restate Card #1's criteria as checkable post-conditions. `AC-n`
corresponds to Card #1 criterion `n`.

- **AC-1.** From a clean clone, `npm install` followed by the command
  documented in `README.md` serves the page with no additional setup, and no
  runtime request resolves an address to a coordinate.
- **AC-2.** With no filter applied, the sum of reports across all rendered
  markers is 612. The page displays an explicit "unable to place" count, which
  reads 0 with the current CSV. No report is dropped without being counted.
- **AC-3.** The five shared addresses render as single markers that are
  visually distinct from unshared markers, and each opens to reveal its seven
  merchants. Two distinct addresses on one road render as two separate
  markers, never merged into one.
- **AC-4.** Selecting an alert level, a report reason, or both re-renders the
  markers to exactly the matching reports, and the displayed count agrees.
  Clearing the filters restores 612.
- **AC-5.** A location's detail panel shows, for each merchant there:
  `特店名稱`, `特店地址`, `三支業者通報案由`, `三支業者示警`,
  `執法機構處理狀態`, and `建議綜合風險分數`.
- **AC-6.** The 模擬資料 disclaimer is visible in the header at all times and
  appears again inside every merchant detail panel. A footer-only disclaimer
  fails this criterion.
- **AC-7.** A persistent on-screen notice states that positions are road-level
  approximations rather than exact building locations, and the same statement
  appears in the detail panel.
- **AC-8.** Every visible UI string is Traditional Chinese.
- **AC-9.** At 375 px viewport width the page has no horizontal scrolling, and
  the header, filters, and detail panel all remain operable.

## 6. Verification strategy

**Automated, through `npm test`, the required CI check.** Each test names the
behavior it checks:

- `parses 612 rows with 25 columns and strips the UTF-8 BOM` covers AC-2
- `resolves all 87 distinct addresses to coordinates and reports 0 unplaceable`
  covers AC-2
- `assigns identical coordinates to every merchant sharing one exact address`
  covers AC-3
- `separates distinct addresses on one road by at least 20 metres` covers AC-3
- `identifies exactly 5 shared locations, each with 7 merchants, from the data`
  covers AC-3
- `filtering by alert level and reason yields the matching report subset and count`
  covers AC-4

**Manual browser observation**, recorded by the implementer in the Pull
Request description: AC-1, AC-5, AC-6, AC-7, AC-8, AC-9. AC-9 is checked at
375 px viewport width.

## 7. Risks

- **`**/package.json` is a protected path** under `dependencies-and-manifests`
  in `.agent-teams/config.json`. Any Card that adds or changes dependencies
  raises the QA protected-path exception gate. This is expected rather than a
  defect, and the first Card cannot avoid it.
- **Nominatim is a build-time dependency of the generator script.** If it
  becomes unreachable or its results drift, the committed artifact remains
  valid; that is the reason for committing it. Regeneration is a deliberate
  act, never automatic.
- **OSM tile availability.** Tiles are fetched at runtime. If the tile server
  is unreachable the base map is blank, but markers, filters, and detail
  panels must still function. The page must not fail to render.
- **Offset misreading.** A viewer may read an offset point as a surveyed
  location. AC-7 is the mitigation and must not be treated as decoration.

## 8. Dependencies

- `data/suspicuous_shops_data.csv`, present and committed, 612 rows, unchanged
  by this work.
- Nothing else. This is a brand-new surface.
