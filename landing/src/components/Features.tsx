import type { IconType } from 'react-icons'
import {
  TbAlertTriangle,
  TbBook2,
  TbCloudStorm,
  TbDeviceMobileCheck,
  TbFileText,
  TbMap2,
  TbMapPinCheck,
  TbPhone,
  TbScale,
  TbSignature,
  TbSunMoon,
  TbUrgent,
} from 'react-icons/tb'
import { Reveal, SectionHead } from './primitives'

type Feature = {
  icon: IconType
  title: string
  body: string
  tag?: string
}

const features: Feature[] = [
  {
    icon: TbCloudStorm,
    title: 'Wetter gegen Drohnengrenzwerte',
    body: 'Wind, Böen, Temperatur, Niederschlag, Sicht, Luftfeuchte, Druck und Taupunkt von Open-Meteo — bewertet gegen das Profil der gewählten Drohne. Wind wird von 10 bis 180 m auf die geplante Flughöhe interpoliert, dazu 24-Stunden-Vorhersage und Sonnenzeiten.',
    tag: 'Open-Meteo',
  },
  {
    icon: TbUrgent,
    title: 'Amtliche Unwetterwarnungen',
    body: 'Liegt für den Einsatzort eine Warnung des Deutschen Wetterdienstes vor, erscheint sie als eigene Kachel. Unwetter zählt als Empfehlung gegen die Freigabe. Dazu der Abgleich mit der Messung der nächsten DWD-Station.',
    tag: 'DWD / Bright Sky',
  },
  {
    icon: TbAlertTriangle,
    title: 'Geomagnetischer K-Index',
    body: 'Kp-Wert vom NOAA Space Weather Prediction Center — relevant für Kompass und RTK, und in der Bewertung genauso behandelt wie jede andere Metrik.',
    tag: 'NOAA SWPC',
  },
  {
    icon: TbMapPinCheck,
    title: 'Umgebungsprüfung',
    body: 'Automatische Abfrage der Umgebung über OpenStreetMap: Flugplätze, Krankenhäuser, BOS-Standorte, Bahnanlagen, Bundesfernstraßen, Wasserstraßen, Strommasten, Naturschutzgebiete — mit Entfernung und Himmelsrichtung.',
    tag: 'Overpass / OSM',
  },
  {
    icon: TbScale,
    title: 'SORA: GRC, ARC, SAIL',
    body: 'Geführte Fragebögen für Boden- und Luftrisiko, inklusive Minderungsmaßnahmen. Die SAIL-Stufe ergibt sich automatisch aus der Matrix und bleibt im Bericht nachvollziehbar.',
  },
  {
    icon: TbMap2,
    title: 'Einsatzkarte zum Zeichnen',
    body: 'Leaflet-Karte mit Zeichenwerkzeugen für Polygone, Kreise, Linien und Marker. Flächen werden berechnet, der Kartenausschnitt wandert als Bild in den Bericht. Alternativ ein Foto der Lagekarte.',
  },
  {
    icon: TbPhone,
    title: 'Fluganmeldungen',
    body: 'Leitstelle und Polizei als Pflichtpunkte, weitere Stellen frei ergänzbar — passend zu dem, was die Umgebungsprüfung gefunden hat.',
  },
  {
    icon: TbDeviceMobileCheck,
    title: 'Technische Kontrolle',
    body: 'Aufstiegsort, UAV, Fernbedienungen und Funktionstest als abhakbare Listen mit positiv/negativ statt nur Haken — dazu das vollständige Flugbriefing.',
  },
  {
    icon: TbBook2,
    title: 'Prozeduren griffbereit',
    body: 'Normale Verfahren, Contingency, Emergency und ERP als Nachschlagewerk im Einsatz, mit rollenbezogenen Schritten für RPIC, RP und Bodenpersonal. Der SOS-Knopf ist von jedem Bildschirm aus erreichbar.',
  },
  {
    icon: TbFileText,
    title: 'PDF-Einsatzbericht',
    body: 'Ein Dokument mit Einsatzdaten, Auftrag, Truppstärke, Wetterlage, SORA-Einstufung, Karte, Fluganmeldungen, Flugtagebuch und Nachbereitung — erzeugt im Browser, nicht auf einem Server.',
  },
  {
    icon: TbSignature,
    title: 'Unterschriften am Gerät',
    body: 'Fernpilot und Einsatzleitung unterschreiben direkt mit dem Finger oder Stift; die Unterschrift landet im PDF.',
  },
  {
    icon: TbSunMoon,
    title: 'Offline und nachtfest',
    body: 'Service Worker mit Workbox hält App und Kartenkacheln vor. Helles und dunkles Design wechseln automatisch mit Sonnenauf- und -untergang — nachts blendet kein weißer Bildschirm.',
  },
]

export default function Features() {
  return (
    <section id="funktionen" className="border-b border-line bg-paper-2/40 py-20 sm:py-28">
      <div className="mx-auto max-w-[84rem] px-5 sm:px-8">
        <SectionHead
          index="02"
          kicker="Was drin steckt"
          title={<>Kein Formular-Generator. Werkzeuge für einen konkreten Job.</>}
          lead={
            <>
              Jede Funktion ist aus dem realen Flugbetrieb entstanden. Was im Einsatz nicht gebraucht
              wird, ist nicht drin.
            </>
          }
        />

        <ul className="grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal
                as="li"
                key={f.title}
                delay={(i % 3) * 70}
                className="group relative border-r border-b border-line bg-paper/60 p-7 transition-colors hover:bg-paper"
              >
                <span
                  aria-hidden
                  className="absolute top-0 left-0 h-px w-0 bg-signal transition-all duration-300 group-hover:w-full"
                />
                <Icon className="size-6 text-ink-3 transition-colors group-hover:text-signal" />
                <h3 className="display mt-5 text-lg">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
                {f.tag ? <p className="label mt-5 text-muted/70">{f.tag}</p> : null}
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
