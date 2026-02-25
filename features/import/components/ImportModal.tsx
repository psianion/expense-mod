'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ImportStage1Upload } from './ImportStage1Upload'
import { ImportStage2Parsing } from './ImportStage2Parsing'
import { ImportStage3Review } from './ImportStage3Review'
import { useImportSession } from '@/lib/query/hooks/useImportSession'
import { useImportRows } from '@/lib/query/hooks/useImportRows'
import { toast } from 'sonner'

type Stage = 'upload' | 'parsing' | 'review'

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const stageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.18, ease: 'easeIn' as const } },
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [stage, setStage] = useState<Stage>('upload')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const { data: session, error: sessionError } = useImportSession(sessionId)
  const { data: rows, error: rowsError } = useImportRows(sessionId, session)

  const resetToUpload = () => {
    setStage('upload')
    setSessionId(null)
  }

  // Advance to review when session is ready
  useEffect(() => {
    if (session?.status === 'REVIEWING' && stage === 'parsing') setStage('review')
  }, [session?.status, stage])

  // Surface pipeline failure and unblock user
  useEffect(() => {
    if (session?.status === 'FAILED' && stage === 'parsing') {
      toast.error('Import failed. Please try again.')
      resetToUpload()
    }
  }, [session?.status, stage])

  // Unblock user if polling loses connection during parsing
  useEffect(() => {
    if (sessionError && stage === 'parsing') {
      toast.error('Lost connection while processing. Please try again.')
      resetToUpload()
    }
  }, [sessionError, stage])

  // Surface rows fetch error in review stage
  useEffect(() => {
    if (rowsError && stage === 'review') {
      toast.error('Failed to load transactions. Please close and reopen.')
    }
  }, [rowsError, stage])

  const modalSize = stage === 'review' ? 'max-w-4xl' : 'max-w-md'

  const handleUploadSuccess = (id: string) => {
    setSessionId(id)
    setStage('parsing')
  }

  const handleClose = () => {
    if (stage === 'parsing') return // block close while pipeline is running
    resetToUpload()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`${modalSize} transition-all duration-300 overflow-hidden p-0`}
        onInteractOutside={e => { if (stage === 'parsing') e.preventDefault() }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {stage === 'upload' && (
            <motion.div key="upload" variants={stageVariants} initial="enter" animate="center" exit="exit">
              <ImportStage1Upload onSuccess={handleUploadSuccess} />
            </motion.div>
          )}
          {stage === 'parsing' && session && (
            <motion.div key="parsing" variants={stageVariants} initial="enter" animate="center" exit="exit">
              <ImportStage2Parsing session={session} />
            </motion.div>
          )}
          {stage === 'review' && session && rows && (
            <motion.div key="review" variants={stageVariants} initial="enter" animate="center" exit="exit">
              <ImportStage3Review
                session={session}
                rows={rows}
                onDone={() => { resetToUpload(); onOpenChange(false) }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
