import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import csvUrl from '../data/suspicuous_shops_data.csv?url';

import { parseReports } from './data/reports';
import { groupLocations } from './data/locations';
import { placeLocations } from './data/coordinates';
import { buildMarkers } from './map/markers';
import { mountMap } from './map/mount';
import { summarize } from './ui/summary';
import { renderShell, showTileError, MAP_ID } from './ui/shell';
import { COPY } from './ui/copy';

/**
 * Wiring only.
 *
 * The one network request this module makes is for the local report CSV. There
 * is deliberately no address-to-coordinate call anywhere in the runtime graph:
 * positions come from the committed artifact through `placeLocations`
 * (specification 3.2, AC-1).
 */
async function start(root: HTMLElement): Promise<void> {
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`report CSV request failed with ${response.status}`);
  }

  const { rows } = parseReports(await response.text());
  const { placed, unplaceable } = placeLocations(groupLocations(rows));

  renderShell(root, summarize(placed, unplaceable));

  const container = root.querySelector<HTMLElement>(`#${MAP_ID}`);
  if (container === null) {
    throw new Error('map container missing from the rendered shell');
  }
  mountMap(L, container, buildMarkers(placed), (message) => showTileError(root, message));
}

const app = document.getElementById('app');
if (app !== null) {
  app.textContent = COPY.loading;
  start(app).catch((error: unknown) => {
    console.error(error);
    app.textContent = COPY.loadFailed;
  });
}
