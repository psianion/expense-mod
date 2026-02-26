// server/import/pdf-extractor.ts
// Runs server-side only. Uses pdfjs-dist (legacy build) to extract raw text from PDFs.

import { join } from 'path'

export class PdfPasswordError extends Error {
  constructor(public readonly code: 'PASSWORD_REQUIRED' | 'WRONG_PASSWORD') {
    super(code)
    this.name = 'PdfPasswordError'
  }
}

export async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty')
  }

  // Use legacy build for Node.js compatibility (no DOMMatrix)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // Resolve the worker file from node_modules using an absolute path
  // This bypasses Turbopack's module resolution issues
  const workerPath = join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.mjs'
  )
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(`file://${workerPath}`).href

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
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map(item => (item as { str: string }).str)
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n\n')
}
