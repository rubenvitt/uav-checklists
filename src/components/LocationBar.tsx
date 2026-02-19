import { useState, useRef, useEffect } from 'react'
import { PiMagnifyingGlass, PiMapPin, PiPencilSimple } from 'react-icons/pi'
import { forwardGeocode, type GeocodeSuggestion } from '../services/geocodeApi'

interface LocationBarProps {
  city: string | null
  country: string | null
  loading: boolean
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

  if (showSearch) {
    return (
      <div className="px-4 py-3">
        {needsManualLocation && !editing && (
          <p className="mb-2 text-xs text-text-muted">
            Kein GPS-Zugriff — bitte gib deinen Standort ein:
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-lg flex items-center"><PiMagnifyingGlass /></span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ort eingeben..."
            className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted/50"
          />
          {editing && (
            <button
              onClick={handleCancel}
              className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
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
                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-text transition-colors hover:bg-surface-alt"
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  let displayText: string
  if (loading) {
    displayText = 'Standort wird ermittelt...'
  } else if (isManual && manualName) {
    // Show a shortened version of the manual name
    const parts = manualName.split(',')
    displayText = parts.slice(0, 2).map((p) => p.trim()).join(', ')
  } else if (city) {
    displayText = country ? `${city}, ${country}` : city
  } else {
    displayText = 'Standort nicht verfügbar'
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="text-lg flex items-center"><PiMapPin /></span>
      <span className="flex-1 text-sm text-text-muted">{displayText}</span>
      <div className="flex items-center gap-1">
        {isManual && (
          <button
            onClick={onClearManual}
            className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            title="GPS-Standort verwenden"
          >
            GPS
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          className="rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          title="Standort manuell eingeben"
        >
          <PiPencilSimple />
        </button>
      </div>
    </div>
  )
}
