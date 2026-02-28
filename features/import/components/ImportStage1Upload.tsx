'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getUserFriendlyMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { useUploadStatement } from '@/lib/query/hooks/useUploadStatement'

interface Props {
  onSuccess: (sessionId: string) => void
}

export function ImportStage1Upload({ onSuccess }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: upload, isPending: uploading } = useUploadStatement()

  const handleUpload = (file: File, pwd?: string) => {
    upload(
      { file, password: pwd || undefined },
      {
        onSuccess: ({ sessionId }) => onSuccess(sessionId),
        onError: (e) => {
          const msg = e instanceof Error ? e.message : 'Upload failed'
          if (msg === 'PASSWORD_REQUIRED') {
            toast.error('This PDF is password-protected. Enter the password below.')
          } else if (msg === 'WRONG_PASSWORD') {
            toast.error('Incorrect password. Please try again.')
          } else {
            toast.error(getUserFriendlyMessage(e))
          }
        },
      }
    )
  }

  const pickFile = (file: File) => {
    setSelectedFile(file)
    setPassword('')
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) pickFile(file)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFile) handleUpload(selectedFile, password || undefined)
  }

  return (
    <div className="p-6 flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="text-base font-semibold">Import Bank Statement</h2>
        <p className="text-sm text-muted-foreground mt-1">Upload a PDF statement from any bank</p>
      </div>

      <div
        className={cn(
          'w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2.5 cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          selectedFile && 'border-primary/40 bg-primary/5',
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="rounded-full bg-muted p-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center truncate max-w-full">
          {selectedFile ? selectedFile.name : 'Drop your PDF here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground/60">.pdf</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
      />

      {selectedFile && (
        <form onSubmit={onSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pdf-password" className="flex items-center gap-1.5 text-sm">
              <Lock className="h-3.5 w-3.5" />
              Password
              <span className="text-muted-foreground font-normal">(leave blank if not required)</span>
            </Label>
            <Input
              id="pdf-password"
              type="password"
              placeholder="Statement password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={uploading} className="w-full gap-2">
            <Upload className={cn('h-4 w-4', uploading && 'animate-pulse')} />
            {uploading ? 'Uploading…' : 'Import Statement'}
          </Button>
        </form>
      )}
    </div>
  )
}
