// server/import/bank-formats/kotak.ts
import type { BankFormat } from './types'

export const kotakFormat: BankFormat = {
  id: 'KOTAK',
  detect: (headers) => {
    const h = headers.map(s => s.trim().toLowerCase())
    return h.includes('transaction date') && h.includes('debit amount') && h.includes('credit amount')
  },
  map: (row) => {
    const debit = parseFloat(row['Debit Amount']?.replace(/,/g, '') || '0')
    const credit = parseFloat(row['Credit Amount']?.replace(/,/g, '') || '0')
    const amount = debit > 0 ? debit : credit > 0 ? credit : null
    const type = debit > 0 ? 'EXPENSE' : credit > 0 ? 'INFLOW' : null
    const rawDate = row['Transaction Date'] || ''
    let datetime: string | null = null
    if (rawDate) {
      const parts = rawDate.split(/[-/]/)
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts
        datetime = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}T00:00:00`
      }
    }
    return { raw_data: row, amount, datetime, type: type as 'EXPENSE'|'INFLOW'|null, narration: row['Description'] || '' }
  },
}
