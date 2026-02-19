import { useState, useRef, useEffect } from 'react'

interface AutocompleteInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
}

export default function AutocompleteInput({ label, value, onChange, suggestions, placeholder }: AutocompleteInputProps) {
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = focused
    ? value.trim()
      ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
      : suggestions
    : []

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(-1)
  }, [filtered.length, value])

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
    <div className="px-4 py-3">
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={filtered.length > 0}
          aria-activedescendant={activeIndex >= 0 ? `${label}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
        />
        {filtered.length > 0 && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-alt bg-surface shadow-lg"
          >
            {filtered.map((s, i) => (
              <li
                key={s}
                id={`${label}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
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
                  className={`w-full px-3 py-2 text-left text-sm text-text transition-colors ${
                    i === activeIndex ? 'bg-surface-alt' : ''
                  }`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
