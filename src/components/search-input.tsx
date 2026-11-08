import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Input } from '#/components/ui/input'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Search box for list filters: reports the trimmed text (or `undefined` when
 * empty) once the user stops typing.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string | undefined) => void
  placeholder: string
}) {
  const [text, setText] = useState(value)
  const [lastValue, setLastValue] = useState(value)

  // Follow external changes (e.g. "Clear filters", back button) – adjusted
  // during render; our own debounced update already matches `text`.
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) return
    const timer = setTimeout(
      () => onChange(text.trim() || undefined),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <div className="relative min-w-56 flex-1 basis-56">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        className="pl-8"
        placeholder={placeholder}
        aria-label={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}
