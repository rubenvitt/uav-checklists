---
title: Flugmappe — Einsatzdokumentation für UAV-Trupps im Katastrophenschutz
description: Freie Progressive Web App für UAV-Trupps im Katastrophenschutz. Vorflugkontrolle, Wetter- und SORA-Bewertung, Flugtagebuch und PDF-Einsatzbericht. Ohne Konto, ohne Server, offline nutzbar.
url: https://flugmappe.de/
language: de
revision: 2026.09
---

# Flugmappe

**Einsatzdokumentation für UAV-Trupps im Katastrophenschutz** · Stand 2026.09

Eine Web-App, die einen Drohneneinsatz von der Alarmierung bis zum unterschriebenen Bericht führt: Einsatzdaten, Wetter- und Risikobewertung, Flugtagebuch, Nachbereitung. Gebaut für Bereitschaften, die im Gelände dokumentieren müssen — auf dem Tablet neben dem Fernpiloten, nicht am Schreibtisch danach.

Läuft im Browser. Keine Installation nötig — auf Wunsch als App auf dem Homescreen. Kostenlos und quelloffen.

- Anwendung öffnen: <https://app.flugmappe.de>
- Quellcode: <https://github.com/rubenvitt/uav-checklists>
- Fehler und Wünsche: <https://github.com/rubenvitt/uav-checklists/issues>

## Kennzahlen

| Wert | Einheit | Bedeutung |
|---|---|---|
| 4 | Phasen | Einsatzdaten → Vorflug → Flüge → Nachbereitung |
| 9 | Wettermetriken | gegen die Grenzwerte der gewählten Drohne geprüft |
| 0 | Benutzerkonten | kein Login, keine Registrierung, keine Cloud |
| 56 h | Aufbewahrung | danach löscht sich ein Einsatz selbst |

## Wofür das gedacht ist

Ein Drohneneinsatz erzeugt mehr Papier als Flugzeit. Die App nimmt genau diesen Teil ab — und zwar dort, wo er anfällt.

Entstanden ist sie nicht am Reißbrett, sondern aus dem laufenden Betrieb einer ehrenamtlichen Einheit: Was im Einsatz sowieso abgefragt, entschieden und aufgeschrieben wird, steht in der gleichen Reihenfolge in der App.

- **Bereitschaften mit UAV-Trupp:** Ihr fliegt für Erkundung, Personensuche oder Lagebilder und führt die Dokumentation bisher auf Papier, in einer Tabelle oder gar nicht einheitlich. Die App gibt dem Ganzen eine feste Reihenfolge, ohne dass jemand ein System lernen muss.
- **Fernpiloten und Luftraumbeobachter:** Ihr braucht an der Einsatzstelle schnell belastbare Zahlen — Böen auf Flughöhe, K-Index, was in 1,5 km Umkreis liegt — und danach ein Flugbuch, das ohne Abtippen entsteht.
- **Interessierte von außen:** Ihr wollt sehen, wie eine Vorflugkontrolle im Katastrophenschutz tatsächlich abläuft, was SORA in der Praxis bedeutet und wie sich so etwas ohne Cloud lösen lässt. Der komplette Quellcode liegt offen.

## 01 — Der Einsatzablauf

Vier Phasen, die der Realität an der Einsatzstelle folgen. Ein Einsatz wandert von links nach rechts durch die App. Phase 3 und 4 sind gesperrt, bis die Flugfreigabe dokumentiert ist — man kann die Vorflugkontrolle also nicht versehentlich überspringen.

### 1. Einsatzdaten

Alles, was zum Einsatz gehört, bevor die Drohne ausgepackt wird — inklusive gezeichneter Einsatzkarte.

- Einsatzstichwort, Alarmzeit, alarmierende und anfordernde Stelle
- Einsatzleitung und Abschnittsleitung
- Auftragsvorlagen: Personensuche, Erkundung, Transport, Überwachung
- Truppstärke mit Fernpilot, Luftraumbeobachter und Bildauswerter
- Einsatzkarte zeichnen (Polygon, Kreis, Linie, Marker) oder Foto hinterlegen

### 2. Vorflugkontrolle

Die eigentliche Entscheidungsgrundlage: Wetter, Umgebung, Luftraum, Risikoklasse — und am Ende die dokumentierte Flugfreigabe.

