// features/import/hooks/useUploadStatement.ts
import { useMutation } from '@tanstack/react-query'
import { importApi } from '@/lib/api/import'

export function useUploadStatement() {
  return useMutation({
    mutationFn: (file: File) => importApi.uploadFile(file),
  })
}
