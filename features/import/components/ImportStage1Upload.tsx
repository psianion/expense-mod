'use client'

import { useRef } from 'react'
import { Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useUploadStatement } from '../hooks/useUploadStatement'
import { useState } from 'react'

interface Props {
  onSuccess: (sessionId: string) => void
}

export function ImportStage1Upload({ onSuccess }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: upload, isPending: uploading } = useUploadStatement()

  const handleFile = (file: File) => {
    upload(file, {
      onSuccess: ({ sessionId }) => onSuccess(sessionId),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Upload failed'),
    })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="p-8 flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Import Bank Statement</h2>
        <p className="text-sm text-muted-foreground mt-1">CSV or Excel from HDFC, ICICI, Axis, SBI, Kotak</p>
      </div>

      <div
        className={cn(
          'w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="rounded-full bg-muted p-4">
          {uploading ? <FileText className="h-6 w-6 animate-pulse" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Uploading...' : 'Drop your file here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground/60">.csv, .xlsx, .xls</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
        Supports HDFC · ICICI · Axis · SBI · Kotak
      </Button>
    </div>
  )
}
