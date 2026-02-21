import { PiLink } from 'react-icons/pi'
import ChecklistSection from '../ChecklistSection'

interface ExternalToolsSectionProps {
  latitude: number | null
  longitude: number | null
  locked?: boolean
}

interface ExternalLinkProps {
  href: string | null
  label: string
  description: string
  disabled?: boolean
  disabledHint?: string
}

function ExternalLink({ href, label, description, disabled, disabledHint }: ExternalLinkProps) {
  if (disabled || !href) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-surface-alt px-4 py-3 opacity-60">
        <div className="flex-1">
          <p className="text-sm font-medium text-text">{label}</p>
          <p className="text-xs text-text-muted">{disabledHint ?? description}</p>
        </div>
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg bg-surface-alt px-4 py-3 transition-colors hover:bg-base active:scale-[0.99]"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <span className="text-text-muted">→</span>
    </a>
  )
}

export default function ExternalToolsSection({ latitude, longitude, locked }: ExternalToolsSectionProps) {
  const hasCoords = latitude !== null && longitude !== null
  const geoZonesUrl = hasCoords
    ? `https://maptool-dipul.dfs.de/geozones/@${longitude},${latitude}?language=de&zoom=12.2`
    : null

  return (
    <ChecklistSection title="Externe Prüfungen" icon={<PiLink />} sectionId="external-tools" locked={locked}>
      <div className="space-y-2">
        <ExternalLink
          href={geoZonesUrl}
          label="DFS GeoZones Karte"
          description="Geografische UAS-Zonen prüfen"
          disabled={!hasCoords}
          disabledHint="Standort wird benötigt"
        />
        <ExternalLink
          href="https://uas-operations.bund.de/homepage/de/temporaere-betriebseinschraenkungen/"
          label="Temporäre Betriebseinschränkungen"
          description="NOTAMs und aktuelle Einschränkungen"
        />
        <ExternalLink
          href="https://uas-operations.bund.de/homepage/de/antraege-behoerdendienste/flugverkehrskontrollfreigabe/"
          label="Flugverkehrskontrollfreigabe"
          description="ATC-Freigabe beantragen"
        />
      </div>
    </ChecklistSection>
  )
}
