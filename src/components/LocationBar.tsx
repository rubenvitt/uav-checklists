import { useState, useRef, useEffect } from 'react'
import { PiMagnifyingGlass, PiMapPin, PiMapPinArea, PiPencilSimple, PiCheckCircle } from 'react-icons/pi'
import { forwardGeocode, type GeocodeSuggestion } from '../services/geocodeApi'

interface LocationBarProps {
  city: string | null
  country: string | null
  loading: boolean
  hasLocation: boolean
  isManual: boolean
  manualName: string | null
  needsManualLocation: boolean
  onManualLocation: (location: { latitude: number; longitude: number; name: string }) => void
  onClearManual: () => void
}

export default function LocationBar({
  city,
  country,
  loading,
  hasLocation,
  isManual,
  manualName,
  needsManualLocation,
  onManualLocation,
  onClearManual,
}: LocationBarProps) {
  const [editing, setEditing] = useState(false)
  const showSearch = editing || needsManualLocation
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (editing || needsManualLocation) {
      inputRef.current?.focus()
    }
  }, [editing, needsManualLocation])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await forwardGeocode(query)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleSelect(suggestion: GeocodeSuggestion) {
    onManualLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      name: suggestion.name,
    })
    setEditing(false)
    setQuery('')
    setSuggestions([])
  }

  function handleCancel() {
    setEditing(false)
    setQuery('')
    setSuggestions([])
  }

  let displayText: string
  if (loading) {
    displayText = 'Standort wird ermittelt...'
  } else if (isManual && manualName) {
    const parts = manualName.split(',')
    displayText = parts.slice(0, 2).map((p) => p.trim()).join(', ')
  } else if (city) {
    displayText = country ? `${city}, ${country}` : city
  } else {
    displayText = ''
  }

  return (
    <section className={`rounded-xl bg-surface overflow-hidden ring-1 transition-shadow ${hasLocation ? 'ring-good/30' : 'ring-warning/40 shadow-sm shadow-warning/10'}`}>
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="text-lg flex items-center text-text">
          <PiMapPinArea />
        </span>
        <span className="flex-1 font-semibold text-text">Einsatzort</span>
        {hasLocation ? (
          <span className="flex items-center gap-1 rounded-full bg-good-bg px-2.5 py-0.5 text-xs font-medium text-good">
            <PiCheckCircle className="text-sm" />
            Gesetzt
          </span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning">
            Pflichtfeld
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        {showSearch ? (
          <div>
            {needsManualLocation && !editing && (
              <p className="mb-2 text-xs text-text-muted">
                Kein GPS-Zugriff — bitte gib den Einsatzort ein:
              </p>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-surface-alt px-3 py-2.5">
              <span className="text-base flex items-center text-text-muted"><PiMagnifyingGlass /></span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Einsatzort suchen..."
                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted/50"
              />
              {editing && (
                <button
                  onClick={handleCancel}
                  className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-text"
                >
                  Abbrechen
                </button>
              )}
            </div>

            {searching && (
              <p className="mt-2 text-xs text-text-muted">Suche...</p>
            )}

            {suggestions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleSelect(s)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-alt"
                    >
                      <PiMapPin className="shrink-0 text-text-muted" />
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!hasLocation && !searching && suggestions.length === 0 && query.length === 0 && (
              <p className="mt-3 text-xs text-text-muted">
                Gib einen Ort, eine Adresse oder Koordinaten ein.
              </p>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface-alt px-4 py-3">
            <svg className="h-4 w-4 animate-spin text-text-muted" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-text-muted">{displayText}</span>
          </div>
        ) : hasLocation ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface-alt px-4 py-3">
            <span className="text-base flex items-center text-good"><PiMapPin /></span>
            <span className="flex-1 text-sm font-medium text-text">{displayText}</span>
            <div className="flex items-center gap-1">
              {isManual && (
                <button
                  onClick={onClearManual}
                  className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface hover:text-text"
                  title="GPS-Standort verwenden"
                >
                  GPS
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface hover:text-text"
                title="Standort ändern"
              >
                <PiPencilSimple />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setEditing(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-warning/30 bg-warning-bg/30 px-4 py-4 text-sm text-warning transition-colors hover:bg-warning-bg/50"
            >
              <PiMapPin className="text-[1rem]" />
              Einsatzort festlegen
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
