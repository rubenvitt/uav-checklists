# Verknüpfung mit Suchlage – Plan (SUL-69)

- **Stand:** 18.10.2026
- **Spec:** im Suchlage-Repo, `docs/superpowers/specs/2026-10-18-einsaetze-und-flugmappe-design.md` §6, §7, §8
- **Gegenstück:** SUL-66, Schnittstelle in Suchlage (`/api/flugmappe/v1`), Plan dort `docs/superpowers/plans/2026-10-18-flugmappe-schnittstelle.md`
- **Baut auf:** SUL-68 (Einsatzkarte auf MapLibre, gemergt)

## 1. Leitplanken

- **Ohne Suchlage wie heute.** Die Suchlage-Teile erscheinen nur, wenn `VITE_SUCHLAGE_URL` gesetzt ist, der Nutzer angemeldet ist (`useAuth().isAuthenticated`) und die Probe `GET /me` gelingt. Sonst kein Hinweis, kein Fehler, keine Anfrage (ohne Adresse oder ohne Anmeldung wird nichts gesendet).
- **Nichts still.** Verknüpfen nur auf ausdrückliche Wahl. Ein erkannter Flug wird erst mit einem Tipp zum Flugbucheintrag.
- **Netzausfall.** Das manuelle Flugbuch bleibt unverändert nutzbar. Schreibende Aufrufe an Suchlage (Abschnitt, Kartenfoto, Abschluss) gehen über eine **Ausgangsliste** je Einsatz und werden nachgeholt.
- **Öffentliches Repo:** keine Adressen außer über Build-Konfiguration, keine Secrets.
- **Kein Mehraufwand:** keine neuen Pflichtschritte; der Abschnitt „Suchlage“ zählt nie gegen die Vollständigkeit.

## 2. Bausteine

| Datei | Inhalt |
|---|---|
| `src/types/suchlage/*.ts` | Kopie der von Suchlage erzeugten Vertragstypen (`Fm…`, `MissionState`, `FlightEndReason`, `GeoPoint` …) mit Herkunftskopf (`// Herkunft: rubenvitt/suchlage frontend/src/contract/generated/<Datei>, Stand <Commit>. Nicht von Hand ändern.`) |
| `src/services/suchlageApi.ts` | framework-freier Client wie `signApi.ts`: Basis `VITE_SUCHLAGE_URL`, `Authorization: Bearer` über den vorhandenen Token-Provider, Header `X-Flugmappe-Einsatz`, Zeitlimit 10 s, Fehler als `SuchlageError { status, kind: 'offline' \| 'unauthorized' \| 'forbidden' \| 'conflict' \| 'unprocessable' \| 'unavailable' \| 'other' }` |
| `src/hooks/useSuchlage.ts` | Probe über TanStack Query (`['suchlage','me', sub]`, 5 min stale, nicht persistiert), liefert `{ available, me, unreachable }` |
| `src/hooks/useSuchlageLink.ts` | Verknüpfung am Einsatz (`useMissionPersistedState('suchlage:link')`): `{ suchlageMissionId, missionName, linkedAt, sections: Record<segmentId, true>, remoteState?: 'closed' \| 'gone' }` |
| `src/utils/suchlageOutbox.ts` | reine Ausgangsliste (`suchlage:outbox` je Einsatz): Einträge `section`, `photo`, `close`; Reihenfolge bleibt; 409/422 bei `close` mit laufendem Flug → später erneut; 401/403 → ruhen; Netzfehler → Backoff |
| `src/hooks/useSuchlageSync.ts` | arbeitet die Ausgangslisten aller Einsätze ab (in `App`/Router eingehängt, also auch nach dem Abschluss auf der Übersicht), bei `online`, Fokus und alle 30 s |
| `src/utils/suchlageFlights.ts` | reine Logik: Vorschläge aus Suchlage-Flügen und Flugbuch, Zusammenführen, Abgleich der Landezeit |
| `src/components/sections/SuchlageSection.tsx` | Abschnitt „Suchlage“ in der Phase Einsatzdaten |
| `src/components/suchlage/*` | Vorschlagskarten im Flugbuch, Statuszeile „Suchlage nicht erreichbar“, Bestätigungsdialog „Übernehmen“ |
| `src/components/map/renderMapImage.ts` | Bild einer Karte aus GeoJSON ohne sichtbare Karte (für den Bericht) |

