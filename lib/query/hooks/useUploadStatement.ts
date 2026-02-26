import { useMutation } from '@tanstack/react-query'
import { importApi } from '@/lib/api/import'

export function useUploadStatement() {
  return useMutation({
    mutationFn: ({ file, password }: { file: File; password?: string }) =>
      importApi.uploadFile(file, password),
  })
}
