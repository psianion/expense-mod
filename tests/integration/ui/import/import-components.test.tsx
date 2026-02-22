import { screen } from '@testing-library/react'
import { vi } from 'vitest'
import { renderWithProviders } from '@/tests/helpers/testUI'
import { ConfidenceIndicator } from '@features/import/components/ConfidenceIndicator'
import { ImportStage2Parsing } from '@features/import/components/ImportStage2Parsing'
import { ImportStage1Upload } from '@features/import/components/ImportStage1Upload'
import type { ImportSession } from '@/types/import'

// Mock importApi so upload tests don't hit real network
vi.mock('@/lib/api/import', () => ({
  importApi: {
    uploadFile: vi.fn().mockResolvedValue({ sessionId: 'mock-session-id' }),
    getSession: vi.fn(),
    getRows: vi.fn(),
    confirmRow: vi.fn(),
    confirmAll: vi.fn(),
  },
}))

const baseSession: ImportSession = {
  id: 'sess-1',
  user_id: 'user-1',
  source_file: 'hdfc.csv',
  bank_format: 'HDFC',
  status: 'PARSING',
  row_count: 10,
  auto_count: 3,
  review_count: 7,
  progress_done: 5,
  progress_total: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// ────────────────────────────────────────────────────────────
// ConfidenceIndicator
// ────────────────────────────────────────────────────────────
describe('ConfidenceIndicator', () => {
  it('renders the label', () => {
    renderWithProviders(<ConfidenceIndicator score={0.9} label="Food" />)
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  it('shows title with correct percentage', () => {
    renderWithProviders(<ConfidenceIndicator score={0.85} label="Test" />)
    const el = screen.getByTitle('Confidence: 85%')
    expect(el).toBeInTheDocument()
  })

  it('renders em-dash when no label is provided', () => {
    renderWithProviders(<ConfidenceIndicator score={0.5} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows Unknown title when score is undefined', () => {
    renderWithProviders(<ConfidenceIndicator score={undefined} label="?" />)
    expect(screen.getByTitle('Unknown')).toBeInTheDocument()
  })
})

// ────────────────────────────────────────────────────────────
// ImportStage2Parsing
// ────────────────────────────────────────────────────────────
describe('ImportStage2Parsing', () => {
  it('renders the filename', () => {
    renderWithProviders(<ImportStage2Parsing session={baseSession} />)
    expect(screen.getByText('hdfc.csv')).toBeInTheDocument()
  })

  it('shows progress percentage and row counts', () => {
    renderWithProviders(<ImportStage2Parsing session={baseSession} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('5 of 10 rows')).toBeInTheDocument()
  })

  it('shows auto and review counts when available', () => {
    renderWithProviders(<ImportStage2Parsing session={baseSession} />)
    expect(screen.getByText(/3 auto-classified/)).toBeInTheDocument()
    expect(screen.getByText(/7 need review/)).toBeInTheDocument()
  })

  it('hides counts when both are zero', () => {
    const session = { ...baseSession, auto_count: 0, review_count: 0 }
    renderWithProviders(<ImportStage2Parsing session={session} />)
    expect(screen.queryByText(/auto-classified/)).not.toBeInTheDocument()
  })

  it('shows 0% when progress_total is 0', () => {
    const session = { ...baseSession, progress_total: 0, progress_done: 0 }
    renderWithProviders(<ImportStage2Parsing session={session} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})

// ────────────────────────────────────────────────────────────
// ImportStage1Upload
// ────────────────────────────────────────────────────────────
describe('ImportStage1Upload', () => {
  it('renders the upload zone', () => {
    renderWithProviders(<ImportStage1Upload onSuccess={vi.fn()} />)
    expect(screen.getByText('Import Bank Statement')).toBeInTheDocument()
    expect(screen.getByText(/Drop your file here/)).toBeInTheDocument()
  })

  it('shows accepted file formats', () => {
    renderWithProviders(<ImportStage1Upload onSuccess={vi.fn()} />)
    expect(screen.getByText('.csv, .xlsx, .xls')).toBeInTheDocument()
  })

  it('calls onSuccess with sessionId after upload', async () => {
    const onSuccess = vi.fn()
    const { user } = renderWithProviders(<ImportStage1Upload onSuccess={onSuccess} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['date,amount'], 'test.csv', { type: 'text/csv' })

    await user.upload(input, file)

    // Wait for the async upload to resolve
    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('mock-session-id')
    })
  })
})