## 3. Abläufe

### Verknüpfen (Einsatzdaten)
- `SuchlageSection` (nur bei `available`) zeigt offene Einsätze (`GET /missions`): Name, Zustand, Start, „mit anderer Flugmappe verknüpft (Name, Zeit)“. Dazu „Neu in Suchlage anlegen“: Name vorbelegt aus `buildMissionLabel` (bzw. Einsatzstichwort), Ort aus dem Standortnamen des aktiven Abschnitts.
- **Neu:** `POST /missions` mit Flugmappe-Einsatz-ID und aktivem Abschnitt. **Wählen:** `POST /missions/{id}/link`; ist er mit einer anderen Flugmappe verknüpft, erst Bestätigungsdialog „Übernehmen“ (`take_over: true`).
- Danach einmalig `POST /missions/{id}/map/import` mit den gezeichneten Formen aus `einsatzkarte` (Kreise sind Polygone) und dem Standort. Fehler hier blockieren das Verknüpfen nicht (Hinweis, Ausgangsliste nicht nötig – Import ist optional).
- Verknüpft: Zeile mit Einsatzname, Link „In Suchlage öffnen“ (`VITE_SUCHLAGE_URL`), Status. Lösen der Verknüpfung gibt es nicht (Spec: Abschluss in Suchlage ist der Ausweg).
- 409 anderer Einsatz läuft: Meldung „In Suchlage läuft schon ‚<Name>‘ – dort abschließen oder diesen wählen“.

### Verlegung
- `startRelocation` (Hook `useMissionSegment`) legt bei Verknüpfung einen Ausgangseintrag `section` mit Segment-ID, Bezeichnung und Ort an. Die Phase wechselt sofort wie heute.

### Flugbuch (Phase Flüge)
- Bei Verknüpfung: `GET /missions/{id}/flights` alle 15 s, solange ein Flug läuft (lokal offen oder in Suchlage `ended_at_ms == null`), sonst alle 60 s; nur solange die Phase offen ist. Letzter Stand bleibt im Query-Cache (persistiert), damit er offline sichtbar bleibt.
- `FlightLogEntry` bekommt optional `suchlage?: { flightId, aircraftSn, aircraftLabel, maxElevationM, distanceM, photoCount, endReason }`.
- Vorschlag = Suchlage-Flug, dessen `flightId` in keinem Eintrag steht. Anzeige als **unbestätigter Eintrag** (gestrichelt, „Von Suchlage erkannt“), laufend erkennbar. Knopf **„Bestätigen“** → neuer Eintrag mit Zeiten aus der Telemetrie, Fernpilot/LRB wie beim Start vorbelegt, Abschnitt aus `flugmappe_section_id` (sonst aktiver), Nutzlast wie montiert.
- **Zusammenführen:** gibt es einen Eintrag ohne `suchlage`, dessen Start höchstens **5 min** vom Telemetrie-Start abweicht (nächster gewinnt), heißt der Knopf „Mit Flug N zusammenführen“: Eintrag bekommt `suchlage` und die Telemetrie-Zeiten (Start; Landung, falls beendet).
- **Landung nachziehen:** bestätigter Eintrag mit `blockOn == null`, dessen Suchlage-Flug gelandet ist (`end_reason` `landed`) → `blockOn` aus der Telemetrie. Endet er mit Verbindungsabriss, bleibt `blockOn` leer und der Eintrag zeigt „Verbindung abgerissen – Landezeit bitte selbst eintragen“.
- Zeiten bleiben im Eintrag korrigierbar; nach einer Korrektur wird nichts mehr überschrieben (`blockOn` wird nur gefüllt, wenn leer).
- Manuelles „Flug starten“/„Landung“ unverändert.
- Verknüpfter Einsatz in Suchlage abgeschlossen (Zustand `closed`) oder weg (404): Hinweis, bestätigte Einträge bleiben, keine neuen Vorschläge.

