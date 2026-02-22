// server/import/bank-formats/index.ts
import type { BankFormat } from './types'
import { hdfcFormat } from './hdfc'
import { iciciFormat } from './icici'
import { axisFormat } from './axis'
import { sbiFormat } from './sbi'
import { kotakFormat } from './kotak'
import { genericFormat } from './generic'

// Order matters — most specific first, GENERIC last
export const BANK_FORMATS: BankFormat[] = [
  hdfcFormat,
  iciciFormat,
  axisFormat,
  sbiFormat,
  kotakFormat,
  genericFormat,
]

export function detectBankFormat(headers: string[]): BankFormat {
  return BANK_FORMATS.find(f => f.detect(headers)) ?? genericFormat
}

export type { BankFormat }
