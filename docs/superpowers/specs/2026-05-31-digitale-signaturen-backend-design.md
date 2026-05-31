# Design: Digitale Signaturen & Backend-Dienst

**Datum:** 2026-05-31
**Status:** Genehmigt (Design), Umsetzung phasenweise

## Ziel

Am Ende eines Einsatzes sollen Unterschriften digital auf das Abschlussdokument
gelangen. Zwei Nutzungsstufen:

- **Ohne Login:** Mit dem Finger/Touch eine Unterschrift zeichnen, die ins PDF
  eingebettet wird.
- **Mit Login (PocketID):** Eine gespeicherte persönliche Signatur wiederverwenden,
  das Dokument über einen Server **kryptografisch siegeln**, Signaturen
  hochgeladener Dokumente **verifizieren** und gültig signierte PDFs optional
  zentral **ablegen**.

**Harte Randbedingung:** Die App bleibt **ohne Login in vollem Umfang nutzbar**.
Nur die elektronische Signatur (Siegel/Verify/Ablage/gespeicherte Signatur)
entfällt ohne Backend/Login. Zeichnen, PDF-Erzeugung und alles Übrige bleiben
voll offline funktionsfähig.

## Konzeptmodell (zwei getrennte Dinge)

1. **Sichtbare Unterschriften** (Führungskraft UAS + Einsatzleitung): Bilder, die
   gezeichnet oder aus dem Profil geladen und **visuell ins PDF** eingebettet
   werden. Das sind die menschlichen Unterschriften. → Phase 1 & 2.
2. **Kryptografisches Siegel:** **Eine einzige** serverseitige Detached-Signatur
   über den Hash des fertigen PDFs, ausgelöst vom eingeloggten Nutzer.
   Bescheinigt „authentifizierter Nutzer X hat genau dieses Dokument zum
   Zeitpunkt T eingereicht". Es ist **nicht** rollenbezogen — es bildet nicht
   „die Einsatzleitung hat digital signiert" ab, sondern ist ein Dokument-Siegel.
   → Phase 3.

