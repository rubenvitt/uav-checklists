# Flugmappe — Landingpage

Eigenständige, statische Website, die **Flugmappe** — die Einsatzdokumentation
für UAV-Trupps — anderen Bereitschaften und Interessierten vorstellt.

„Flugmappe" ist der Produktname nach außen; das Repository heißt weiterhin
`uav-checklists`, weil daran Cloudflare-Projekt, Container-Abbilder und
bestehende Links hängen.

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
| `src/site.config.ts` → `appUrl` | URL der gehosteten PWA; zeigt auf `app.flugmappe.de` |
| `src/site.config.ts` → `revision` | Stand, auf den sich die Texte beziehen |
| `index.html` → `<link rel="canonical">` | steht auf `https://flugmappe.de/` — anpassen, falls die Seite woanders liegt |

Titel, Meta-Beschreibung und Vorschaubild (`public/og-image.png`) sind gesetzt.
Der Produktname steht an einer Stelle: `site.name` in `src/site.config.ts`,
zusammen mit `site.tagline`. Beides wird in Kopf- und Fußzeile verwendet.

## Ausliefern

`pnpm build` erzeugt `dist/` mit reinem HTML, CSS, JS und Bildern — keine
Server-Laufzeit, keine Umgebungsvariablen, keine Datenbank. Das Verzeichnis kann
auf jeden Webserver oder Objektspeicher gelegt werden (nginx, Caddy, Apache,
S3, GitHub Pages, Netlify …).

Die Startseite und das Handbuch (`handbuch/index.html`) sind je eine
HTML-Datei mit Ankern; eine SPA-Rewrite-Regel ist **nicht** nötig. `base` steht in `vite.config.ts` auf `'./'`, die Seite
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

## Handbuch (`/handbuch/`)

Die zweite Seite der Website ist das Anwenderhandbuch für Einsatzkräfte. Die
Kapitel liegen als Markdown in `src/handbuch/kapitel/NN-slug.md` und lassen
sich ohne React-Kenntnisse pflegen; die Schreibregeln (Hinweiskästen, Bilder,
Anker, Ton) stehen in `src/handbuch/README.md`.

`handbuch.plugin.ts` wandelt die Kapitel beim Build in HTML um (der Browser
bekommt keinen Markdown-Parser) und legt die gesamte Markdown-Fassung als
`dist/handbuch/index.md` ab. Im Dev-Modus lädt die Seite neu, sobald sich ein
Kapitel ändert: <http://localhost:5180/handbuch/>.

Die Abbildungen liegen unter `public/screenshots/handbuch/` und kommen aus
`tools/screenshots/handbuch.mjs` — siehe [Screenshots erneuern](#screenshots-erneuern).

### Auffindbarkeit für Suchmaschinen und Agenten

| Datei | Zweck |
|---|---|
| `public/sitemap.xml` | Sitemap nach sitemaps.org; in `robots.txt` referenziert |
| `public/index.md` | Markdown-Fassung der Seite für Agenten, auch direkt unter `/index.md` abrufbar |
| `functions/index.ts` | Pages Function nur für `/`: liefert bei `Accept: text/markdown` `index.md` aus (mit `X-Markdown-Tokens`), sonst das HTML; setzt die `Link`-Header (RFC 8288) |
| `public/_headers` | dieselben `Link`-Header für die statische Auslieferung, Content-Types für `.md`/`.xml` |
| `handbuch/index.md` | Markdown-Fassung des Handbuchs, wird beim Build aus den Kapiteln erzeugt |

**Beim Ändern der Texte `public/index.md` mitpflegen.** Die Seite wird
clientseitig gerendert; das ausgelieferte HTML ist leer, Agenten sehen also nur
die Markdown-Fassung. Kommt eine weitere Seite dazu, gehört sie in
`sitemap.xml`.

Die Function ist Cloudflare-spezifisch. Auf anderen Webservern fällt nur die
Content-Negotiation weg; `sitemap.xml`, `robots.txt` und `/index.md` bleiben
als statische Dateien erreichbar.

## Datenschutz

Die Seite lädt nichts von fremden Servern nach und setzt keine Cookies:

- Schriften (Archivo, IBM Plex Sans, IBM Plex Mono) werden über
  `@fontsource`-Pakete selbst ausgeliefert — kein Google-Fonts-Abruf.
- Keine Analytics, keine eingebetteten Videos, keine externen Skripte.
- Keine Formulare, keine Speicherung im Browser.

Das sollte so bleiben — es ist Teil der Aussage der Seite.

## Aufbau

```
handbuch.plugin.ts          Markdown-Kapitel → HTML (virtual:handbuch)
handbuch/index.html         Einstieg der Seite /handbuch/
src/
├── handbuch/
│   ├── Handbuch.tsx        Seitenaufbau: Kapitelübersicht, Inhaltsverzeichnis
│   ├── handbuch.css        Satz der Kapitel, Hinweiskästen, Druckansicht
│   ├── README.md           Schreibregeln
│   └── kapitel/            die Kapitel als Markdown
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

# 3b. Abbildungen des Handbuchs (alle oder einzelne Kapitel), schreibt
#     direkt WebP nach public/screenshots/handbuch/
node tools/screenshots/handbuch.mjs
node tools/screenshots/handbuch.mjs fluege

# 4. Vorschaubild, Touch-Icon und Favicons (nur bei Änderungen am Aufmacher
#    oder an public/favicon.svg nötig)
node tools/screenshots/social.mjs
```

Gemeinsame Bausteine (Browser, Geräteprofil, feste Overpass-/ADS-B-Antworten,
`shot`, `crop`, `expand` …) liegen in `tools/screenshots/lib.mjs`. Für das
Handbuch hat jedes Kapitel ein eigenes Aufnahmeskript in
`tools/screenshots/handbuch/<slug>.mjs`.

`tools/screenshots/seed.mjs` legt dafür einen vollständig ausgefüllten
Beispiel-Einsatz im localStorage an (erfundene Namen, Einsatzort Hannover).
Wetter, K-Index und Kartenkacheln werden dabei tatsächlich abgerufen. Fest
hinterlegt sind die Overpass-Antwort (Umgebungsprüfung) und die ADS-B-Antwort
(erfundener, aber plausibler Verkehr um Hannover). Für die Aufnahme
`luftraum` taucht ein zusätzlicher Hubschrauber auf, damit die
Luftraumüberwachung ihre Meldung zeigt.

Alle Aufnahmen sind im Handyformat, auch für die Desktop-Ansicht der Seite:
Desktop-Aufnahmen der App wären im Rahmen zu klein, um sie zu lesen.
`CHROMIUM_PATH` zeigt bei Bedarf auf eine vorhandene Chromium-Binärdatei.

`playwright` und `sharp` sind absichtlich **keine** dauerhaften
Abhängigkeiten — sie werden nur zum Erneuern der Bilder gebraucht und würden
den Build sonst unnötig aufblähen.
