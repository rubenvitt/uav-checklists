---
titel: Vorflugkontrolle: Umgebung und Luftraum
kurz: Was um den Einsatzort liegt, wer gerade in der Luft ist, welche Karten ihr extern prüft und wen ihr informiert.
---

Bevor die Drohne steigt, muss der Trupp wissen, was um den Startplatz herum liegt und wer sich den Luftraum mit ihm teilt. Diese Prüfungen macht ihr in der Vorflugkontrolle an der Einsatzstelle, am besten zusammen mit dem Wetter. Danach kennt ihr Hindernisse und Schutzgebiete in der Nähe und den aktuellen Flugverkehr, und Leitstelle und Polizei wissen Bescheid. Unter der Zwischenüberschrift **Standortabhängige Prüfungen** stehen dafür vier Abschnitte:

- **Externe Prüfungen**: Links zu den amtlichen Karten und Diensten der Flugsicherung.
- **Umgebungsprüfung**: Krankenhäuser, Bahnstrecken, Stromleitungen und andere Objekte im Umkreis von 1,5 km.
- **Flugverkehr (ADS-B)**: bemannte Luftfahrzeuge, die gerade im Umkreis von 10 km unterwegs sind.
- **Fluganmeldungen**: eine Abhakliste, wen ihr vor dem Start informiert habt.

