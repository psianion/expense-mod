import { describe, it, expect } from 'vitest'
import { parseFile } from '@server/import/file-parser'

const hdfcCsv = `Date,Narration,Chq./Ref.No.,Value Dat,Withdrawal Amt.,Deposit Amt.,Closing Balance
15/02/2026,Zomato Order,,15/02/2026,450.00,,12000.00
01/02/2026,Salary Credit,,01/02/2026,,75000.00,87000.00`

describe('parseFile', () => {
  it('parses CSV buffer and returns normalized rows', async () => {
    const buffer = Buffer.from(hdfcCsv)
    const result = await parseFile(buffer, 'test.csv')
    expect(result.format).toBe('HDFC')
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].amount).toBe(450)
    expect(result.rows[0].type).toBe('EXPENSE')
    expect(result.rows[1].amount).toBe(75000)
    expect(result.rows[1].type).toBe('INFLOW')
  })

  it('throws on empty file', async () => {
    await expect(parseFile(Buffer.from(''), 'empty.csv')).rejects.toThrow('empty')
  })

  it('throws on file with headers only and no data rows', async () => {
    const buf = Buffer.from('Date,Narration,Withdrawal Amt.,Deposit Amt.')
    await expect(parseFile(buf, 'headers-only.csv')).rejects.toThrow('no data rows')
  })
})
