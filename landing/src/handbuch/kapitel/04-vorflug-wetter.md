---
titel: Vorflugkontrolle: Wetter
kurz: Aufbau der Vorflugkontrolle, Drohne, Nutzlast und Flughöhe wählen und das Wetter am Einsatzort bewerten.
---

Die **Vorflugkontrolle** ist die zweite Phase (**02 Vorflugkontrolle** in
der Phasenleiste). Ihr arbeitet sie an der Einsatzstelle vor dem ersten
Start durch; am Ende steht die Flugfreigabe. Dieses Kapitel erklärt den
Aufbau der Phase, die **Rahmenangaben** (Drohne, Nutzlast, Flughöhe) und den
Abschnitt **Wetterbedingungen**. Danach wisst ihr, ob das Wetter für eure
Drohne in der geplanten Höhe passt und wie lange noch.

## Aufbau der Vorflugkontrolle

![Die ganze Vorflugkontrolle mit zugeklappten Abschnitten: oben Einsatzort und Rahmenangaben, darunter drei Gruppen von Abschnitten mit Abzeichen](handbuch/vorflug-wetter-aufbau.webp "Die Vorflugkontrolle auf einen Blick. Jeder Abschnitt zeigt rechts ein Abzeichen, die farbige Kante links wiederholt die Ampelfarbe.")

Die Seite ist von oben nach unten so aufgebaut, wie ihr an der Einsatzstelle
vorgeht:

