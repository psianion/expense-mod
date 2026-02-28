// server/import/pdf-extractor.ts
// Runs server-side only. Uses pdfjs-dist (legacy build) to extract raw text from PDFs.

import { AppError } from '@/server/lib/errors'
import { createServiceLogger } from '@/server/lib/logger'

const log = createServiceLogger('PdfExtractor')

export class PdfPasswordError extends Error {
  constructor(public readonly code: 'PASSWORD_REQUIRED' | 'WRONG_PASSWORD') {
    super(code)
    this.name = 'PdfPasswordError'
  }
}

export async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  if (!buffer || buffer.length === 0) {
    log.warn({ method: 'extractPdfText' }, 'PDF buffer is empty')
    throw new AppError('VALIDATION_ERROR', 'PDF buffer is empty')
  }

  // Use legacy build for Node.js compatibility (no DOMMatrix).
  // Do NOT set GlobalWorkerOptions.workerSrc — in Node.js, pdfjs uses a
  // "fake worker" (inline, no separate thread) which avoids Turbopack
  // module resolution issues entirely.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    password: password ?? undefined,
    isEvalSupported: false,
    useWorkerFetch: false,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  })

  let pdf: Awaited<typeof loadingTask.promise>
  try {
    pdf = await loadingTask.promise
  } catch (err: unknown) {
    const e = err as { name?: string; code?: number; message?: string }
    if (e?.name === 'PasswordException') {
      throw new PdfPasswordError(e.code === 2 ? 'WRONG_PASSWORD' : 'PASSWORD_REQUIRED')
    }
    throw err
  }

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Reconstruct lines using Y-position to preserve row structure.
    // This keeps column data (e.g. "CR" suffix, separate debit/credit columns)
    // on the same line instead of flattening everything.
    const items = content.items
      .filter((item): item is typeof item & { str: string; transform: number[] } => 'str' in item && (item as { str: string }).str.trim().length > 0)
      .map(item => ({
        str: (item as { str: string }).str,
        x: (item as { transform: number[] }).transform[4],
        y: Math.round((item as { transform: number[] }).transform[5] / 3) * 3, // merge items within 3pt
      }))

    // Group by Y, sort rows top-to-bottom (descending Y), items left-to-right
    const rows: Record<number, typeof items> = {}
    for (const item of items) {
      if (!rows[item.y]) rows[item.y] = []
      rows[item.y].push(item)
    }

    const lines = Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a)
      .map(y => rows[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' '))

    pages.push(lines.join('\n'))
  }

  return pages.join('\n\n')
}
