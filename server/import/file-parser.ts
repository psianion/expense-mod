// server/import/file-parser.ts
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { detectBankFormat } from './bank-formats'
import type { RawImportRow, BankFormatId } from '@/types/import'

export interface ParseFileResult {
  format: BankFormatId
  rows: RawImportRow[]
}

export async function parseFile(buffer: Buffer, filename: string): Promise<ParseFileResult> {
  const ext = filename.split('.').pop()?.toLowerCase()

  let rawRows: Record<string, string>[]

  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: '' })
  } else {
    const text = buffer.toString('utf-8')
    if (!text.trim()) throw new Error('File is empty')
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
    rawRows = result.data
  }

  if (rawRows.length === 0) throw new Error('File has no data rows')

  const headers = Object.keys(rawRows[0])
  const format = detectBankFormat(headers)
  const rows = rawRows.map(row => format.map(row))

  return { format: format.id as BankFormatId, rows }
}
