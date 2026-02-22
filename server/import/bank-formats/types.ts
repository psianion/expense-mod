// server/import/bank-formats/types.ts
import type { RawImportRow } from '@/types/import'

export interface BankFormat {
  id: string
  detect: (headers: string[]) => boolean
  map: (row: Record<string, string>) => RawImportRow
}
