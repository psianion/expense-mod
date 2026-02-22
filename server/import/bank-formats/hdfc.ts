// server/import/bank-formats/hdfc.ts
import type { BankFormat } from './types'

export const hdfcFormat: BankFormat = {
  id: 'HDFC',
  detect: (headers) => {
    const h = headers.map(s => s.trim().toLowerCase())
    return h.includes('narration') && h.includes('withdrawal amt.') && h.includes('deposit amt.')
  },
  map: (row) => {
    const withdrawal = parseFloat(row['Withdrawal Amt.']?.replace(/,/g, '') || '0')
    const deposit = parseFloat(row['Deposit Amt.']?.replace(/,/g, '') || '0')
    const amount = withdrawal > 0 ? withdrawal : deposit > 0 ? deposit : null
    const type = withdrawal > 0 ? 'EXPENSE' : deposit > 0 ? 'INFLOW' : null

    const rawDate = row['Date'] || row['Value Dat'] || ''
    let datetime: string | null = null
    if (rawDate) {
      const [dd, mm, yy] = rawDate.split('/')
      if (dd && mm && yy) {
        const year = yy.length === 2 ? `20${yy}` : yy
        datetime = `${year}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}T00:00:00`
      }
    }

    return {
      raw_data: row,
      amount,
      datetime,
      type: type as 'EXPENSE' | 'INFLOW' | null,
      narration: row['Narration'] || '',
    }
  },
}
