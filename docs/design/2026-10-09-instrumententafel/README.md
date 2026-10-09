# Instrumententafel — Flugmappe im Design von Lifeline Hub (09.10.2026)

Die Flugmappe übernimmt die Gestaltungssprache „Instrumententafel" aus Lifeline Hub
(`lifeline-hub: frontend/src/theme/tokens.ts`, `docs/design/2026-09-21-neuentwurf/umsetzung.md`).
Übernommen werden Rollen und Bausteine, nicht antd: die Flugmappe bleibt bei Tailwind.

## Was gilt

- **Farbrollen** in `src/index.css`. Die alten Rollennamen (`good`, `caution`, `warning`,
  `surface`, `text-muted` …) tragen jetzt die Werte von `farbenHell`/`farbenDunkel`; neu sind
  `accent` (Bedienfarbe blau), `line`, `line-strong`, `control-border`, `marke`, `text-2`,
  `faint`, `banner`, `on-accent`, `on-fill` und der Rahmen `rahmen-*`.
- **Rot bedient nichts.** Primäraktionen sind blau. `warning` steht für Störung und Notfall,
  `marke` ist Dekoration (Bildmarke).
- **Radius 0, Haarlinien statt Schatten.** Kacheln liegen im Fugenraster (`fugen`).
- **Schrift:** Archivo (400/500/600) und JetBrains Mono (400/500), lokal über `@fontsource`,
  kein CDN. Zahlen, Zeiten, Kennungen in Mono (`num`).
- **Augenbraue** (`eyebrow`) für Paneelköpfe und Kennzahl-Etiketten.
- **Status = Fläche + Text + Wort.** Nur Abweichungen tönen eine Kennzahl; „OK" bleibt ruhig.
- **Kopfleiste** 52 px, in beiden Modi dunkel, mit Bildmarke, Uhr und Design-Umschalter.
  Darunter der Seitenkopf mit Zurück, Einsatzname und Aktionen (≥ 44 px).
- **Phasenleiste** als Segmentleiste: Nummer in Mono, Name auch auf dem Telefon sichtbar,
  aktive Phase mit Bedienkante.

## Bewusste Abweichungen von Lifeline Hub

- Hell/Dunkel bleibt automatisch nach Sonnenstand. Lifeline startet im Nachtbetrieb; die
  Flugmappe wird draußen bei Tageslicht benutzt.
- `surface-alt` liegt in beiden Modi eine Stufe heller als `flaeche2`, weil die Flugmappe viele
  Wahlknöpfe ohne Rahmen hat, die sich sonst nicht vom Paneel abheben.
- Die Bildmarke ist eine eigene (Flugbahn statt Pulslinie), mit demselben roten Quadrat.

## Screenshots

`vorher-*.webp` und `nachher-*.webp` zeigen denselben Beispiel-Einsatz
(`landing/tools/screenshots/seed.mjs`) mit festen Wetterdaten.
