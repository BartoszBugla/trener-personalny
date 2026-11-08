import { Check } from 'lucide-react'
import { useRef, useState } from 'react'

import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

/**
 * Inline "paid" free text: saved on blur or Enter when changed, Escape
 * reverts. Shows a check while the saved value is current.
 */
export function PaymentNoteInput({
  value,
  onSave,
  placeholder,
  ariaLabel,
  disabled = false,
  className,
}: {
  value: string | null
  onSave: (note: string) => Promise<unknown>
  placeholder: string
  ariaLabel: string
  disabled?: boolean
  className?: string
}) {
  const saved = value ?? ''
  const [text, setText] = useState(saved)
  const [lastSaved, setLastSaved] = useState(saved)
  const [saving, setSaving] = useState(false)
  /** Escape blurs without saving (the blur handler still sees old text). */
  const cancelled = useRef(false)

  // Follow server updates (refetch, other tab) unless the user is editing.
  if (saved !== lastSaved) {
    setLastSaved(saved)
    if (text.trim() === lastSaved) setText(saved)
  }

  const commit = async () => {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    const note = text.trim()
    if (note === saved || saving) return
    setSaving(true)
    try {
      await onSave(note)
    } catch {
      setText(saved) // error toast comes from the mutation
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        value={text}
        maxLength={200}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled || saving}
        className={cn(
          'h-8 pr-7 text-sm',
          saved && 'border-transparent bg-muted/60',
        )}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            cancelled.current = true
            setText(saved)
            e.currentTarget.blur()
          }
        }}
      />
      {saved && text.trim() === saved && (
        <Check
          className="text-viz-good pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2"
          aria-hidden
        />
      )}
    </div>
  )
}
