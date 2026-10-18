// Übernommen aus Suchlage 43622fd (18.10.2026): frontend/src/map/maplibreWorker.ts
import * as maplibregl from 'maplibre-gl';
// Der Worker muss explizit verdrahtet werden, mit `?worker&url`, nicht `?url`: maplibre 6 baut die
// Worker-URL zur Laufzeit zusammen, was kein Bundler sieht — ohne das emittiert `vite build` die
// Worker-Datei nicht (exit 0, keine Warnung), und es kommt keine Kachel. `?url` allein emittiert
// eine Datei, die ihre Geschwisterdatei `maplibre-gl-shared.mjs` importiert und daran stirbt.
// `?worker&url` bündelt self-contained und landet im Workbox-Precache (offline da).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Worker-URL setzen, bevor die erste Map entsteht: jede Datei, die eine Map erzeugt
// (`Kartenflaeche.tsx`, `geraet/LagemonitorKarte.tsx`), importiert dieses Modul. Der Guard deckt
// eine Bruchlinie ab: maplibre nimmt `config.WORKER_URL || defaultWorkerUrl()`. Bei einem falsy
// Wert fiele es still auf seinen Default zurück — der funktioniert unter Dev, zeigt im Prod-Build
// aber ins Leere, und die Karte lädt keine Kachel. Lieber hier laut brechen.
if (!workerUrl)
  throw new Error('maplibre-Worker-URL ist leer — `?worker&url` hat nichts geliefert');
maplibregl.setWorkerUrl(workerUrl);
