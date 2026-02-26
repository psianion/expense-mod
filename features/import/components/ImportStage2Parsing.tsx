import { FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ImportSession } from '@/types/import'

export function ImportStage2Parsing({ session }: { session: ImportSession }) {
  const pct = session.progress_total > 0
    ? Math.round((session.progress_done / session.progress_total) * 100)
    : 0

  return (
    <div className="p-6 flex flex-col items-center gap-5">
      <div className="rounded-full bg-primary/10 p-3">
        <FileText className="h-5 w-5 animate-pulse text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-semibold text-foreground">Analysing your statement</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-[18rem] truncate">{session.source_file}</p>
      </div>
      <div className="w-full space-y-2">
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{session.progress_done} of {session.progress_total} rows</span>
          <span>{pct}%</span>
        </div>
      </div>
      {(session.auto_count > 0 || session.review_count > 0) && (
        <div className="flex gap-4 text-sm">
          <span className={cn('flex items-center gap-1', 'text-emerald-600 dark:text-emerald-400')}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {session.auto_count} auto-classified
          </span>
          <span className={cn('flex items-center gap-1', 'text-amber-600 dark:text-amber-400')}>
            <AlertCircle className="h-3.5 w-3.5" />
            {session.review_count} need review
          </span>
        </div>
      )}
    </div>
  )
}