- Wetterbewertung gegen die Grenzwerte der gewählten Drohne
- Gegenprüfung mit DWD-Stationsmessung und amtlichen Unwetterwarnungen (Deutschland)
- Wind auf 10 / 80 / 120 / 180 m, interpoliert auf die geplante Flughöhe
- Umgebungsprüfung: Krankenhäuser, BOS, Bahn, Autobahn, Schutzgebiete, Strommasten
- Live-Flugverkehr (ADS-B) im Umkreis, mit Warnung bei Tiefflug in der Nähe
- Fluganmeldungen bei Leitstelle, Polizei und weiteren Stellen
- SORA: GRC, ARC und daraus abgeleitetes SAIL
- Technische Kontrolle, Flugbriefing, Funktionstest — dann Freigabe oder Ablehnung

### 3. Flüge

Während des Einsatzes zählt jede Minute. Start und Landung sind ein Knopfdruck, Besonderheiten landen als Ereignis im Protokoll.

- Block Off / Block On je Flug mit Fernpilot und Luftraumbeobachter
- Landungsstatus: in Ordnung, auffällig oder Notfall
- Ereignisprotokoll mit Zeitstempel für alles, was gemeldet werden muss
- Luftraumüberwachung (ADS-B): neu auftauchende Tiefflieger lösen eine Meldung aus und landen automatisch im Ereignisprotokoll
- Standortwechsel („Verlegen“) legt einen neuen Abschnitt im selben Einsatz an
- Prozeduren-Nachschlagewerk und SOS-Schnellzugriff jederzeit erreichbar

### 4. Nachbereitung

Nachflugkontrolle, Einsatzabschluss, Unterschriften — und der fertige Bericht als PDF.

- Nachflugkontrolle am Gerät: Motoren, Akkus, Rotoren, Payload, Kabel
- Störungen und Vorfälle kategorisiert erfassen
- Einsatzergebnis: erfolgreich, erfolglos oder abgebrochen
- Abschluss-Checkliste: Datensicherung, Abmeldungen, Rückbau
- Unterschrift von Fernpilot und Einsatzleitung direkt auf dem Gerät
- PDF-Einsatzbericht mit allen Daten, der Einsatzkarte und den Unterschriften

## 02 — Was drin steckt

Kein Formular-Generator. Werkzeuge für einen konkreten Job. Jede Funktion ist aus dem realen Flugbetrieb entstanden. Was im Einsatz nicht gebraucht wird, ist nicht drin.

- **Wetter gegen Drohnengrenzwerte** (Open-Meteo / NOAA SWPC): Wind, Böen, Temperatur, Niederschlag, Sicht, Luftfeuchte, Druck und Taupunkt von Open-Meteo — bewertet gegen das Profil der gewählten Drohne. Wind wird von 10 bis 180 m auf die geplante Flughöhe interpoliert, dazu der geomagnetische K-Index, 24-Stunden-Vorhersage und Sonnenzeiten.
- **Amtliche Unwetterwarnungen** (DWD / Bright Sky): Liegt für den Einsatzort eine Warnung des Deutschen Wetterdienstes vor, erscheint sie als eigene Kachel. Unwetter zählt als Empfehlung gegen die Freigabe. Dazu der Abgleich mit der Messung der nächsten DWD-Station.
- **Live-Flugverkehr mit Überwachung** (adsb.lol / adsb.fi): Luftfahrzeuge im Umkreis von 10 km aus ADS-B-Daten, mit Höhe über Grund, Entfernung und Richtung; Tiefflug unter 500 m in der Nähe wird als Warnung markiert. Während der Flüge beobachtet die App den Luftraum weiter: Taucht ein neuer Tiefflieger auf oder kommt einer näher, gibt es eine Meldung — und einen Eintrag im Ereignisprotokoll und im Bericht.
- **Umgebungsprüfung** (Overpass / OSM): Automatische Abfrage der Umgebung über OpenStreetMap: Flugplätze, Krankenhäuser, BOS-Standorte, Bahnanlagen, Bundesfernstraßen, Wasserstraßen, Strommasten, Naturschutzgebiete — mit Entfernung und Himmelsrichtung.
- **SORA: GRC, ARC, SAIL:** Geführte Fragebögen für Boden- und Luftrisiko, inklusive Minderungsmaßnahmen. Die SAIL-Stufe ergibt sich automatisch aus der Matrix und bleibt im Bericht nachvollziehbar.
- **Einsatzkarte zum Zeichnen:** Leaflet-Karte mit Zeichenwerkzeugen für Polygone, Kreise, Linien und Marker. Flächen werden berechnet, der Kartenausschnitt wandert als Bild in den Bericht. Alternativ ein Foto der Lagekarte.
- **Fluganmeldungen:** Leitstelle und Polizei als Pflichtpunkte, weitere Stellen frei ergänzbar — passend zu dem, was die Umgebungsprüfung gefunden hat.
- **Technische Kontrolle:** Aufstiegsort, UAV, Fernbedienungen und Funktionstest als abhakbare Listen mit positiv/negativ statt nur Haken — dazu das vollständige Flugbriefing.
- **Prozeduren griffbereit:** Normale Verfahren, Contingency, Emergency und ERP als Nachschlagewerk im Einsatz, mit rollenbezogenen Schritten für RPIC, RP und Bodenpersonal. Der SOS-Knopf ist von jedem Bildschirm aus erreichbar.
- **PDF-Einsatzbericht:** Ein Dokument mit Einsatzdaten, Auftrag, Truppstärke, Wetterlage, SORA-Einstufung, Karte, Fluganmeldungen, Flugtagebuch und Nachbereitung — erzeugt im Browser, nicht auf einem Server.
- **Unterschriften am Gerät:** Fernpilot und Einsatzleitung unterschreiben direkt mit dem Finger oder Stift; die Unterschrift landet im PDF.
- **Offline und nachtfest:** Service Worker mit Workbox hält App und Kartenkacheln vor. Helles und dunkles Design wechseln automatisch mit Sonnenauf- und -untergang — nachts blendet kein weißer Bildschirm.

