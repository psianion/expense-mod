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
        level === 'high'   && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        level === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        level === 'low'    && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        level === 'none'   && 'bg-muted text-muted-foreground',
      )}
    >
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        level === 'high'   && 'bg-green-500',
        level === 'medium' && 'bg-yellow-500',
        level === 'low'    && 'bg-red-500',
        level === 'none'   && 'bg-muted-foreground',
      )} />
      {label ?? '—'}
    </span>
  )
}
