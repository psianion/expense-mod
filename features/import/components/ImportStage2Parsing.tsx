import { FileText } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { ImportSession } from '@/types/import'

export function ImportStage2Parsing({ session }: { session: ImportSession }) {
  const pct = session.progress_total > 0
    ? Math.round((session.progress_done / session.progress_total) * 100)
    : 0

  return (
    <div className="p-8 flex flex-col items-center gap-6">
      <div className="rounded-full bg-muted p-4">
        <FileText className="h-6 w-6 animate-pulse text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">Analysing your statement</h2>
        <p className="text-sm text-muted-foreground mt-1">{session.source_file}</p>
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
          <span className="text-green-600 dark:text-green-400">✓ {session.auto_count} auto-classified</span>
          <span className="text-yellow-600 dark:text-yellow-400">⚠ {session.review_count} need review</span>
        </div>
      )}
    </div>
  )
}