## 03 — Datenhaltung

Einsatzdaten verlassen das Gerät nicht. Alles, was erfasst wird — Stichwort, Namen, Koordinaten, Flugzeiten, Unterschriften — liegt im `localStorage` des Browsers, auf dem gerade dokumentiert wird. Es gibt keine Synchronisierung und keinen Abgleich.

- **Kein Backend:** Die Anwendung ist eine statische Web-App. Es gibt keinen Server, der Einsatzdaten entgegennimmt, und damit auch keinen, der sie verlieren könnte.
- **Kein Konto:** Keine Registrierung, kein Login, keine Benutzerverwaltung. Wer den Link öffnet, kann sofort einen Einsatz anlegen.
- **Kein Tracking:** Keine Analytics, keine Werbe-Skripte, keine eingebetteten Drittanbieter-Schriften. Auch diese Seite hier lädt nichts von fremden Servern nach.
- **Selbstlöschend:** Ein laufender Einsatz verfällt nach 56 Stunden, ein abgeschlossener nach 24. Wer den Bericht behalten will, exportiert vorher das PDF.

### Was doch nach draußen geht

Wetter, Umgebung, Flugverkehr und Kartenkacheln kommen von öffentlichen Diensten. Dafür wird der Einsatzort übertragen — sonst nichts. Keine Namen, keine Einsatzdaten, keine Kennungen, keine API-Schlüssel. Offline greift der Zwischenspeicher, dann werden gar keine Abfragen gestellt.

Wem auch das zu viel ist: Die Anwendung lässt sich selbst hosten und die Dienste gegen eigene Instanzen tauschen.

| Dienst | Zweck | Übertragen |
|---|---|---|
| Open-Meteo | Wetter und Vorhersage | Koordinaten |
| Bright Sky (DWD) | Stationsmessung und amtliche Warnungen | Koordinaten |
| NOAA SWPC | Geomagnetischer K-Index | keine |
| Overpass / OpenStreetMap | Umgebungsprüfung | Koordinaten |
| adsb.lol / adsb.fi (über das Backend) | Live-Flugverkehr (ADS-B) | Koordinaten, nicht die eigene IP |
| Nominatim | Ortsname zum Standort | Koordinaten |
| OpenStreetMap-Kacheln | Kartendarstellung | Kartenausschnitt |

## 04 — Inbetriebnahme

Aufrufen reicht. Installieren geht trotzdem. Es gibt nichts aus einem App-Store zu laden und nichts freizugeben. Die Adresse im Browser öffnen genügt — wer die App dauerhaft auf dem Einsatztablet will, legt sie in drei Schritten auf den Homescreen.

