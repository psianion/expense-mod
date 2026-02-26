// features/import/components/ConfidenceIndicator.tsx
import { cn } from '@/lib/utils'

interface Props {
  score: number | undefined
  label?: string
}

export function ConfidenceIndicator({ score, label }: Props) {
  const level = score === undefined || score === 0 ? 'none'
    : score >= 0.80 ? 'high'
    : score >= 0.60 ? 'medium'
    : 'low'

  return (
    <span
      title={score !== undefined ? `Confidence: ${Math.round(score * 100)}%` : 'Unknown'}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md',
        level === 'high'   && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        level === 'medium' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        level === 'low'    && 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-400',
        level === 'none'   && 'bg-muted text-muted-foreground',
      )}
    >
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        level === 'high'   && 'bg-emerald-500',
        level === 'medium' && 'bg-amber-500',
        level === 'low'    && 'bg-destructive',
        level === 'none'   && 'bg-muted-foreground',
      )} />
      {label ?? '—'}
    </span>
  )
}
