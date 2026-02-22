// server/import/bank-formats/generic.ts
import type { BankFormat } from './types'

// Generic format: passthrough, UI will prompt for column mapping
export const genericFormat: BankFormat = {
  id: 'GENERIC',
  detect: () => true, // always matches — must be last in detection order
  map: (row) => ({
    raw_data: row,
    amount: null,
    datetime: null,
    type: null,
    narration: Object.values(row).join(' '),
  }),
}