### Einsatzkarte
- Bei Verknüpfung zeigt die Kartenansicht die Karte des aktiven Abschnitts aus Suchlage (`GET /missions/{id}/map?section=<segmentId>`) nur zum Ansehen (EinsatzMap mit `readOnly` und externer GeoJSON-Quelle, Flugspuren als Linien) und „In Suchlage bearbeiten“. Kein Zeichnen. Der letzte Stand liegt unter `seg:<id>:suchlage:map` für offline.
- Foto-Variante wie heute; ein gespeichertes Foto geht zusätzlich über die Ausgangsliste (`photo`) an `PUT /missions/{id}/sections/{segmentId}/photo` (JPEG aus dem Data-URL).
- Vollständigkeit: bei Verknüpfung gilt die Einsatzkarte als vollständig, sobald eine Suchlage-Karte geladen wurde oder ein Foto vorliegt.

### Nachbereitung und Bericht
- `handleComplete()`: bei Verknüpfung Ausgangseintrag `close`. Der Truppführer muss nichts weiter tun (Nachholen bei laufendem Flug/Netzausfall).
- Bericht, Abschnitt Einsatzkarte: bei Verknüpfung Bild der Suchlage-Karte, **beim Erstellen frisch geladen** und mit `renderMapImage` gezeichnet (Zeitlimit 15 s, sonst letzter gespeicherter Stand); dazu das Foto, falls vorhanden.
- Flugbuch im Bericht: nur Einträge (unbestätigte Vorschläge sind keine Einträge); je Flug zusätzlich Fluggerät (Bezeichnung oder Seriennummer), max. Höhe, Strecke; hat der Flug Fotos, Satz „Fotos und Video zu diesem Flug liegen in Suchlage.“

### Fehleranzeige
- Statuszeile (dezent, `eyebrow`, `caution`-Farben) „Suchlage nicht erreichbar – Flugbuch funktioniert weiter“ in Einsatzdaten/Flüge, nur bei Verknüpfung und Netzfehler. 401/403 → Suchlage-Teile ruhen ohne Fehlermeldung.

## 4. Konfiguration und Betrieb
- `.env.example` und `src/env.d.ts`: `VITE_SUCHLAGE_URL`.
- Workbox: `NetworkOnly` für Anfragen an `VITE_SUCHLAGE_URL` (zur Build-Zeit eingesetzt), nichts cachen im SW (Bearer-Daten).
- In Suchlage: Einstellungen „Flugmappe“ mit der Client-ID **dieser** SPA (`VITE_OIDC_CLIENT_ID`) und dem Ursprung der Flugmappe.

## 5. Tests (vitest, Umgebung node)
- `suchlageFlights.test.ts`: Vorschläge, Zusammenführen (Grenze 5 min, nächster gewinnt, bereits verknüpfte nicht doppelt), Landung nachziehen (landed vs. Abriss, nur wenn leer).
- `suchlageOutbox.test.ts`: Reihenfolge, Nachholen bei 422/Netzfehler, Ruhen bei 401/403, Entfernen nach Erfolg, idempotent.
- `suchlageApi.test.ts`: ohne Adresse/Token keine Anfrage (fetch-Mock), Fehlerklassen, Header.
- Bericht: Fluggerät/Höhe/Strecke erscheinen (reine Aufbereitungsfunktion testen).

## 6. Doku
- `CLAUDE.md`: Tabelle External APIs um Suchlage ergänzen, Abschnitt zur Verknüpfung.
- Handbuch: `landing/src/handbuch/kapitel/03-einsatzdaten.md` (Abschnitt Suchlage, Karte), `08-fluege.md` (erkannte Flüge bestätigen/zusammenführen), `09-nachbereitung.md` (Abschluss, Bericht). Screenshots nur, wenn ohne Suchlage-Server erzeugbar – sonst als Nachzug.

## 7. Abnahme
- `pnpm lint`, `pnpm test`, `pnpm build` grün.
- Ohne `VITE_SUCHLAGE_URL` oder ohne Anmeldung: keine Anfrage an Suchlage, Oberfläche unverändert.
- Gegen einen lokalen Suchlage-Server (Feature `dev`, Simulator): Einsatz anlegen, Flug aus dem Simulator erscheint als Vorschlag, Bestätigen, Landung wird nachgezogen, Bericht enthält Karte aus Suchlage und Flugdaten.