| Bereich | Abschnitt | Erklärt in |
|---|---|---|
| ganz oben | **Einsatzort**, der Ort, an dem der Trupp arbeitet | [Einsatzdaten erfassen](#einsatzdaten-einsatzort-festlegen) |
| ganz oben | Rahmenangaben: **Drohne auswählen**, **Nutzlast (Payload)**, **Max. Flughöhe** | diesem Kapitel |
| Standortabhängige Prüfungen | **Externe Prüfungen**, **Umgebungsprüfung**, **Flugverkehr (ADS-B)**, **Fluganmeldungen** | [Vorflugkontrolle: Umgebung und Luftraum](#vorflug-umgebung-luftraum) |
| Standortabhängige Prüfungen | **SORA Risikoklassifizierung** | [Vorflugkontrolle: SORA](#vorflug-sora) |
| Standortabhängige Prüfungen | **Wetterbedingungen** | diesem Kapitel |
| Standortabhängige Prüfungen | **Aufstiegsort**, **Flugbriefing** | [Vorflugkontrolle: Freigabe](#vorflug-freigabe) |
| Geräteprüfungen | **UAV**, **Remote Controller (A und B)** | [Vorflugkontrolle: Freigabe](#vorflug-freigabe) |
| Funktionskontrolle & Freigabe | **Erster Aufstieg & Freigabe** | [Vorflugkontrolle: Freigabe](#vorflug-freigabe) |

Ein paar Regeln gelten für alle Abschnitte:

- **Erst der Standort.** Externe Prüfungen, Umgebungsprüfung, Flugverkehr,
  SORA und Wetter brauchen den Einsatzort. Ist noch keiner gesetzt, sind
  sie ausgegraut und tragen ein Schloss mit **Standort wählen**. Wie ihr
  den Standort setzt, steht unter [Einsatzort festlegen](#einsatzdaten-einsatzort-festlegen).
- **Die App klappt für euch auf.** Beim Öffnen der Phase klappt sie den
  ersten Abschnitt mit einer Warnung auf und den ersten, der noch nicht
  erledigt ist. Beim allerersten Besuch ist außerdem **Wetterbedingungen**
  offen. Ihr könnt jeden Abschnitt jederzeit über seine Überschrift auf- und
  zuklappen.
- **Weiter.** Ist ein Abschnitt erledigt, steht unten der Knopf **Weiter**.
  Er klappt den Abschnitt zu und den nächsten auf.
- **Abzeichen.** Rechts in jeder Überschrift steht der Stand, z. B.
  **Gut**, **Achtung**, **Warnung** oder **Abgeschlossen**. Die Farbe
  allein trägt nie die Bedeutung, es steht immer ein Wort dabei.

> [!IM EINSATZ]
> Ihr müsst die Reihenfolge nicht stur einhalten. Bewährt hat sich: Standort
> setzen, Drohne und Flughöhe wählen, dann zuerst das Wetter ansehen. Ist das
> Wetter klar ungeeignet, spart ihr euch den Rest und meldet das gleich.

## Rahmenangaben

![Rahmenangaben: Auswahlfeld mit „DJI Matrice 350 RTK“, darunter die Nutzlasten mit Gewicht, zwei davon ausgewählt, die Gewichtszeile und die Flughöhen-Knöpfe mit 120 m aktiv](handbuch/vorflug-wetter-rahmenangaben.webp "Rahmenangaben: Zwei Nutzlasten sind montiert (blau), die Zeile darunter rechnet das Gesamtgewicht aus.")

Die drei Rahmenangaben stehen ganz oben, direkt unter dem Einsatzort. Sie
gelten für den ganzen Einsatz und fließen in die Wetterbewertung ein. Legt
sie deshalb fest, **bevor** ihr das Wetter beurteilt.

### Drohne auswählen

Tippt auf das Auswahlfeld unter **Drohne auswählen** und wählt euer
Luftfahrzeug. Die App kennt zwei Muster. Ihre Grenzwerte stammen aus den
Herstellerangaben und sind fest hinterlegt:

| | DJI Matrice 350 RTK | DJI Matrice 200 |
|---|---|---|
| Höchste Windgeschwindigkeit | 43 km/h (rund 12 m/s) | 43 km/h (rund 12 m/s) |
| Betriebstemperatur | −20 °C bis +50 °C | −20 °C bis +45 °C |
| Schutzart (Spritzwasser, Staub) | IP55 | IP43 |
| Leergewicht mit Akkus | 6.470 g | 3.800 g |
| Plätze für Nutzlasten | 3 | 1 |
| Höchste Nutzlast | 2.730 g | 2.000 g |

Neu angelegte Einsätze stehen auf der **DJI Matrice 350 RTK**.

### Nutzlast (Payload)

Unter **Nutzlast (Payload)** stehen nur die Kameras und Scheinwerfer, die zur
gewählten Drohne passen, jeweils mit Gewicht. Das kleine Symbol zeigt die
Art: Fotoapparat für Kamera, Thermometer für Wärmebild, Lampe für
Scheinwerfer.

- **Matrice 350 RTK:** Zenmuse H20 (678 g), H20T (828 g), H20N (878 g),
  H30 (920 g), H30T (920 g) und der Scheinwerfer Zenmuse S1 (760 g).
- **Matrice 200:** Zenmuse Z30 (556 g), XT2 (588 g) und XT2 (25 mm) (629 g).

So wählt ihr aus:

1. Tippt auf eine Nutzlast. Sie wird blau und bekommt einen Haken.
2. Bei der Matrice 350 RTK könnt ihr bis zu drei Nutzlasten gleichzeitig
   wählen. Rechts oben steht, wie viele Plätze belegt sind, z. B.
   **2/3 Slots belegt**. Sind alle drei belegt, sind die übrigen Knöpfe
   ausgegraut.
3. Die Matrice 200 hat nur einen Platz (**1 Slot – genau eine Nutzlast**).
   Tippt ihr eine andere an, ersetzt sie die bisherige.
4. Ein zweiter Tipp nimmt eine Nutzlast wieder ab.

Die Zeile darunter rechnet mit: **Leergewicht + Nutzlast (max.) =
Gesamtgewicht**. Wäre die Nutzlast zu schwer, färbt sich der Wert rot und
darunter steht **Max. Nutzlast um … überschritten**.

Wechselt ihr die Drohne, entfernt die App Nutzlasten, die nicht zur neuen
Drohne passen. Die hier gewählte Nutzlast ist dieselbe, die ihr später in der
Phase Flüge als **montierte Nutzlast** seht und bei jedem Start ändern könnt
(siehe [Nutzlast wechseln](#fluege-nutzlast-wechseln)).

### Max. Flughöhe

Wählt unter **Max. Flughöhe** die größte Höhe über Grund, die ihr in diesem
Einsatz fliegen wollt: **30 m**, **50 m**, **80 m**, **100 m**, **120 m** oder
**150 m**. Voreingestellt sind 120 m.

Die Flughöhe bestimmt, bis zu welcher Höhe die App den Wind bewertet (siehe
[Wind nach Höhe](#vorflug-wetter-wind-nach-hoehe)). Ändert ihr sie, lädt die
App die Wetterdaten neu.

> [!WICHTIG]
> Die App prüft nicht, ob die gewählte Höhe erlaubt ist. Wählt die Höhe, die
> ihr tatsächlich fliegt. Wer 30 m einstellt und dann auf 120 m steigt,
> bekommt eine zu freundliche Windbewertung.

## Die Wetterbewertung

![Abschnitt Wetterbedingungen mit Abzeichen „Achtung“, Gesamturteil „Eingeschränkte Flugbedingungen“ und neun Kacheln, Wind und Böen gelb mit „Achtung“](handbuch/vorflug-wetter-bewertung.webp "Ein ruhiger Tag am Boden, aber in 120 m Höhe liegt der Wind schon über 70 % der Drohnengrenze. Deshalb steht das Gesamturteil auf „Eingeschränkte Flugbedingungen“.")

Sobald der Einsatzort feststeht, holt die App die Wetterdaten aus dem
Internet und bewertet sie. Ihr seht von oben nach unten:

1. das **Gesamturteil** als großes Feld,
2. die **Kacheln** mit den einzelnen Messgrößen,
3. **METAR-Repräsentativität** und **DWD-Abgleich**,
4. **Empfehlungen** in Textform,
5. **Sonnenaufgang** und **Sonnenuntergang**,
6. **Wind nach Höhe**,
7. die **24-Stunden-Vorhersage**.

### Woher die Werte kommen

Die Hauptquelle ist **Open-Meteo**, ein Dienst, der Wettermodelle für jeden
beliebigen Punkt ausrechnet. Das sind also **berechnete Werte für euren
Einsatzort**, keine Messung vor Ort. Dazu kommen:

- **DWD (Deutscher Wetterdienst):** echte Messwerte der nächsten
  Wetterstation und amtliche Warnungen, nur in Deutschland.
- **K-Index:** die aktuelle Störung des Erdmagnetfelds, vom
  Weltraumwetterdienst der USA (NOAA).

Die App lädt diese Daten **einmal je Standort** (den K-Index einmal je
Einsatz) und speichert sie auf dem Gerät. Von selbst aktualisieren sie sich
nicht. So bleibt die Bewertung nachvollziehbar, auch wenn später das Netz
weg ist. Neue Daten holt ihr mit **Umgebungsdaten neu laden** (zwei
kreisende Pfeile oben rechts im Seitenkopf), aber nur mit Netz (siehe
[Neu laden und ohne Netz arbeiten](#vorflug-umgebung-luftraum-neu-laden-und-ohne-netz-arbeiten)).

> [!IM EINSATZ]
> Liegt zwischen Vorflugkontrolle und Start mehr als eine knappe Stunde, oder
> ändert sich das Wetter sichtbar, ladet die Umgebungsdaten neu und schaut
> euch die Bewertung noch einmal an. Euer Blick zum Himmel und auf die
> Bäume zählt mehr als jede Zahl.

### Das Gesamturteil

Das große Feld fasst alle Kacheln zusammen. Es zeigt immer den
**schlechtesten** Einzelwert:

| Feld | Bedeutung | Abzeichen in der Überschrift |
|---|---|---|
| **Gute Flugbedingungen** (grün) | Alle Kacheln im grünen Bereich. | **Gut** |
| **Eingeschränkte Flugbedingungen** (gelb) | Mindestens eine Kachel steht auf **Achtung**. Fliegen ist möglich, aber mit Vorsicht. | **Achtung** |
| **Flug nicht empfohlen** (rot) | Mindestens eine Kachel steht auf **Kritisch**. | **Warnung** |

Schon eine einzige kritische Kachel reicht für **Flug nicht empfohlen**.
Lest deshalb immer auch die Kacheln, nicht nur das Urteil.

### Die Kacheln

Jede Kachel zeigt eine Messgröße mit Wert und Einheit. Steht alles im
grünen Bereich, bleibt die Kachel weiß und ohne Zusatz. Weicht ein Wert ab,
wird die Kachel getönt, bekommt links eine farbige Kante und rechts ein
Wort:

- gelb mit **ACHTUNG**: Der Wert nähert sich einer Grenze.
- rot mit **KRITISCH**: Der Wert liegt jenseits der Grenze.

Bei **Wind** und **Böen** steht unter der Zahl manchmal **max. bei 120 m**
(oder einer anderen Höhe). Dann stammt der Wert nicht vom Boden, sondern aus
der Höhe, in der es am stärksten weht.

## Grenzwerte

Diese Tabelle zeigt, ab wann die App eine Kachel gelb oder rot färbt. Die
Werte stammen direkt aus der App.

| Kachel | Gut | Achtung | Kritisch (Warnung) |
|---|---|---|---|
| **Wind** (stärkster Mittelwind bis zur max. Flughöhe) | unter 70 % der Drohnengrenze | ab 70 % der Drohnengrenze | über der Drohnengrenze |
| **Böen** (stärkste Böe bis zur max. Flughöhe) | unter 70 % der Drohnengrenze | ab 70 % der Drohnengrenze | über der Drohnengrenze |
| **K-Index** | unter 4 | 4 bis unter 6 | ab 6 |
| **Temperatur** | mehr als 5 °C innerhalb des Betriebsbereichs | in den letzten 5 °C vor einer Grenze | außerhalb des Betriebsbereichs |
| **Niederschlag** (Wahrscheinlichkeit) | 0 % und kein Niederschlag | 1 bis 30 % | über 30 % (ohne Schutzart: sobald es regnet) |
| **Sichtweite** | ab 5 km | 1 bis unter 5 km | unter 1 km |
| **Luftfeuchtigkeit** | unter 80 % | 80 bis 90 % | über 90 % |
| **Luftdruck** | 980 bis 1050 hPa | 950 bis unter 980 oder über 1050 bis 1070 hPa | unter 950 oder über 1070 hPa |
| **Taupunkt** (Abstand zur Lufttemperatur) | mehr als 4 °C | 2 bis 4 °C | unter 2 °C |
| **Wetterwarnung (DWD)** | keine Warnung | Wetterwarnung oder markante Warnung | Unwetterwarnung oder extreme Unwetterwarnung |

Die Kachel für die DWD-Warnung erscheint nur, wenn gerade eine amtliche
Warnung gilt. Sie steht dann als erste Kachel ganz oben.

### Drohnenabhängige Grenzen

Wind, Böen, Temperatur und Niederschlag hängen von der gewählten Drohne ab.
Mit den beiden mitgelieferten Drohnen gilt:

| | DJI Matrice 350 RTK | DJI Matrice 200 |
|---|---|---|
| Wind und Böen: **Achtung** | ab 30,1 km/h | ab 30,1 km/h |
| Wind und Böen: **Kritisch** | über 43 km/h | über 43 km/h |
| Temperatur: **Achtung** | −20 bis −15 °C oder über 45 bis 50 °C | −20 bis −15 °C oder über 40 bis 45 °C |
| Temperatur: **Kritisch** | unter −20 °C oder über 50 °C | unter −20 °C oder über 45 °C |
| Niederschlag | hat Schutzart (IP55): Regel nach Wahrscheinlichkeit | hat Schutzart (IP43): Regel nach Wahrscheinlichkeit |

Die strengere Regel „Kritisch, sobald es regnet“ gilt nur für Drohnen ohne
Schutzart. Beide mitgelieferten Drohnen haben eine.

### Die Messgrößen in Alltagssprache

**Wind und Böen.** Der Wind ist der Mittelwert über einige Minuten. Böen sind
die kurzen Stöße obendrauf, oft deutlich stärker. Eine Drohne kommt mit
gleichmäßigem Wind besser zurecht als mit Böen: Ein Stoß kann sie versetzen,
kippen oder gegen ein Hindernis drücken, und das Halten der Position kostet
Akku. Deshalb bewertet die App Böen mit derselben Grenze wie den Wind.
Plant genug Reserve für den Rückflug gegen den Wind ein.

**K-Index.** Der K-Index (Kp, Skala 0 bis 9) misst, wie stark das
Erdmagnetfeld gerade durch Sonnenaktivität gestört ist. Bei starker Störung
werden GPS-Positionen ungenauer und der Kompass der Drohne kann falsch
anzeigen. Die Drohne driftet dann, hält die Position schlechter oder
findet den Startpunkt nicht genau. Der Wert gilt weltweit, nicht nur für
euren Ort. Siehe auch [K-Index](#fragen-glossar) im Glossar.

**Temperatur.** Bei Kälte liefern Akkus deutlich weniger, die Flugzeit sinkt.
Bei Hitze droht Überhitzung von Akkus und Elektronik. Liegt die Temperatur
unter 10 °C, erinnert die App auch im grünen Bereich daran, die Akkus warm zu
halten.

**Niederschlag.** Die Kachel zeigt die Regenwahrscheinlichkeit in Prozent.
Die Schutzart (IP55, IP43) sagt, wie gut die Drohne gegen Spritzwasser
geschützt ist. Sie macht die Drohne nicht wasserdicht.

**Sichtweite.** Unter 1 km ist ein Flug in Sichtweite praktisch nicht
möglich. Unter 5 km müsst ihr besonders darauf achten, die Drohne im Blick zu
behalten. Kleine Sichtweiten zeigt die App in Metern an.

**Luftfeuchtigkeit.** Sehr feuchte Luft kann an der Elektronik kondensieren.
Nach Flügen in feuchter Luft die Drohne trocknen lassen.

**Luftdruck.** Ungewöhnlich hoher oder tiefer Luftdruck kann das Flugverhalten
verändern. Die App zeigt den Luftdruck **am Standort**, nicht den auf
Meereshöhe umgerechneten Wert aus dem Wetterbericht. In höher gelegenen
Gegenden ist er deshalb von Natur aus niedriger.

**Taupunkt.** Der Taupunkt ist die Temperatur, bei der die Feuchtigkeit in
der Luft als Wasser ausfällt. Liegt die Lufttemperatur nur noch wenige Grad
darüber, bildet sich schnell Nebel, und an Kameraglas, Sensoren und Rotoren
schlägt sich Wasser nieder. Die Kamera beschlägt, Hindernissensoren sehen
schlechter. Sinkt die Temperatur unter null, kann dieser Niederschlag
gefrieren und die Rotoren vereisen. Die App bewertet deshalb den **Abstand**
zwischen Lufttemperatur und Taupunkt, nicht den Taupunkt selbst.

> [!HINTERGRUND]
> Ein Beispiel: 13 °C Lufttemperatur und 6 °C Taupunkt sind 7 °C Abstand, das
> ist unkritisch. Bei 11 °C und 10 °C Taupunkt ist der Abstand nur noch 1 °C.
> Die Kachel wird rot, auch wenn 10 °C allein harmlos klingt.

## Flug nicht empfohlen

![Sturmbeispiel: Gesamturteil „Flug nicht empfohlen“, erste Kachel „Unwetterwarnung (DWD) – Schwere Sturmböen“, dazu Wind, Böen und Niederschlag kritisch, K-Index und Taupunkt mit Achtung](handbuch/vorflug-wetter-warnung.webp "Beispiel bei Sturm: Die amtliche Unwetterwarnung steht als erste Kachel. Wind, Böen und Niederschlag sind kritisch.")

Steht das Gesamturteil auf **Flug nicht empfohlen**, passiert Folgendes:

- Der Abschnitt **Wetterbedingungen** trägt das Abzeichen **Warnung** und
  eine rote Kante. Beim Öffnen der Phase klappt die App ihn auf, sofern
  nicht schon ein Abschnitt weiter oben warnt.
- Unten im Abschnitt fehlt der Knopf **Weiter**. Den nächsten Abschnitt
  klappt ihr selbst auf.
- Im Abschnitt **Erster Aufstieg & Freigabe** steht ein rotes Feld
  **Empfehlung gegen Freigabe**. Darin listet die App jede kritische Kachel
  auf, z. B. „Wetter: Böen 82.7 km/h“. Der Knopf **Flug nicht freigeben**
  ist dann rot gefüllt.

![Knöpfe „Flug freigeben“ und „Flug nicht freigeben“, darunter das rote Feld „Empfehlung gegen Freigabe“ mit vier Wetter-Gründen](handbuch/vorflug-wetter-empfehlung-gegen-freigabe.webp "Die kritischen Wetterwerte landen als Gründe in der Freigabe. „Flug freigeben“ bleibt trotzdem bedienbar.")

**Flug nicht empfohlen** ist ein Hinweis, keine Sperre. Die App verhindert
die Freigabe absichtlich nicht: Im Einsatz kann es gute Gründe geben, zum
Beispiel einen kurzen Flug im Windschatten. Was bei Freigabe und Ablehnung
genau passiert, steht unter [Empfehlung gegen Freigabe](#vorflug-freigabe-empfehlung-gegen-freigabe).

> [!ACHTUNG]
> Wer trotz **Flug nicht empfohlen** freigibt, sollte den Grund festhalten,
> etwa im Flugbriefing oder als Ereignis in der Phase Flüge. Die kritischen
> Werte stehen auch im PDF-Bericht der Vorflugkontrolle.

## METAR-Repräsentativität

Unter den Kacheln nennt die App die nächste **METAR-Station**. METAR ist die
standardisierte Wettermeldung der Flugplätze. Die App zeigt keine
METAR-Meldungen an. Sie nutzt die Station als Maßstab: Wie weit liegt der
Einsatzort von der nächsten regelmäßigen Wetterbeobachtung entfernt?

| Entfernung zur Station | Abzeichen | Hinweis der App |
|---|---|---|
| unter 10 km | **Gut** | Die Station liegt nah genug, damit die Wetterdaten in der Regel gut repräsentativ sind. |
| 10 bis unter 30 km | **Achtung** | Lokale Abweichungen am Einsatzort sollten aktiv mitgedacht werden. |
| ab 30 km | **Warnung** | Die Wetterdaten sind nur eingeschränkt repräsentativ. |

Repräsentativ heißt: Die Werte passen wahrscheinlich zu dem, was ihr vor Ort
erlebt. Je weiter die nächste Beobachtung weg ist, desto eher weicht euer
Einsatzort ab, etwa im Tal, am Waldrand, an der Küste oder in einer
Häuserschlucht. Dieses Abzeichen zählt **nicht** zum Gesamturteil.

Die App kennt nur Stationen in Deutschland. Außerhalb steht dort: **Für
diesen Standort ist keine METAR-Station im lokalen Deutschland-Datenbestand
verfügbar.**

## DWD-Abgleich und Unwetterwarnungen

![DWD-Abgleich mit Abzeichen „Warnung“: amtliche Unwetterwarnung vor schweren Sturmböen, darunter die Tabelle Open-Meteo gegen DWD-Messung und der Hinweis, dass die Messung ungünstiger ist](handbuch/vorflug-wetter-dwd.webp "Der DWD-Abgleich: oben die amtlichen Warnungen, darunter die Messwerte der nächsten Station neben den Modellwerten. Abweichende Messwerte sind farbig.")

Der Kasten **DWD-Abgleich** stellt den berechneten Werten echte Messungen
gegenüber. Er hat drei Teile.

**Amtliche Warnungen.** Oben stehen die Warnungen des Deutschen Wetterdienstes
für eure Gemeinde oder euren Kreis, z. B. „Amtliche Warnungen für Stadt
Hannover“. Jede Warnung zeigt Stufe, Ereignis, Zeitraum und Beschreibung.
Gibt es keine, steht dort **Keine amtlichen Wetterwarnungen**. Die vier
Stufen und ihre Wirkung:

| Stufe | Kachel im Raster | Wirkung aufs Gesamturteil |
|---|---|---|
| **Wetterwarnung** | **Wetterwarnung (DWD)**, gelb | höchstens **Eingeschränkte Flugbedingungen** |
| **Markante Warnung** | **Wetterwarnung (DWD)**, gelb | höchstens **Eingeschränkte Flugbedingungen** |
| **Unwetterwarnung** | **Unwetterwarnung (DWD)**, rot | **Flug nicht empfohlen** |
| **Extreme Unwetterwarnung** | **Unwetterwarnung (DWD)**, rot | **Flug nicht empfohlen** |

Die Kachel zeigt das schwerste Ereignis. Darunter steht, ab wann (falls die
Warnung erst später beginnt) und bis wann sie gilt, und gegebenenfalls
„+1 weitere“. Abgelaufene Warnungen zählen nicht.

**Messwerte der Station.** Die Tabelle stellt für Wind, Böen, Temperatur,
Sichtweite, Luftfeuchte und Niederschlag der letzten Stunde zwei Spalten
nebeneinander: **Open-Meteo** (berechnet) und **DWD** (gemessen). Darüber
stehen Name und Entfernung der Station und die Uhrzeit der Messung. Gelb oder
rot ist ein Messwert, wenn er nach denselben Grenzwerten wie oben auffällig
ist. Der Wind gilt wie in den Kacheln für 10 m Höhe.

**Hinweis bei Abweichung.** Fällt ein gemessener Wert ungünstiger aus als der
berechnete, schreibt die App darunter: **Die DWD-Messung ist ungünstiger als
die Open-Meteo-Daten (…). Im Zweifel den strengeren Wert zugrunde legen.**

> [!WICHTIG]
> Die Messwerte fließen **nicht** in die Kacheln und das Gesamturteil ein,
> nur die amtlichen Warnungen tun das. Das Abzeichen am DWD-Kasten bewertet
> Messwerte und Warnungen zusammen. Steht dort **Warnung**, während das
> Gesamturteil grün ist, nehmt den strengeren Wert, wie es die App empfiehlt.

Weitere Meldungen im Kasten:

- **Der Standort liegt außerhalb des DWD-Abdeckungsbereichs (nur
  Deutschland).** Ihr seid im Ausland oder sehr nah an der Grenze. Es gibt
  nur die berechneten Werte.
- **DWD-Abgleich derzeit nicht verfügbar.** Der Dienst war nicht erreichbar.
  Versucht es später mit **Umgebungsdaten neu laden**.

## Empfehlungen

![Kasten „Empfehlungen“ mit sieben Hinweisen, u. a. zur Unwetterwarnung, zu Wind und Böen über dem Limit der Drohne, zum K-Index und zu niedrigen Temperaturen](handbuch/vorflug-wetter-empfehlungen.webp "Zu jeder gelben oder roten Kachel schreibt die App einen Satz, was das für den Flug bedeutet.")

Der Kasten **Empfehlungen** übersetzt die Kacheln in Sätze. Für jede gelbe
oder rote Kachel steht dort ein Hinweis, bei Wind, Böen und Temperatur mit
dem Namen eurer Drohne. Rote Kacheln enden meist mit „Flug nicht empfohlen“.
Ist alles grün, fehlt der Kasten. Eine Ausnahme: Unter 10 °C erscheint auch
bei grüner Temperatur der Hinweis, die Akkus warm zu halten.

Nehmt die Empfehlungen ins Flugbriefing mit. Sie sagen auch dem Teil des
Trupps, der nicht auf die Kacheln schaut, worauf er achten muss.

## Sonnenzeiten

![Zwei Felder: Sonnenaufgang 07:51 und Sonnenuntergang 18:20](handbuch/vorflug-wetter-sonnenzeiten.webp "Sonnenaufgang und Sonnenuntergang am Einsatzort für den heutigen Tag.")

Die beiden Felder zeigen Sonnenaufgang und Sonnenuntergang **am Einsatzort**
für den heutigen Tag. Sie helfen bei der Planung: Wie lange habt ihr noch
Tageslicht? Müsst ihr Beleuchtung, Wärmebild oder Scheinwerfer einplanen?
Läuft der Einsatz in die Dämmerung, besprecht das rechtzeitig im
Flugbriefing.

## Wind nach Höhe

![Tabelle „Wind nach Höhe“ von 10 m bis 150 m: am Boden 12 km/h aus WSW, in 120 m 31 km/h aus W; die Zeile 150 m ist blass](handbuch/vorflug-wetter-hoehenwind.webp "Am Boden kaum Wind, in 120 m fast das Dreifache. Die blasse Zeile liegt über der gewählten Flughöhe.")

Am Boden bremsen Gelände, Bäume und Häuser den Wind. Schon wenige Dutzend
Meter höher fehlt diese Bremse, und der Wind ist oft doppelt so stark und
dreht seine Richtung. **Am Boden ruhig heißt nicht oben ruhig.** Genau dort
fliegt aber eure Drohne.

Die Tabelle **Wind nach Höhe** zeigt deshalb den Wind für die aktuelle Stunde
in mehreren Höhen:

- **Zeilen:** 10 m, dann alle 30 m bis zur gewählten Flughöhe (bei 30 m und
  50 m alle 10 m) und eine Stufe darüber. Diese oberste Zeile ist blass: Sie
  liegt über eurer Flughöhe und zählt nicht zur Bewertung.
- **Richtung:** z. B. **WSW (245°)**. Die Angabe nennt die Himmelsrichtung,
  **aus der** der Wind kommt. Der kleine Pfeil zeigt in diese Richtung.
- **Werte:** zuerst der Mittelwind, dann nach dem Pfeil **↑** die Böen.

Die Kacheln **Wind** und **Böen** nehmen den höchsten Wert aus allen Zeilen
bis zur Flughöhe. Deshalb steht dort oft **max. bei 120 m**.

> [!HINTERGRUND]
> Das Wettermodell liefert Wind in 10, 80, 120 und 180 m Höhe. Die Höhen
> dazwischen rechnet die App gleichmäßig aus. Für Böen gibt es nur einen
> Bodenwert. Die Böen in der Höhe schätzt die App, indem sie den Bodenwert
> mit der Höhe hochrechnet (bis zum 1,5-Fachen in 180 m). Das ist eine
> grobe Schätzung. Beobachtet die Drohne nach dem Start: Muss sie stark
> gegenhalten oder warnt die Steuerung vor Wind, gilt das, was ihr seht.

## 24-Stunden-Vorhersage

![24-Stunden-Vorhersage von 20:00 bis 23:00: Temperatur, Wind, Böen, Feuchte, Niederschlag, Sicht, Druck, Taupunkt als farbige Zellen; Böen, Niederschlag und Taupunkt teilweise gelb](handbuch/vorflug-wetter-vorhersage.webp "Seitlich gewischt zum Abend: Böen und Regenwahrscheinlichkeit nehmen zu, der Taupunkt rückt an die Temperatur heran.")

Die Vorhersage ganz unten zeigt die nächsten 24 Stunden, beginnend mit der
aktuellen Stunde. Auf dem Handy passen nur wenige Stunden nebeneinander.
**Wischt seitlich**, um spätere Stunden zu sehen. Die Zeilenbeschriftung
links bleibt stehen.

Oben steht die Uhrzeit mit einem Wettersymbol (Sonne, Wolken, Nebel, Regen,
Schnee, Gewitter). Darunter acht Zeilen: **Temperatur**, **Wind**, **Böen**,
**Feuchte**, **Niederschl.**, **Sicht**, **Druck** und **Taupunkt**. Jede
Zelle ist grün, gelb oder rot nach denselben Grenzwerten wie die Kacheln.

Drei Unterschiede zu den Kacheln:

- Wind und Böen gelten hier **in 10 m Höhe**, nicht in eurer Flughöhe. In
  der Höhe kann es deutlich stärker wehen.
- Der Niederschlag wird nur nach der Wahrscheinlichkeit bewertet.
- K-Index und DWD-Warnungen fehlen in der Vorhersage.

> [!IM EINSATZ]
> Nutzt die Vorhersage für die Frage: Wie lange geht es noch? Seht ihr in
> zwei Stunden gelbe oder rote Böen, plant die wichtigsten Flüge vorher,
> haltet Akkus bereit und legt fest, ab wann ihr abbrecht.

## Was tun, wenn …

**… der Abschnitt Wetterbedingungen ausgegraut ist und „Standort wählen“
zeigt?** Es ist noch kein Einsatzort gesetzt. Setzt ihn oben in der
Leiste **Einsatzort** (siehe [Einsatzort festlegen](#einsatzdaten-einsatzort-festlegen)).

**… sich der Ladekreis dreht und nichts kommt?** Die App braucht für den
ersten Abruf Netz. Prüft den Empfang. Gelingt der Abruf nicht, erscheint
statt der Kacheln eine rote Fehlermeldung. Versucht es dann mit Netz noch
einmal über **Umgebungsdaten neu laden**.

**… die Werte nicht zu dem passen, was ihr seht?** Die Kacheln sind
berechnet, nicht gemessen. Schaut in den DWD-Abgleich und auf die
METAR-Repräsentativität. Vertraut im Zweifel dem strengeren Wert und eurer
eigenen Beobachtung.

**… die Bewertung veraltet wirkt?** Die App lädt Wetterdaten nur einmal je
Standort. Tippt oben rechts auf **Umgebungsdaten neu laden**.

**… ihr die Flughöhe ändert?** Die App lädt das Wetter automatisch neu und
bewertet den Wind bis zur neuen Höhe.

**… ihr verlegt?** Am neuen Standort lädt die App Wetter und
DWD-Daten neu (siehe [Standort wechseln](#fluege-standort-wechseln-verlegen)).

**… das Gesamturteil rot ist, ihr aber trotzdem fliegen müsst?** Die App
sperrt nichts. Entscheidet bewusst, haltet den Grund fest und lest
[Empfehlung gegen Freigabe](#vorflug-freigabe-empfehlung-gegen-freigabe).
