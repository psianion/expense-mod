import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetDocument = vi.fn()

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: mockGetDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}))

import { extractPdfText } from '@server/import/pdf-extractor'

beforeEach(() => {
  mockGetDocument.mockReset()
})

function rejectingPromise(error: Error) {
  const p = new Promise((_resolve, reject) => {
    setTimeout(() => reject(error), 0)
  })
  return { promise: p }
}

describe('extractPdfText', () => {
  it('throws a clear error on empty buffer', async () => {
    await expect(extractPdfText(Buffer.from(''))).rejects.toThrow('empty')
  })

  it('throws PASSWORD_REQUIRED when PDF is encrypted and no password given', async () => {
    mockGetDocument.mockImplementation(() =>
      rejectingPromise(
        Object.assign(new Error('No password given'), { name: 'PasswordException' })
      )
    )
    await expect(extractPdfText(Buffer.from('%PDF-1.4 fake'))).rejects.toThrow('PASSWORD_REQUIRED')
  })

  it('throws WRONG_PASSWORD when PDF password is incorrect', async () => {
    mockGetDocument.mockImplementation(() =>
      rejectingPromise(
        Object.assign(new Error('Incorrect password'), { name: 'PasswordException', code: 2 })
      )
    )
    await expect(extractPdfText(Buffer.from('%PDF-1.4 fake'), 'wrong')).rejects.toThrow('WRONG_PASSWORD')
  })
})
