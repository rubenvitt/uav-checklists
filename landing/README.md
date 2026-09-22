# Landingpage — UAV Einsatzverwaltung

Eigenständige, statische Website, die die UAV-Einsatzverwaltung für andere
Bereitschaften und Interessierte vorstellt.

Sie ist **vollständig vom PWA-Build getrennt**: eigenes `package.json`, eigene
Abhängigkeiten, eigene Lockfile, eigener Vite-Build. Die App im
Projektwurzelverzeichnis weiß nichts von diesem Verzeichnis, und umgekehrt wird
hier kein Code der App importiert — nur Screenshots davon. Beide lassen sich
deshalb unabhängig voneinander auf verschiedenen Domains ausliefern.

## Entwicklung

```bash
cd landing
pnpm install
pnpm dev        # http://localhost:5180
pnpm build      # statischer Build nach dist/
pnpm preview    # dist/ lokal anschauen
```

`pnpm-workspace.yaml` in diesem Verzeichnis sorgt dafür, dass die Overrides des
Wurzelprojekts (dort läuft eine Vite-8-Beta) hier nicht greifen.

## Vor dem Deployment anpassen

| Stelle | Was |
|---|---|
| `src/site.config.ts` → `appUrl` | URL der gehosteten PWA — steht derzeit auf einem Platzhalter |
| `src/site.config.ts` → `revision` | Stand, auf den sich die Texte beziehen |
| `index.html` → `<link rel="canonical">` | endgültige Adresse dieser Seite |

Die Meta-Beschreibung und das Vorschaubild (`public/og-image.png`) sind bereits
gesetzt.

## Ausliefern

`pnpm build` erzeugt `dist/` mit reinem HTML, CSS, JS und Bildern — keine
Server-Laufzeit, keine Umgebungsvariablen, keine Datenbank. Das Verzeichnis kann
auf jeden Webserver oder Objektspeicher gelegt werden (nginx, Caddy, Apache,
S3, GitHub Pages, Netlify …).

Die Seite ist eine einzelne HTML-Datei mit Ankern; eine SPA-Rewrite-Regel ist
**nicht** nötig. `base` steht in `vite.config.ts` auf `'./'`, die Seite
funktioniert also auch in einem Unterverzeichnis.

### Cloudflare Pages

Die PWA wird bereits über Cloudflare Pages ausgeliefert. Die Landingpage kann
als **zweites Pages-Projekt** aus demselben Repository laufen — dann bleiben
beide Auslieferungen getrennt und blockieren sich nicht gegenseitig:

| Einstellung | Wert |
|---|---|
| Root directory | `landing` |
| Build command | `pnpm install && pnpm build` |
| Build output directory | `landing/dist` |

Wichtig ist das Root directory: Ohne es würde Cloudflare den PWA-Build
ausführen. Eine SPA-Weiterleitung wird hier nicht gebraucht.

## Datenschutz

Die Seite lädt nichts von fremden Servern nach und setzt keine Cookies:

- Schriften (Archivo, IBM Plex Sans, IBM Plex Mono) werden über
  `@fontsource`-Pakete selbst ausgeliefert — kein Google-Fonts-Abruf.
- Keine Analytics, keine eingebetteten Videos, keine externen Skripte.
- Keine Formulare, keine Speicherung im Browser.

Das sollte so bleiben — es ist Teil der Aussage der Seite.

## Aufbau

```
src/
├── App.tsx                 Reihenfolge der Abschnitte
├── site.config.ts          URLs und Kennzahlen
├── index.css               Farb- und Schrift-Token, Hilfsklassen
└── components/
    ├── primitives.tsx      Reveal, SectionHead, ButtonLink, PhoneFrame …
    ├── Nav.tsx             Kopfzeile und Bildmarke
    ├── Hero.tsx            Aufmacher und Kennzahlenband
    ├── Audience.tsx        Wofür / für wen
    ├── Workflow.tsx        01 — die vier Einsatzphasen (umschaltbar)
    ├── Features.tsx        02 — Funktionsraster
    ├── Gallery.tsx         Bildstrecke (horizontal scrollbar)
    ├── Privacy.tsx         03 — Datenhaltung
    ├── Install.tsx         04 — Inbetriebnahme
    ├── Signatures.tsx      05 — optionaler Signaturdienst
    ├── Faq.tsx             06 — häufige Fragen
    └── Footer.tsx          Abschluss-CTA, Fußzeile, Haftungshinweis
```

### Gestaltung

Die Seite ist bewusst als **Einsatzunterlage** gestaltet, nicht als
Produktseite: warmes Papierweiß, Tiefschwarzblau, ein einzelner Signalton in
Orangerot. Haarlinien statt Schatten, durchnummerierte Abschnitte, Mono-Schrift
für Kennungen und Messwerte, Passermarken an den Rändern.

Alle Farben, Schriften und Größen liegen als Tokens im `@theme`-Block in
`src/index.css`. Wer die Seite für die eigene Bereitschaft anpassen will, ändert
dort die Werte und in `src/site.config.ts` die Links.

## Screenshots erneuern

Die Bilder in `public/screenshots/` sind echte Aufnahmen der laufenden App,
nicht nachgebaut. Erzeugt werden sie mit den Skripten in
`tools/screenshots/`.

```bash
# 1. PWA starten (im Projektwurzelverzeichnis)
pnpm dev                       # http://localhost:5174

# 2. Im landing/-Verzeichnis: Werkzeuge bereitstellen
pnpm add -D playwright sharp
pnpm exec playwright install chromium

# 3. Aufnehmen und umwandeln
node tools/screenshots/capture.mjs
node tools/screenshots/optimize.mjs

# 4. Vorschaubild und Touch-Icon (nur bei Änderungen am Aufmacher nötig)
node tools/screenshots/social.mjs
```

`tools/screenshots/seed.mjs` legt dafür einen vollständig ausgefüllten
Beispiel-Einsatz im localStorage an (erfundene Namen, Einsatzort Hannover).
Wetter, K-Index und Kartenkacheln werden dabei tatsächlich abgerufen, nur die
Overpass-Antwort ist fest hinterlegt, damit die Umgebungsprüfung reproduzierbar
bleibt.

`playwright` und `sharp` sind absichtlich **keine** dauerhaften
Abhängigkeiten — sie werden nur zum Erneuern der Bilder gebraucht und würden
den Build sonst unnötig aufblähen.