Diese Trennung ist bewusst und muss in der UI klar kommuniziert werden, damit
keine falsche Erwartung („EL hat digital unterschrieben") entsteht.

## Signaturmechanismus-Entscheidung

Gewählt: **interne Integrität & Authentizität** (kein eIDAS/qualifizierte
Signatur, keine externen Vertrauensdiensteanbieter) über eine
**Hash-Registry / Detached-Signatur** — **nicht** eingebettetes PAdES.

Begründung: Da ohnehin zentral abgelegt und verifiziert wird, bringt eine
ins-PDF-eingebettete Signatur kaum Mehrwert, erfordert aber byte-genaue
PDF-Manipulation mit unbestätigtem jsPDF-Kompatibilitätsrisiko. Die Registry
deckt Signieren + Audit-Log + Verifikation + Ablage-Gate mit **einem** Mechanismus
ab und verändert keine PDF-Bytes.

> Bewusst **nicht** versprochen: Verifikation in Standard-PDF-Tools (Adobe etc.).
> Bei intern ausgestelltem Schlüssel zeigten diese ohnehin „nicht
> vertrauenswürdig". Verifikation erfolgt über die App / den `/verify`-Endpunkt.

## Phasen-Überblick

| Phase | Inhalt | Login | Backend |
|---|---|---|---|
| 1 | Finger/Touch-Unterschrift → Bild ins Abschluss-PDF | nein | nein |
| 2 | PocketID-Login, gespeicherte Signatur pro Nutzer | ja | ja (klein) |
| 3 | Server-Siegel (Hash-Registry), Verifikation, optionale Ablage | ja | ja |

Gebaut wird strikt phasenweise. Phase 1 & 2 sind unabhängig vom gewählten
Signaturmechanismus; nur Phase 3 hängt daran.

---

## Phase 1 — Gezeichnete Unterschrift (reines Frontend)

**Komponente `SignaturePad`** (neu, `src/components/`):

- Canvas mit Pointer-/Touch-Events; nutzt die schlanke Lib **`signature_pad`**.
- HiDPI-korrektes Rendering, „Löschen"-Button, glatte Striche.
- Ausgabe: PNG als Data-URL (transparenter Hintergrund), auf den tatsächlich
  bemalten Bereich zugeschnitten (trim), damit die Unterschrift sauber über der
  Linie sitzt.

**Verortung im Flow:** Im **Einsatzabschluss** (Nachbereitungsphase,
`NachbereitungPhase.tsx` / `EinsatzabschlussSection.tsx`). Zwei Felder —
**Führungskraft UAS** und **Einsatzleitung** —, nacheinander auf demselben Gerät
erfassbar (Tablet-Weiterreichen, klassischer Papier-Ersatz).

**Persistenz:** Über bestehende `useMissionPersistedState` als
`uav-form:${missionId}:signature:fk` bzw. `:el` (Data-URL). Unterliegt der
56h-TTL-Bereinigung wie alle Missionsdaten — bleibt lokal im Browser.

**PDF-Einbettung:** Der Unterschriften-Block muss ins **Abschlussdokument**
(`generateMissionReport.ts`), das ihn aktuell **noch nicht** hat. Vorhandene Linie
+ Label beibehalten; existiert eine Signatur-Data-URL, wird das PNG per
`doc.addImage()` **über** die Linie gezeichnet (skaliert in die Block-Breite).
Ohne Bild → leeres Feld wie bisher (Hand-/Druckunterschrift bleibt möglich).

> Der bestehende Signatur-Block in `generateReport.ts` ist der **Vorflug**-Report
> und bleibt unangetastet. Finger-Unterschriften gibt es nur im
> Einsatz-Abschlussdokument.

**Kein Login, kein Netz nötig — voll offline.**

---

## Phase 2 — PocketID-Login & gespeicherte Signatur

**Login (SPA):** OIDC **Authorization Code + PKCE** als Public Client (kein
Client-Secret im Browser), via **`oidc-client-ts`**. Redirect zu PocketID, Token
zurück, Access-Token im Speicher. Login ist **immer optional** — ohne Login läuft
alles wie in Phase 1.

**Gespeicherte Signatur:** Genau **eine** persönliche Unterschrift pro Nutzer,
**serverseitig** abgelegt (synct über Geräte, an Identität gebunden):

- `GET /me/signature` → gespeichertes PNG (oder 404)
- `PUT /me/signature` → speichern/aktualisieren (gezeichnet via `SignaturePad`)
- `DELETE /me/signature`

Im Abschluss-Flow kann ein eingeloggter Nutzer für **seine** Rolle „Gespeicherte
Signatur einfügen" wählen statt zu zeichnen; die andere Person zeichnet weiterhin.

---

## Phase 3 — Backend-Dienst

**Bereitstellung:** Eigener Node/TypeScript-Dienst als Docker-Container (nicht
direkt neben PocketID, greift aber für die Auth darauf zu).

**Stack:** Hono (HTTP) + `better-sqlite3` (SQLite, dateibasiert, minimaler
Betrieb) + `jose` (Token-Validierung) + `@noble/ed25519` bzw. Node `crypto`
(Signieren).

**Auth:** Jeder geschützte Endpunkt validiert das PocketID-Access-Token gegen
dessen **JWKS** (Signatur, `iss`, `aud`, `exp`). `sub` + Anzeigename stammen aus
dem Token.

### Endpunkte

**`POST /sign`** (Body: fertiges PDF)

1. Server berechnet `SHA-256` des PDF.
2. Signiert den Hash mit dem **Server-Privatschlüssel** (Ed25519; Key als
   gemountetes Secret/Datei).
3. Schreibt einen Registry-Eintrag = zugleich Audit-Kette.
4. Antwort: **Quittungs-Datensatz** (Signatur-ID, Signierer, Zeitpunkt,
   Doc-Hash, Signatur).

**`POST /verify`** (Body: PDF): Server hasht neu → schlägt in Registry nach →
`{ gültig, signierer, zeitpunkt }` oder „nicht gefunden / ungültig". Standalone
nutzbar **und** als Eingangs-Gate der Ablage.

**`POST /archive`** (Body: PDF, optionaler Folgeschritt): verifiziert zuerst; nur
bei „gültig" wird das PDF gespeichert. Andernfalls Ablehnung — **nur gültig
signierte Dokumente** kommen in die Ablage.

**`GET|PUT|DELETE /me/signature`** — siehe Phase 2.

### Datenmodell (SQLite)

- `signatures`: `sub` (PK), `image_png` (BLOB), `updated_at`.
- `signing_log` (Registry **und** hash-chained Audit-Kette):
  `id`, `sub`, `signer_name`, `created_at`, `doc_hash`, `signature`,
  `prev_entry_hash`, `entry_hash`.
  - `entry_hash = SHA256(prev_entry_hash ‖ id ‖ sub ‖ created_at ‖ doc_hash ‖ signature)`
  - Append-only; jede nachträgliche Änderung bricht die Kette → manipulationssicher
    nachweisbar (pragmatische „Revisionssicherheit" ohne GoBD-WORM-Overhead).
  - Eine `verifyChain()`-Routine prüft die gesamte Kette.
- `archive` (optional): `id`, `doc_hash` (→ `signing_log`), `pdf` (BLOB oder
  Volume-Referenz), `archived_at`.
- **Server-Keypair**: als Secret gemountet, nicht in der DB.

### Kryptografische Bindung der Identität

Der `sub` ist Teil der signierten/gehashten Felder → „wer signiert hat" ist
**kryptografisch gebunden**, nicht über unsignierte Metadaten oder einen reinen
Log-Lookup fälschbar.

---

## Graceful Degradation & Offline (Querschnitt)

- Backend-Basis-URL via `VITE_SIGN_API_URL`. **Leer oder unerreichbar** →
  Login-/Siegel-/Verify-/Ablage-UI **erscheint nicht**. Die öffentliche
  Deployment-Variante ohne Backend bleibt exakt wie heute.
- Die neuen Endpunkte (`/sign`, `/verify`, `/archive`, `/me/signature`) werden
  **aus dem Workbox-Service-Worker-Cache ausgeschlossen** (Mutationen/Auth, kein
  NetworkFirst).
- Kein Login-Zustand ist zum Nutzen der App erforderlich.
- Backend nicht erreichbar ⇒ **nur** die E-Signatur-Funktion degradiert;
  gezeichnete Unterschriften, PDF und alles Übrige bleiben voll offline.

## Risiken / offene Punkte

- **PocketID-Konfiguration:** Public-Client-Registrierung (PKCE, Redirect-URIs)
  und Access-Token-`aud`/`iss` müssen beim Backend-Bau abgeglichen werden.
- **Server-Datenhaltung:** SQLite-Datei + Keypair-Secret benötigen ein
  persistentes Volume und ein Backup-Konzept (außerhalb dieser Spec).
- **`generateMissionReport.ts`** muss um einen Unterschriften-Block erweitert
  werden (existiert dort heute nicht).

## Scope-Grenzen (YAGNI)

- Keine eIDAS-/qualifizierten Signaturen, keine externen Zertifizierungsstellen.
- Kein eingebettetes PAdES, keine PDF-Byte-Manipulation.
- Kein verteiltes Mehrgeräte-Signieren (beide Unterschriften auf einem Gerät).
- Keine GoBD-zertifizierte WORM-Revisionssicherheit (hash-chained Log genügt).
- Pro Nutzer genau **eine** gespeicherte Signatur.