### Variante A — einfach im Browser öffnen

<https://app.flugmappe.de> — funktioniert auf Tablet, Handy und Notebook. Beim ersten Aufruf lädt die App sich selbst in den Zwischenspeicher und ist danach auch ohne Netz startklar.

### Variante B — auf den Homescreen

**iPhone / iPad**

1. Die Adresse in Safari öffnen — nicht in Chrome, dort fehlt der Menüpunkt.
2. Auf das Teilen-Symbol tippen.
3. „Zum Home-Bildschirm“ wählen und bestätigen.

**Android**

1. Die Adresse in Chrome öffnen.
2. Menü (drei Punkte) antippen.
3. „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.

**Notebook im FüKw**

1. Die Adresse in Chrome oder Edge öffnen.
2. Auf das Installationssymbol rechts in der Adressleiste klicken.
3. Die App startet danach in einem eigenen Fenster, auch offline.

### Variante C — selbst hosten

Die App ist ein statischer Build ohne Laufzeitabhängigkeiten. Wer sie im eigenen Netz oder unter der Domain der Bereitschaft betreiben will, braucht nur einen Webserver, der Dateien ausliefert.

```sh
git clone https://github.com/rubenvitt/uav-checklists.git
cd uav-checklists
pnpm install
pnpm build

# dist/ enthält die fertige App — auf einen beliebigen
# Webserver legen (nginx, Caddy, Apache, S3, Pages …).
# Wichtig: alle unbekannten Pfade auf /index.html
# umleiten, sonst brechen die Einsatz-URLs beim Neuladen.
```

**Drohnenprofile anpassen:** Die Grenzwerte stecken in `src/data/drones.ts`. Wer eine andere Plattform fliegt, ergänzt dort ein Profil mit Windgrenze, Temperaturbereich, IP-Schutzart, Dienstgipfelhöhe und Abflugmasse — die gesamte Wetterbewertung richtet sich danach.