Wie die Vorflugkontrolle insgesamt aufgebaut ist, steht unter [Aufbau der Vorflugkontrolle](#vorflug-wetter-aufbau-der-vorflugkontrolle).

## Überblick

![Die vier standortabhängigen Abschnitte, zugeklappt, mit ihren Abzeichen](handbuch/vorflug-umgebung-luftraum-uebersicht.webp "Schon zugeklappt zeigt jeder Abschnitt seinen Stand: 11 gefundene Objektarten, Tiefflug in der Nähe, 2 von 5 Stellen informiert.")

Die ersten drei Abschnitte brauchen einen Einsatzort. Solange keiner gesetzt ist, sind sie gesperrt und zeigen ein Schloss mit **Standort wählen** (siehe [Einsatzort festlegen](#einsatzdaten-einsatzort-festlegen)). Die **Fluganmeldungen** könnt ihr auch ohne Einsatzort abhaken.

Rechts in der Kopfzeile jedes Abschnitts steht ein Abzeichen mit einem Wort, links hat der Abschnitt eine farbige Kante:

- **Grün**: nichts Auffälliges (z. B. **Frei**, **Kein Verkehr**).
- **Gelb**: Es gibt etwas zu beachten (z. B. **11 Kategorien**, **1 im Tiefflug**, **Achtung** beim Flugverkehr, **2/5**).
- **Rot**: Hier liegt ein ernster Punkt (z. B. **Achtung** in der Umgebungsprüfung, **Tiefflug in der Nähe**).

Ein Abschnitt mit rotem Status klappt beim Öffnen der Vorflugkontrolle von selbst auf, damit ihr ihn nicht überseht. Er zeigt dann auch keinen **Weiter**-Knopf am Ende.

> [!HINTERGRUND]
> Die Ergebnisse gelten je Standort. Nach dem Verlegen prüft die App Umgebung und Flugverkehr am neuen Ort neu, und die Fluganmeldungen beginnen wieder bei null (siehe [Standort wechseln](#fluege-standort-wechseln-verlegen)).

## Externe Prüfungen

![Abschnitt Externe Prüfungen mit drei Links](handbuch/vorflug-umgebung-luftraum-externe-pruefungen.webp "Die drei Links öffnen amtliche Seiten in einem neuen Fenster. Die GeoZones-Karte springt direkt zum Einsatzort.")

Dieser Abschnitt enthält keine eigenen Daten. Er führt euch mit einem Fingertipp zu drei Seiten der Flugsicherung, die ihr vor jedem Flug selbst prüft:

- **DFS GeoZones Karte** („Geografische UAS-Zonen prüfen“): die amtliche Karte der Deutschen Flugsicherung (DFS) zu den Drohnen-Flugbeschränkungsgebieten, auch „dipul-Karte“ genannt. Die App öffnet sie bereits an eurem Standort. Dort seht ihr Kontrollzonen von Flughäfen, Naturschutzgebiete, Industrieanlagen und andere Gebiete, in denen für Drohnen besondere Regeln gelten.
- **Temporäre Betriebseinschränkungen** („NOTAMs und aktuelle Einschränkungen“): kurzfristige Sperrungen, etwa bei Großveranstaltungen, Staatsbesuchen oder Unglücksstellen. Ein NOTAM („Notice to Airmen“) ist eine amtliche Kurzmeldung an alle Luftfahrer über eine vorübergehende Änderung im Luftraum.
- **Flugverkehrskontrollfreigabe** („ATC-Freigabe beantragen“): das Antragsportal, wenn ihr in einem kontrollierten Luftraum fliegen müsst, z. B. in der Kontrollzone eines Flughafens. ATC steht für „Air Traffic Control“, die Flugverkehrskontrolle.

Die Links brauchen Netz. Die App merkt sich nicht, ob ihr die Seiten geöffnet habt. Deshalb zeigt dieser Abschnitt nie ein Abzeichen und nie einen **Weiter**-Knopf. Dass ihr geprüft habt, bestätigt ihr später im [Flugbriefing](#vorflug-freigabe-flugbriefing) mit den Punkten **NOTAM** und **Geo-Zonen**.

> [!WICHTIG]
> Die **Umgebungsprüfung** weiter unten ersetzt die GeoZones-Karte nicht. Sie stützt sich auf eine frei gepflegte Karte und kann lückenhaft sein. Verbindlich sind die Angaben der DFS.

## Umgebungsprüfung

Sobald der Einsatzort feststeht, sucht die App im Internet nach Objekten in der Nähe, die für einen Drohnenflug wichtig sind. Die Daten stammen aus OpenStreetMap, einer freien Weltkarte, die von Freiwilligen gepflegt wird. Das Ergebnis speichert die App für diesen Standort auf dem Gerät. Ihr seht es also auch später noch, wenn das Netz weg ist.

![Umgebungsprüfung mit elf gefundenen Objektarten](umgebung.webp "Typisches Ergebnis im Stadtgebiet: je Objektart eine Kachel mit Anzahl, Name, Entfernung und Himmelsrichtung.")

### Was die App sucht

Die App sucht im Umkreis von **1,5 km** um den Standort. Zwei Arten sucht sie nur im Umkreis von **500 m**, weil sie in der Stadt sehr dicht stehen: Strommasten und Autobahnen. Gefundene Objekte stehen nach Art geordnet in Kacheln:

| Kachel | Was dazu zählt |
|---|---|
| **Flugplätze & Heliports** | Flugplätze und Hubschrauberlandeplätze |
| **Militärische Anlagen** | militärisches Gelände und Einrichtungen |
| **Justizvollzugsanstalten** | Gefängnisse (JVA) |
| **Krankenhäuser** | Kliniken und Krankenhäuser |
| **Sicherheitsbehörden** | Polizeidienststellen |
| **Feuerwehr / BOS** | Feuer- und Rettungswachen |
| **Naturschutzgebiete** | ausgewiesene Naturschutzgebiete |
| **Energieanlagen** | Kraftwerke, Umspannwerke, Windräder und andere Erzeuger |
| **Industrieanlagen** | Industriegebiete |
| **Hafenanlagen** | Häfen und Sportboothäfen |
| **Freibäder** | Schwimmbäder, Schwimmbecken und Spaßbäder |
| **Bahnanlagen** | Eisenbahnstrecken, Bahnhöfe und Haltepunkte |
| **Bundesfernstraßen** | Autobahnen und autobahnähnliche Schnellstraßen (500 m) |
| **Bundeswasserstraßen** | Flüsse und Kanäle mit Schiffsverkehr |
| **Stromleitungen & -masten** | Hochspannungsmasten (500 m) |
| **Mobilfunkmasten** | Funktürme und Sendemasten |

### Warum diese Objekte wichtig sind

Die Liste folgt weitgehend den Gebieten, für die die Luftverkehrs-Ordnung (§ 21h LuftVO) besondere Regeln für Drohnen vorsieht. Dazu kommen Punkte, die im Einsatz praktisch stören können. Was davon für euren Einsatz gilt und welche Ausnahmen für BOS-Einsätze greifen, regelt eure Organisation.

- **Flugplätze und Hubschrauberlandeplätze**: Hier starten und landen bemannte Luftfahrzeuge in geringer Höhe, genau dort, wo auch eure Drohne fliegt.
- **Krankenhäuser**: Viele Kliniken haben einen Hubschrauberlandeplatz. Rettungshubschrauber fliegen dort tief und oft ohne Vorwarnung an. Rechnet bei einem Krankenhaus in der Nähe immer mit Hubschrauberverkehr, auch wenn die Kachel **Flugplätze & Heliports** fehlt.
- **Militär, JVA, Polizei, Verfassungsorgane**: Sicherheitsbereiche, über denen Drohnenflüge eingeschränkt sind und die auf Drohnen empfindlich reagieren.
- **Feuerwehr / BOS**: Wachen mit Ein- und Ausfahrten. In der Nähe kann zudem ein Landeplatz für Rettungshubschrauber liegen.
- **Bahnanlagen**: Oberleitungen sind schwer zu sehen. Ein Absturz auf die Gleise legt den Bahnverkehr lahm. Deshalb fragt die App bei Bahnanlagen in den Fluganmeldungen nach DB Netz (siehe unten).
- **Autobahnen und Schnellstraßen**: Eine Drohne lenkt Fahrer ab. Ein Absturz auf die Fahrbahn gefährdet unmittelbar Menschen.
- **Bundeswasserstraßen**: Schiffsverkehr. Die App fragt dann nach dem Wasserstraßen- und Schifffahrtsamt.
- **Strommasten und Umspannwerke**: Leitungen sind Hindernisse, die man aus der Entfernung kaum erkennt. Starke Magnetfelder können zudem den Kompass der Drohne stören.
- **Mobilfunkmasten und Industrieanlagen**: mögliche Störquellen für Funk und Kompass, außerdem hohe Hindernisse.
- **Naturschutzgebiete**: Tiere können durch die Drohne aufgescheucht werden. Für Überflüge gelten Einschränkungen.
- **Freibäder**: Menschenansammlungen und Privatsphäre.

### So lest ihr die Liste

Jede Kachel zeigt oben die Objektart und rechts die Zahl der Funde. Darunter steht je Fund eine Zeile mit dem Namen und rechts **Entfernung und Himmelsrichtung**, z. B. „856 m SW“. Die Richtung gilt von eurem Standort aus gesehen. Die App nutzt acht Richtungen: N, NO, O, SO, S, SW, W, NW. Ein „856 m SW“ heißt also: etwa 850 m Luftlinie in Richtung Südwesten.

Bei Bahnstrecken, Straßen, Wasserstraßen und Strommasten steht statt einer Entfernung **im Suchradius**. Solche langen Objekte haben keinen sinnvollen Mittelpunkt. Die App sagt deshalb nur, dass sie im Suchgebiet liegen. Wo genau, seht ihr auf der Karte. Von diesen Arten listet die App höchstens fünf Einträge.

> [!ACHTUNG]
> Bei Flächen wie Naturschutzgebieten, Industriegebieten oder Flugplätzen misst die App bis zur **Mitte** der Fläche. Der Rand kann viel näher liegen. Prüft die tatsächliche Grenze auf der GeoZones-Karte.

Einträge mit gleichem Namen fasst die App zusammen und zeigt nur den nächsten. Bei Strommasten bedeutet das: Die Kachel zeigt immer nur einen Eintrag **Strommast**, egal wie viele Masten in der Nähe stehen. Sie sagt also nur, *dass* es Masten gibt. Hat ein Objekt in der Karte keinen Namen, steht dort eine allgemeine Bezeichnung wie „Krankenhaus“ oder „Umspannwerk“.

### Statusanzeige

Das Abzeichen der **Umgebungsprüfung** zeigt:

- **Frei** (grün): Die App hat nichts gefunden. Im Abschnitt steht „Keine relevanten Objekte im Umkreis von 1,5 km gefunden.“
- **11 Kategorien** o. ä. (gelb): Es gibt Funde, aber keine der drei kritischen Arten.
- **Achtung** (rot): Im Umkreis liegt ein Flugplatz oder Hubschrauberlandeplatz, eine militärische Anlage oder eine Justizvollzugsanstalt.
- **Fehler** (rot): Die Abfrage ist gescheitert, etwa mit „Umgebungsdaten konnten nicht geladen werden – alle Server nicht erreichbar“.

![Umgebungsprüfung mit rotem Status Achtung wegen eines Hubschrauberlandeplatzes](handbuch/vorflug-umgebung-luftraum-umgebung-achtung.webp "Ein Hubschrauberlandeplatz im Umkreis färbt den Abschnitt rot. Er klappt dann von selbst auf.")

Bei **Achtung** klappt der Abschnitt von selbst auf und zeigt keinen **Weiter**-Knopf. Außerdem erscheint die gefundene Art bei der Flugfreigabe unter **Empfehlung gegen Freigabe**, z. B. „Umgebung: Flugplätze & Heliports“ (siehe [Empfehlung gegen Freigabe](#vorflug-freigabe-empfehlung-gegen-freigabe)). Das ist ein Hinweis, kein Verbot. Ob ihr trotzdem fliegt, entscheidet die verantwortliche Person, etwa nach Rücksprache mit dem Flugplatz.

### Manuelle Prüfungen

Manches steht in keiner Karte. Deshalb folgt unter den Kacheln die Liste **Manuelle Prüfungen**. Jeder Punkt ist eine Frage, die ihr vor Ort selbst beantwortet:

| Punkt | Frage in der App |
|---|---|
| **WLAN-Netze** | Starke WLAN-Sender in der Nähe? |
| **Andere UAV** | Andere Drohnen im Einsatzgebiet? |
| **Funkanlagen** | Sonstige Funkanlagen in der Nähe? |
| **GPS-Störsender** | GPS-Jammer im Einsatzgebiet? |
| **Magnetfelder** | Starke Magnetfeldquellen in der Nähe? |
| **BOS-Einsatzstelle** | Aktiver Einsatz von Rettungskräften? |
| **Verfassungsorgane** | Bundes-/Landesregierung, Parlament? |
| **Wohngrundstücke** | Überflug von Wohngrundstücken geplant? |

![Liste Manuelle Prüfungen mit zwei gesetzten Haken](handbuch/vorflug-umgebung-luftraum-manuelle-pruefungen.webp "Ein Haken heißt: Ja, das trifft hier zu. Im Beispiel gibt es starke WLAN-Sender und eine aktive Einsatzstelle.")

Tippt einen Punkt an, wenn die Frage mit **Ja** zu beantworten ist. Der Kasten wird dann grün mit Haken. Ein zweiter Fingertipp nimmt den Haken wieder weg. **Zurücksetzen** oben rechts löscht alle Haken auf einmal.

Die Haken ändern das Abzeichen des Abschnitts nicht. Sie landen aber im PDF-Bericht und tauchen in der Nachbereitung unter [Störungen & Vorfälle](#nachbereitung-stoerungen-vorfaelle) wieder auf: Bei den Störungen erinnert die App an WLAN und Funkanlagen (Bereich Funk), an GPS-Störsender (Bereich GPS) und an andere Drohnen (Bereich Luftverkehr).

> [!IM EINSATZ]
> Eine Einsatzstelle mit Drehleiter, Rettungshubschrauber oder vielen Funkgeräten ist selbst eine Störquelle. Hakt **BOS-Einsatzstelle** an, wenn ihr mitten in einem laufenden Einsatz startet, und sprecht euch mit der Einsatzleitung über Hubschrauber und andere Drohnen ab.

## Flugverkehr (ADS-B)

Dieser Abschnitt zeigt, welche bemannten Luftfahrzeuge gerade im Umkreis von **10 km** unterwegs sind: in welcher Höhe, wie weit weg und in welcher Richtung. Die App fragt die Daten jede Minute neu ab, solange die Vorflugkontrolle offen ist. Mit **Aktualisieren** holt ihr sofort einen neuen Stand.

### ADS-B-Grundlagen

ADS-B („Automatic Dependent Surveillance – Broadcast“) ist ein Funksignal, das viele Flugzeuge und Hubschrauber laufend aussenden. Es enthält die eigene Position, Höhe, Geschwindigkeit und Kennung. Freiwillige betreiben überall Empfänger und sammeln diese Signale im Internet. Daraus entsteht ein Lagebild des Luftverkehrs, ähnlich wie auf Flugverfolgungs-Webseiten. Für ältere Transponder ohne ADS-B lässt sich die Position manchmal aus den Laufzeiten an mehreren Empfängern berechnen. Das heißt MLAT (Multilateration).

Die Flugmappe bezieht diese Daten über einen eigenen Server der Flugmappe von den Gemeinschaftsnetzen adsb.lol oder adsb.fi. Die Quelle steht unten im Abschnitt, z. B. „Daten: adsb.lol (ODbL)“.

### Was ADS-B nicht zeigt

> [!ACHTUNG]
> Die Liste ist **nie vollständig**. Ein leerer Luftraum in der App heißt nicht, dass der Luftraum leer ist. Der Luftraumbeobachter bleibt Pflicht und schaut die ganze Zeit selbst.

Es fehlen regelmäßig:

- Luftfahrzeuge ohne passenden Sender, häufig Segelflugzeuge, Ultraleichtflugzeuge, Gleitschirme und Ballone.
- Manche Hubschrauber, auch **Rettungs- und Polizeihubschrauber**. Sie haben oft gar kein ADS-B an Bord oder senden es nicht. Gerade die Hubschrauber, die zu eurer Einsatzstelle kommen, seht ihr also womöglich nicht.
- Alles, was tief fliegt, wo kein Empfänger in der Nähe steht. Bodennahe Signale reichen nicht weit. In Tälern und auf dem Land ist die Abdeckung oft lückenhaft.
- Andere Drohnen.

Dazu kommt eine kurze Verzögerung: Was ihr seht, ist der Stand der letzten Abfrage, nicht dieser Augenblick.

### Die Anzeige im Überblick

![Abschnitt Flugverkehr mit vier Luftfahrzeugen, davon ein Rettungshubschrauber im Tiefflug](handbuch/vorflug-umgebung-luftraum-flugverkehr.webp "Ein Rettungshubschrauber in 2,2 km Entfernung und knapp 300 m Höhe löst die Warnung aus. Der Airliner im Anflug ist tief, aber weiter als 3 km entfernt: gelb.")

Von oben nach unten:

1. **Stand und Umkreis**, z. B. „Stand 15:56:19 Uhr · Umkreis 10 km“. Die Uhrzeit sagt, wie frisch die Daten sind. Steht dahinter **(gespeichert)**, zeigt die App einen älteren, gespeicherten Stand.
2. **Drei Kennzahlen**:
   - **in der Luft**: alle Luftfahrzeuge im Umkreis, die nicht am Boden stehen.
   - **unter 500 m**: davon die tief fliegenden. Steht hier mehr als 0, ist die Zahl gelb.
   - **nächster Tiefflug**: die Entfernung zum nächsten tief fliegenden Luftfahrzeug. Rot, wenn es näher als 3 km ist. Ein Strich, wenn keines tief fliegt.
3. **Empfehlungen** mit Blitz-Symbol, je nach Lage, zum Beispiel:
   - „Tieffliegender Verkehr in unter 3 km: Start zurückstellen bzw. UAS sofort absenken, bis das Luftfahrzeug abgeflogen ist.“
   - „Tieffliegender Verkehr im Umkreis: Luftraumbeobachter auf die gemeldeten Richtungen einweisen.“
   - „Hubschrauber im Tiefflug (ggf. RTH/Polizei): Rücksprache mit der Leitstelle halten und Flugbetrieb bei Annäherung unterbrechen.“
   - „Ein Luftfahrzeug meldet einen Not- oder Rettungsflug: mit erhöhter Aktivität im Luftraum rechnen.“
   - „Militärischer Verkehr in niedriger Höhe: Luftraumbeobachtung verstärken.“
4. **Die Liste** der Luftfahrzeuge, das nächste zuerst. Die App zeigt höchstens zwölf. Sind es mehr, steht darunter „+ … weitere in größerer Entfernung“.
5. **Live-Karte öffnen**: öffnet die Webseite globe.adsb.lol mit einer Karte um euren Einsatzort. Dort seht ihr die Flugwege und könnt auf einzelne Luftfahrzeuge tippen.
6. Ein **Hinweistext** mit der Bewertungsregel und den Grenzen von ADS-B.

### Eine Zeile lesen

![Eine Zeile der Flugverkehrsliste: Rettungshubschrauber CHX4](handbuch/vorflug-umgebung-luftraum-flugverkehr-zeile.webp "Rufzeichen, Typ und Kennzeichen links, Höhe, Entfernung, Richtung und Tempo rechts.")

- **Farbpunkt** ganz links: die Bewertung dieses einen Luftfahrzeugs (rot, gelb, grün, siehe unten).
- **Symbol**: ein Hubschrauber oder ein Flugzeug.
- **Kennung** in der ersten Zeile. Das ist das Rufzeichen, unter dem das Luftfahrzeug im Funk auftritt, z. B. „CHX4“ (Christoph 4, ein Rettungshubschrauber). Fehlt es, steht das Kennzeichen da (z. B. „D-HXBC“), sonst eine Funkadresse aus Ziffern und Buchstaben.
- **HELI** bzw. **MIL**: Hubschrauber bzw. militärisches Luftfahrzeug.
- Zweite Zeile: der **Typ** in der Kurzform der Luftfahrt, z. B. „EC35“ für einen Eurocopter EC 135 oder „A320“ für einen Airbus. Dahinter das **Kennzeichen**, wenn es nicht schon oben steht.
- Rote Zeile darunter, wenn das Luftfahrzeug einen besonderen Status sendet: **Ambulanz-/Rettungsflug**, **Luftnotlage (7700)**, **Funkausfall (7600)**, **Widerrechtlicher Eingriff (7500)**, **Treibstoffmangel** oder **Luftfahrzeug abgestürzt**.
- Rechts oben die **Höhe**, z. B. „299 m ü. Grund“. Ein Pfeil nach unten heißt „sinkt“, ein Pfeil nach oben „steigt“. **am Boden** heißt: Das Luftfahrzeug steht oder rollt. Solche Zeilen sind blasser und zählen nicht als Verkehr in der Luft.
- Rechts unten **Entfernung, Richtung und Geschwindigkeit**, z. B. „2.2 km SO · 200 km/h“. Entfernung und Richtung gelten wie in der Umgebungsprüfung von eurem Standort aus. Die Richtung sagt also, *wo* das Luftfahrzeug steht, nicht wohin es fliegt. Ob es auf euch zukommt, seht ihr auf der Live-Karte oder am Himmel.

> [!HINTERGRUND]
> Luftfahrzeuge senden ihre Höhe über dem Meeresspiegel. Die App zieht die Geländehöhe eures Standorts ab, die sie mit den Wetterdaten erhält. So entsteht die geschätzte Höhe **ü. Grund**. Fehlt die Geländehöhe, steht **ü. NN** da (über Normalnull), und unten im Abschnitt erscheint „Geländehöhe unbekannt: Höhen sind über NN angegeben.“ Dann wirken alle Luftfahrzeuge höher, als sie über eurem Gelände wirklich sind, im Bergland oft um mehrere hundert Meter.

### Warnstufen

Die App bewertet jedes Luftfahrzeug in der Luft einzeln:

| Farbe | Bedingung |
|---|---|
| **Rot** | bis 500 m über Grund **und** bis 3 km entfernt |
| **Gelb** | bis 500 m über Grund, aber weiter als 3 km entfernt (im Umkreis von 10 km) |
| **Gelb** | 500 bis 1.000 m über Grund **und** bis 3 km entfernt |
| **Gelb** | meldet einen Not- oder Rettungsflug, egal wie hoch und wie weit |
| **Grün** | alles andere, außerdem alle Luftfahrzeuge am Boden |

Ist die Höhe unbekannt, zählt das Luftfahrzeug vorsichtshalber als tief fliegend.

Das Abzeichen des Abschnitts zeigt danach:

- **Tiefflug in der Nähe** (rot): mindestens ein Luftfahrzeug ist rot.
- **1 im Tiefflug**, **2 im Tiefflug** … (gelb): tief fliegender Verkehr im Umkreis, aber keiner näher als 3 km.
- **Achtung** (gelb): ein anderes Luftfahrzeug ist gelb, z. B. 800 m hoch in 2 km Entfernung.
- **3 in der Luft** o. ä. (grün): Verkehr im Umkreis, aber nichts davon tief oder nah.
- **Kein Verkehr** (grün): Die App hat kein Luftfahrzeug empfangen. Darunter steht „Keine Luftfahrzeuge mit ADS-B/MLAT im Umkreis von 10 km empfangen.“

Bei **Tiefflug in der Nähe** klappt der Abschnitt von selbst auf. Anders als die Umgebungsprüfung landet der Flugverkehr aber **nicht** in der Empfehlung gegen die Flugfreigabe. Er ist nur eine Momentaufnahme: Ein Hubschrauber, der jetzt in 2 km Entfernung fliegt, ist in fünf Minuten weg. Wartet ab, aktualisiert und entscheidet dann.

> [!IM EINSATZ]
> Lest dem Luftraumbeobachter vor dem Start die tief fliegenden Luftfahrzeuge mit Richtung vor, z. B. „Hubschrauber, 2 km Südost, 300 m, sinkt“. Er weiß dann, wohin er zuerst schauen muss. Während der Flüge überwacht die App den Verkehr weiter und meldet neue Tiefflieger von selbst (siehe [Luftraumüberwachung](#fluege-luftraumueberwachung-ads-b)).

Den letzten Stand speichert die App für den Standort. Er erscheint im PDF-Bericht unter „Flugverkehr (ADS-B)“ mit Uhrzeit und bis zu zehn Luftfahrzeugen.

### Ohne Verbindung

![Flugverkehr mit Hinweis Kein ADS-B-Server verbunden und gespeichertem Stand](handbuch/vorflug-umgebung-luftraum-flugverkehr-keine-verbindung.webp "Ohne Verbindung zum Server zeigt die App den letzten Stand mit Uhrzeit. Über die Live-Karte könnt ihr trotzdem nachsehen, wenn das Handy Netz hat.")

Je nach Lage seht ihr unterschiedliche Hinweise:

- **Kein ADS-B-Server verbunden.** Die App erreicht ihren Server für den Flugverkehr nicht. Das passiert bei sehr schwachem Netz oder wenn eure Flugmappe ohne diesen Server betrieben wird. Die App versucht es dann nur noch alle fünf Minuten. Die **Live-Karte** funktioniert trotzdem, denn sie läuft direkt im Browser.
- **ADS-B-Dienste derzeit nicht erreichbar** (mit einer Nummer in Klammern): Der Server ist erreichbar, aber die Datennetze dahinter antworten gerade nicht. Später erneut **Aktualisieren**.
- **Kein Netz auf dem Gerät**: Die App wartet still, bis wieder Netz da ist, und zeigt so lange den letzten Stand weiter an. Einen Hinweis gibt es dann nicht. Achtet deshalb immer auf die Uhrzeit hinter **Stand**.

Hat die App für diesen Standort noch nie Daten bekommen, steht im Abzeichen **Kein Server** oder **Offline**, oder es fehlt. Einen gespeicherten Stand zeigt sie nur, solange ihr höchstens 500 m vom Ort der Abfrage entfernt seid.

## Fluganmeldungen

In diesem Abschnitt hakt ihr ab, welche Stellen ihr über den Drohnenflug informiert habt. Die App ruft niemanden an und verschickt nichts. Sie ist eure Gedächtnisstütze und hält fest, dass ihr es getan habt.

![Abschnitt Fluganmeldungen mit Leitstelle, Polizei, Bahn, Wasserstraßenamt und einer eigenen Stelle](handbuch/vorflug-umgebung-luftraum-fluganmeldungen.webp "Leitstelle und Polizei stehen immer da. Bahn und Wasserstraßenamt kommen dazu, wenn die Umgebungsprüfung Bahnstrecken oder Wasserstraßen gefunden hat.")

Die Liste besteht aus drei Teilen:

1. **Immer**: **Leitstelle** (mit der Rufnummer 19222) und **Polizei** (110).
2. **Je nach Umgebung**, gelb umrandet mit Warnzeichen:
   - **Bahn (DB Netz)** mit dem Hinweis „Bahnlinien im Einsatzgebiet“, wenn die Umgebungsprüfung **Bahnanlagen** gefunden hat.
   - **Wasserstraßen- und Schifffahrtsamt** mit „Wasserstraßen im Einsatzgebiet“, wenn sie **Bundeswasserstraßen** gefunden hat.
3. **Eigene Stellen**, die ihr selbst hinzufügt.

So geht ihr vor:

1. Informiert die Stelle auf eurem üblichen Weg, per Funk oder Telefon.
2. Tippt danach auf die Zeile. Der Kasten wird grün mit Haken.
3. Für eine weitere Stelle tippt ihr auf **Weitere Stelle**. Es erscheinen zwei Felder: **Stelle** (z. B. „Ordnungsamt, Flugsicherung…“) und **Kontakt / Hinweis** (z. B. Telefonnummer oder Notiz). Den Haken setzt ihr links neben den Feldern.
4. Mit dem **×** rechts entfernt ihr eine eigene Stelle wieder.

Das Abzeichen zählt mit, z. B. **2/5**: zwei von fünf Stellen abgehakt. Es wird grün, wenn alle abgehakt sind. Der **Weiter**-Knopf erscheint schon, sobald **Leitstelle** und **Polizei** abgehakt sind. Die übrigen Stellen sind keine Pflicht für die App. Ob ihr sie braucht, entscheidet ihr.

> [!TIPP]
> Die Rufnummern in der Liste sind nur zur Erinnerung und lassen sich nicht antippen. Vom Mobiltelefon braucht die 19222 in der Regel die Ortsvorwahl der zuständigen Leitstelle. Tragt Stellen, mit denen ihr oft zu tun habt, mit Durchwahl als **Weitere Stelle** ein.

Die Anmeldungen gelten je Standort. Nach einem Standortwechsel beginnt die Liste neu, denn am neuen Ort sind womöglich andere Stellen zuständig. Im PDF-Bericht stehen alle Stellen mit Haken oder leerem Kasten. Eigene Stellen erscheinen dort nur, wenn ihr mindestens eines der beiden Felder ausgefüllt habt.

## Neu laden und ohne Netz arbeiten

Wetter, DWD-Abgleich und Umgebungsprüfung lädt die App für einen Standort einmal und speichert sie auf dem Gerät, den K-Index einmal je Einsatz. Neu geladen wird nur, wenn

- ihr einen anderen Einsatzort setzt oder verlegt oder
- ihr oben rechts im Seitenkopf auf das Symbol mit den zwei kreisenden Pfeilen tippt (**Umgebungsdaten neu laden**).

Der Knopf **Umgebungsdaten neu laden** verwirft die gespeicherten Wetterdaten, den DWD-Abgleich, den K-Index und die Umgebungsprüfung und holt alles neu aus dem Internet. Flugverkehr und Ortsname fragt er ebenfalls neu ab. Beim Flugverkehr bleibt der letzte Stand stehen, bis neue Daten da sind.

> [!ACHTUNG]
> Tippt **nicht** auf **Umgebungsdaten neu laden**, wenn das Gerät kein Netz hat. Die App verwirft dabei die gespeicherten Wetter- und Umgebungsdaten, kann aber keine neuen abrufen. Die Wetterbewertung fehlt dann, bis wieder Netz da ist. Die Umgebungsprüfung zeigt fälschlich **Frei** und „Keine relevanten Objekte im Umkreis von 1,5 km gefunden.“ Bahn und Wasserstraßenamt verschwinden aus den Fluganmeldungen. Dasselbe passiert, wenn ihr die Vorflugkontrolle für einen neuen Standort zum ersten Mal ohne Netz öffnet. Ein grünes **Frei** ohne Netz ist deshalb kein Beleg für eine freie Umgebung.

> [!IM EINSATZ]
> Setzt den Einsatzort schon auf der Anfahrt oder im Bereitstellungsraum von Hand und öffnet die Vorflugkontrolle, solange ihr Netz habt. Dann sind Umgebung und Wetter gespeichert, auch wenn die Einsatzstelle im Funkloch liegt, solange ihr den Ort danach nicht mehr ändert. Den Flugverkehr gibt es ohne Netz nicht. Dann bleibt nur der Blick des Luftraumbeobachters.

## Was tun, wenn …

**… die Abschnitte gesperrt sind und „Standort wählen“ zeigen?**
Es ist noch kein Einsatzort gesetzt. Legt ihn in der Leiste **Einsatzort** oben fest (siehe [Einsatzort festlegen](#einsatzdaten-einsatzort-festlegen)).

**… die Umgebungsprüfung „Fehler“ zeigt?**
Die Kartendienste waren nicht erreichbar. Wartet einen Moment und tippt auf **Umgebungsdaten neu laden**, sobald ihr wieder Netz habt. Prüft bis dahin die GeoZones-Karte und schaut euch vor Ort um.

**… die Umgebungsprüfung „Achtung“ zeigt?**
Seht nach, welche Kachel den Status auslöst. Prüft auf der **DFS GeoZones Karte**, ob euer Fluggebiet betroffen ist. Klärt bei einem Flugplatz oder Hubschrauberlandeplatz den Betrieb dort ab, bevor ihr startet.

**… ein Objekt fehlt, von dem ihr wisst, dass es da ist?**
Die Daten stammen aus einer frei gepflegten Karte und können Lücken haben. Hakt es bei den passenden **Manuellen Prüfungen** an, informiert die zuständige Stelle als **Weitere Stelle** und berücksichtigt es bei der Planung.

**… der Flugverkehr „Kein Verkehr“ zeigt, aber ihr hört einen Hubschrauber?**
Dann gilt der Hubschrauber, nicht die App. Viele Rettungs- und Polizeihubschrauber sind in den ADS-B-Daten nicht zu sehen. Sinkt mit der Drohne ab oder bleibt am Boden, bis die Lage klar ist, und haltet Rücksprache mit der Leitstelle.

**… die Uhrzeit hinter „Stand“ alt ist?**
Tippt auf **Aktualisieren**. Ändert sich nichts, hat das Gerät kein Netz oder der Server ist nicht erreichbar. Behandelt die Liste dann als veraltet.
