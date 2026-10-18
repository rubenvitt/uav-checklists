# Handbuch — Schreibregeln

Das Handbuch unter `/handbuch/` erklärt die Flugmappe für **Einsatzkräfte**:
Fernpiloten, Luftraumbeobachter, Truppführer, Bildauswerter. Wer es liest,
kennt den Einsatzdienst, aber nicht die Technik dahinter. Die Kapitel liegen
als Markdown in `kapitel/`; `handbuch.plugin.ts` macht beim Build HTML daraus.

## Dateien

- Dateiname `NN-slug.md`, z. B. `03-einsatzdaten.md`. Die Nummer bestimmt die
  Reihenfolge, der Slug ist der Anker (`#einsatzdaten`).
- Kopf jeder Datei:

  ```markdown
  ---
  titel: Einsatzdaten erfassen
  kurz: Ein Satz, der sagt, was in diesem Kapitel passiert.
  ---
  ```

- Kein `#` im Kapitel — der Titel kommt aus `titel`. Abschnitte beginnen mit
  `##` (erscheinen im Inhaltsverzeichnis), Unterabschnitte mit `###`.

## Anker und Querverweise

Jede Überschrift bekommt die ID `<slug>-<überschrift>`: Kleinbuchstaben,
ä→ae, ö→oe, ü→ue, ß→ss, alles andere wird zu `-`. Beispiel: `## Der K-Index`
in `05-vorflug-wetter.md` → `#vorflug-wetter-der-k-index`. Auf ganze Kapitel
verweist `#<slug>`.

## Bilder

```markdown
![Was auf dem Bild zu sehen ist (Alt-Text)](handbuch/wetter-ampel.webp "Bildunterschrift, die erklärt, worauf man achten soll.")
```

- Pfade sind relativ zu `public/screenshots/`. Vorhandene Aufnahmen der
  Startseite (`wetter.webp`, `sail.webp` …) dürfen mitbenutzt werden,
  eigene liegen unter `handbuch/`.
- Mehrere Bilder in einem Absatz (ohne Leerzeile dazwischen) stehen
  nebeneinander — gut für Vorher/Nachher oder hell/dunkel.
- Erzeugt werden die Bilder mit `tools/screenshots/handbuch.mjs`, siehe dort.

## Hinweiskästen

```markdown
> [!TIPP]
> Text …
```

Arten: `TIPP` (Abkürzung, Bequemlichkeit), `WICHTIG` (sonst geht etwas
schief), `ACHTUNG` (Sicherheit, Datenverlust, rechtliche Folgen),
`HINTERGRUND` (warum etwas so ist — darf man überspringen), `IM EINSATZ`
(so macht man es an der Einsatzstelle in der Praxis).

## Ton und Sprache

- Ansprache mit **ihr** (wie die Startseite): „Tippt auf **Flug starten**."
- Kurze Sätze. Ein Gedanke pro Satz. Aktiv statt Passiv.
- Bedienelemente **fett** und genau so geschrieben, wie sie in der App
  stehen — im Zweifel im Quellcode (`src/`) nachsehen.
- Fachbegriffe (SORA, GRC, K-Index, ADS-B, Block Off …) beim ersten Auftreten
  im Kapitel in einem Halbsatz erklären und auf das Glossar verweisen.
- Keine Entwicklerbegriffe: nicht „localStorage", „API", „Komponente",
  „State", „Cache" — sondern „auf diesem Gerät gespeichert", „aus dem
  Internet abgerufen", „Abschnitt", „zwischengespeichert".
- Schritte als nummerierte Liste, Erklärungen als Fließtext.
- Nur beschreiben, was die App wirklich tut. Wenn sich etwas nicht eindeutig
  aus dem Code ergibt, lieber weglassen.
- Die App trifft keine Entscheidungen: Die Verantwortung für den Flug liegt
  immer bei der verantwortlichen Person. Das darf man an passender Stelle
  sagen, aber nicht in jedem Absatz.