Fragen zur Inbetriebnahme gehen am besten über die [Issues im Repository](https://github.com/rubenvitt/uav-checklists/issues) — dann haben andere Bereitschaften die Antwort gleich mit.

## 05 — Signierte Berichte (optional)

Manche Bereitschaften müssen belegen können, dass ein Bericht nach der Unterschrift nicht mehr angefasst wurde. Dafür gibt es einen kleinen, eigenständigen Dienst. Er ist vollständig optional: Ohne ihn erscheint in der App kein Anmelde- und kein Signaturbereich, und alles andere funktioniert unverändert.

1. **PDF erzeugen:** Der Einsatzbericht entsteht wie immer im Browser.
2. **SHA-256 bilden:** Der Dienst hasht das fertige Dokument — die Bytes bleiben unverändert.
3. **Ed25519 signieren:** Signiert wird der Hash zusammen mit der Kennung der angemeldeten Person.
4. **Kette fortschreiben:** Jeder Eintrag hängt am Hash des vorherigen. Nachträgliches Ändern bricht die Kette.
5. **Prüfen:** Wer das PDF hat, kann es ohne Login gegen die Registry prüfen lassen.

**Was der Dienst leistet**

- Bindet kryptografisch, wer unterschrieben hat — die Kennung steckt in der signierten Nutzlast.
- Führt ein fortlaufendes, hash-verkettetes Protokoll; jede Manipulation daran ist feststellbar.
- Erlaubt jedem mit dem Dokument eine Prüfung, ohne Zugang zum System.
- Legt geprüfte Berichte auf Wunsch in einem Archiv ab; optional mit Virenprüfung beim Upload.

**Was er ausdrücklich nicht leistet**

- Erzeugt keine eIDAS-konforme oder PAdES-Signatur.
- Verändert die PDF-Datei nicht — Adobe Reader zeigt keine eingebettete Signatur an.
- Ersetzt keine rechtliche Beratung zur Beweiskraft im Einzelfall.

- **Betrieb:** Node-Dienst mit SQLite-Datei; Container-Abbild wird aus dem Repository gebaut.
- **Anmeldung:** OpenID Connect über PocketID — öffentlicher Client mit PKCE, kein Geheimnis in der App.
- **Schlüssel:** Ed25519-Schlüsselpaar liegt als Datei neben dem Dienst — sichern, sonst sind alte Signaturen nicht mehr prüfbar.

Die vollständige Beschreibung steht im Repository unter [server/](https://github.com/rubenvitt/uav-checklists/tree/main/server).

## 06 — Häufige Fragen

### Ersetzt die App eine Betriebsgenehmigung oder eine Flugfreigabe?

Nein. Sie strukturiert und dokumentiert, was ohnehin geprüft werden muss, und hält das Ergebnis fest. Die fachliche Entscheidung trifft weiterhin die verantwortliche Person, und behördliche Genehmigungen, NOTAM-Prüfung und Flugverkehrskontrollfreigaben laufen unverändert über die zuständigen Stellen. Die App verlinkt sie nur an der passenden Stelle.

### Funktioniert das mit unseren Drohnen?

Mitgeliefert sind Profile für die DJI Matrice 350 RTK und die Matrice 200. Ein weiteres Profil ist eine Handvoll Zahlen — Windgrenze, Temperaturbereich, IP-Schutzart, Dienstgipfelhöhe, Abflugmasse — in `src/data/drones.ts`. Danach bewertet die App das Wetter gegen genau diese Werte.

### Was passiert bei Funkloch an der Einsatzstelle?

Die App startet und arbeitet offline, inklusive Checklisten, Flugtagebuch, Prozeduren und PDF-Export. Wetter, DWD-Abgleich, K-Index und Umgebungsprüfung brauchen einmal Netz; einmal geladen bleiben sie beim Einsatz gespeichert. Der Live-Flugverkehr und die Luftraumüberwachung während der Flüge brauchen Netz; offline zeigt die App den zuletzt geladenen Stand mit Uhrzeit. Kartenkacheln, die schon einmal angezeigt wurden, kommen aus dem Zwischenspeicher.

### Können mehrere Leute gleichzeitig an einem Einsatz arbeiten?

Nein — und das ist Absicht. Ohne Server gibt es keinen gemeinsamen Stand. Ein Einsatz wird auf einem Gerät geführt; der Austausch läuft über den exportierten PDF-Bericht. Wer gleichzeitiges Arbeiten braucht, braucht eine andere Architektur.

### Wie lange bleiben die Daten erhalten?

Ein laufender Einsatz 56 Stunden, ein abgeschlossener 24, ein gelöschter noch 30 Minuten zum Wiederherstellen. Danach räumt die App selbst auf. Der Bericht gehört also vor dem Ende der Schicht exportiert — der PDF-Export ist der eigentliche Archivierungsschritt.

### Was kostet das, und unter welchen Bedingungen dürfen wir es nutzen?

Es kostet nichts, es gibt keine Lizenzschlüssel und keine Nutzerzahlbegrenzung. Der Quellcode liegt offen auf GitHub; eine Bereitschaft kann ihn nehmen, hosten und für sich anpassen. Zur konkreten Lizenz und zu Fragen der Weitergabe am besten kurz im Repository nachsehen oder ein Issue aufmachen.

### Wir hätten gern eine Änderung. Geht das?

Das Projekt ist aus dem Bedarf einer einzelnen Einheit entstanden — Rückmeldungen aus anderen Bereitschaften sind deshalb besonders nützlich. Wünsche, Fehler und Erfahrungen gehören in die [Issues](https://github.com/rubenvitt/uav-checklists/issues). Wer selbst entwickelt, kann direkt einen Pull Request schicken.

## Ausprobieren

Legt einen Übungseinsatz an und schaut, ob es passt. Es braucht keine Anmeldung und keine Absprache. Ein Einsatz ist in zehn Sekunden angelegt, und wenn er nicht gebraucht wird, löscht er sich von selbst.

- Anwendung öffnen: <https://app.flugmappe.de>
- Quellcode ansehen: <https://github.com/rubenvitt/uav-checklists>

---

Hinweis: Kein amtliches Produkt, keine Zulassung, keine Gewähr für Vollständigkeit oder Richtigkeit der angezeigten Wetter-, Luftraum- und Umgebungsdaten. Die Verantwortung für die Flugdurchführung bleibt vollständig bei der verantwortlichen Person. Kartendaten © OpenStreetMap-Mitwirkende, Wetterdaten Open-Meteo und Deutscher Wetterdienst (über Bright Sky, CC BY 4.0), K-Index NOAA SWPC, Flugverkehr adsb.lol (ODbL) und adsb.fi.
