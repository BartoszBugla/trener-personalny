import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/utils'

export interface StatDelta {
  /** Signed change; 0 = no change. */
  value: number
  /** Ready text, e.g. "+3 vs last week". */
  text: string
  /** Whether an increase is good news (cancellations: no). */
  upIsGood: boolean
}

/**
 * KPI tile: label · value · optional delta (arrow + text, coloured by whether
 * the change is good – never colour alone) · optional hint.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string
  value: string
  delta?: StatDelta
  hint?: string
}) {
  const direction =
    !delta || delta.value === 0 ? 'flat' : delta.value > 0 ? 'up' : 'down'
  const good =
    direction === 'flat' ? null : (direction === 'up') === delta?.upIsGood
  const Icon =
    direction === 'up'
      ? ArrowUpRight
      : direction === 'down'
        ? ArrowDownRight
        : Minus

  return (
    <Card className="gap-0 py-5">
      <CardContent className="space-y-1 px-5">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {delta && (
          <p
            className={cn(
              'flex items-center gap-1 text-sm',
              good === null && 'text-muted-foreground',
              good === true && 'text-viz-good',
              good === false && 'text-viz-bad',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {delta.text}
          </p>
        )}
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}
