import { describe, it, expect } from 'vitest'
import { detectBankFormat } from '@server/import/bank-formats'

describe('detectBankFormat', () => {
  it('detects HDFC from headers', () => {
    const headers = ['Date', 'Narration', 'Chq./Ref.No.', 'Value Dat', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance']
    expect(detectBankFormat(headers).id).toBe('HDFC')
  })

  it('detects ICICI from headers', () => {
    const headers = ['Transaction Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Debit', 'Credit', 'Balance']
    expect(detectBankFormat(headers).id).toBe('ICICI')
  })

  it('detects AXIS from headers', () => {
    const headers = ['Tran Date', 'Particulars', 'Debit', 'Credit', 'Balance']
    expect(detectBankFormat(headers).id).toBe('AXIS')
  })

  it('detects SBI from headers', () => {
    const headers = ['Txn Date', 'Description', 'Ref No.', 'Debit', 'Credit', 'Balance']
    expect(detectBankFormat(headers).id).toBe('SBI')
  })

  it('detects KOTAK from headers', () => {
    const headers = ['Transaction Date', 'Description', 'Chq / Ref No.', 'Debit Amount', 'Credit Amount', 'Balance']
    expect(detectBankFormat(headers).id).toBe('KOTAK')
  })

  it('falls back to GENERIC for unknown headers', () => {
    expect(detectBankFormat(['col1', 'col2', 'amount']).id).toBe('GENERIC')
  })

  it('HDFC maps row correctly — withdrawal is EXPENSE', () => {
    const format = detectBankFormat(['Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.'])
    const row = { 'Date': '15/02/2026', 'Narration': 'Zomato', 'Withdrawal Amt.': '450.00', 'Deposit Amt.': '' }
    const result = format.map(row)
    expect(result.amount).toBe(450)
    expect(result.type).toBe('EXPENSE')
    expect(result.datetime).toBe('2026-02-15T00:00:00')
    expect(result.narration).toBe('Zomato')
  })

  it('HDFC maps row correctly — deposit is INFLOW', () => {
    const format = detectBankFormat(['Date', 'Narration', 'Withdrawal Amt.', 'Deposit Amt.'])
    const row = { 'Date': '01/02/2026', 'Narration': 'Salary', 'Withdrawal Amt.': '', 'Deposit Amt.': '75,000.00' }
    const result = format.map(row)
    expect(result.amount).toBe(75000)
    expect(result.type).toBe('INFLOW')
  })
})
