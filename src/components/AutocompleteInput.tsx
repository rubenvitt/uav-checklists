import { useState, useRef, useEffect, useId } from 'react'
import { PiX } from 'react-icons/pi'

const MAX_VISIBLE = 8

interface AutocompleteInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  /** Highlights label and input (e.g. empty required field) */
  warning?: boolean
  onBlur?: () => void
  /** When set, each suggestion gets a remove button */
  onRemoveSuggestion?: (suggestion: string) => void
  /** Wrapper class; defaults to the section row padding */
  className?: string
}

export default function AutocompleteInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  warning = false,
  onBlur,
  onRemoveSuggestion,
  className = 'px-4 py-3',
}: AutocompleteInputProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = (
    focused
      ? value.trim()
        ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
        : suggestions
      : []
  ).slice(0, MAX_VISIBLE)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (filtered.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          onChange(filtered[activeIndex])
          setFocused(false)
        }
        break
      case 'Escape':
        setFocused(false)
        break
    }
  }

  return (
    <div className={className}>
      <label htmlFor={`${id}-input`} className={`mb-1 block text-xs ${warning ? 'text-caution' : 'text-text-muted'}`}>
        {label}
      </label>
      <div ref={wrapperRef} className="relative">
        <input
          id={`${id}-input`}
          type="text"
          value={value}
          onChange={(e) => {
            setActiveIndex(-1)
            onChange(e.target.value)
          }}
          onFocus={() => {
            setActiveIndex(-1)
            setFocused(true)
          }}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={filtered.length > 0}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          className={`w-full rounded-lg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted ${
            warning ? 'bg-caution-bg/30' : 'bg-surface-alt'
          }`}
          data-1p-ignore
          autoComplete="off"
        />
        {filtered.length > 0 && (
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-alt bg-surface shadow-lg"
          >
            {filtered.map((s, i) => (
              <li
                key={s}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`flex items-center transition-colors ${i === activeIndex ? 'bg-surface-alt' : ''}`}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onChange(s)
                    setFocused(false)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm text-text"
                >
                  {s}
                </button>
                {onRemoveSuggestion && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`${s} aus Vorschlägen entfernen`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onRemoveSuggestion(s)
                    }}
                    className="shrink-0 p-2 text-text-muted hover:text-warning transition-colors"
                  >
                    <PiX />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
