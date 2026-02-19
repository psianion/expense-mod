import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  exportToCSV,
  exportSummaryToCSV,
  exportCategoryBreakdownToCSV,
} from '@features/analytics/utils/export'
import type { Expense } from '@/types'

// Mock browser APIs
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()

describe('Export Utilities', () => {
  beforeEach(() => {
    // Mock URL APIs
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    // Mock document methods
    vi.spyOn(document, 'createElement').mockReturnValue({
      setAttribute: vi.fn(),
      click: mockClick,
      style: {},
    } as any)

    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    // Mock Blob
    global.Blob = vi.fn().mockImplementation((content, options) => ({
      content,
      options,
      type: options?.type || 'text/plain',
    })) as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToCSV', () => {
    const mockExpenses: Expense[] = [
      {
        id: '1',
        user_id: 'user1',
        amount: 100,
        datetime: '2026-02-08T10:00:00Z',
        category: 'Food',
        platform: 'Swiggy',
        payment_method: 'Credit Card',
        type: 'EXPENSE',
        tags: ['lunch', 'office'],
        parsed_by_ai: false,
        raw_text: null,
        source: 'MANUAL',
        bill_id: null,
        bill_instance_id: null,
        created_at: '2026-02-08T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        amount: 50,
        datetime: '2026-02-07T15:30:00Z',
        category: 'Transport',
        platform: 'Uber',
        payment_method: 'UPI',
        type: 'EXPENSE',
        tags: [],
        parsed_by_ai: true,
        raw_text: 'uber ride to office',
        source: 'AI',
        bill_id: null,
        bill_instance_id: null,
        created_at: '2026-02-07T15:30:00Z',
      },
    ]

    it('should export expenses to CSV with correct format', async () => {
      await exportToCSV(mockExpenses)

      // Verify Blob was created with CSV content
      expect(global.Blob).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('Date,Amount,Type,Category')]),
        { type: 'text/csv;charset=utf-8;' }
      )

      // Verify download link was created and clicked
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('should use custom filename when provided', async () => {
      const customFilename = 'my_expenses.csv'
      const setAttributeMock = vi.fn()

      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: setAttributeMock,
        click: mockClick,
        style: {},
      } as any)

      await exportToCSV(mockExpenses, customFilename)

      expect(setAttributeMock).toHaveBeenCalledWith('download', customFilename)
    })

    it('should generate filename with current date when not provided', async () => {
      const setAttributeMock = vi.fn()

      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: setAttributeMock,
        click: mockClick,
        style: {},
      } as any)

      await exportToCSV(mockExpenses)

      expect(setAttributeMock).toHaveBeenCalledWith(
        'download',
        expect.stringMatching(/expenses_export_\d{4}-\d{2}-\d{2}\.csv/)
      )
    })

    it('should handle empty expenses array', async () => {
      await exportToCSV([])

      // Should still create CSV with headers
      expect(global.Blob).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
    })

    it('should format tags as semicolon-separated values', async () => {
      const expensesWithTags: Expense[] = [
        {
          ...mockExpenses[0],
          tags: ['tag1', 'tag2', 'tag3'],
        },
      ]

      await exportToCSV(expensesWithTags)

      const blobContent = (global.Blob as any).mock.calls[0][0][0]
      expect(blobContent).toContain('tag1; tag2; tag3')
    })

    it('should handle null/undefined values gracefully', async () => {
      const expensesWithNulls: Expense[] = [
        {
          ...mockExpenses[0],
          category: null as any,
          platform: null as any,
          payment_method: null as any,
          tags: null as any,
          bill_id: null,
        },
      ]

      await exportToCSV(expensesWithNulls)

      const blobContent = (global.Blob as any).mock.calls[0][0][0]
      expect(blobContent).toContain('Uncategorized')
      expect(blobContent).toContain('Unknown')
    })
  })

  describe('exportSummaryToCSV', () => {
    const mockSummary = [
      { label: 'Total Expenses', value: 1000 },
      { label: 'Total Inflows', value: 2000 },
      { label: 'Net Balance', value: 1000 },
    ]

    it('should export summary data to CSV', async () => {
      await exportSummaryToCSV(mockSummary)

      expect(global.Blob).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('label,value')]),
        { type: 'text/csv;charset=utf-8;' }
      )

      expect(mockClick).toHaveBeenCalled()
    })

    it('should use custom filename for summary export', async () => {
      const setAttributeMock = vi.fn()

      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: setAttributeMock,
        click: mockClick,
        style: {},
      } as any)

      await exportSummaryToCSV(mockSummary, 'summary.csv')

      expect(setAttributeMock).toHaveBeenCalledWith('download', 'summary.csv')
    })

    it('should handle empty summary array', async () => {
      await exportSummaryToCSV([])

      expect(global.Blob).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe('exportCategoryBreakdownToCSV', () => {
    const mockCategoryData = [
      { name: 'Food', value: 500 },
      { name: 'Transport', value: 300 },
      { name: 'Entertainment', value: 200 },
    ]

    it('should export category breakdown with percentages', async () => {
      await exportCategoryBreakdownToCSV(mockCategoryData)

      const blobContent = (global.Blob as any).mock.calls[0][0][0]

      // Should include headers
      expect(blobContent).toContain('Category,Amount,Percentage')

      // Should calculate percentages correctly
      expect(blobContent).toContain('50.00%') // Food: 500/1000 = 50%
      expect(blobContent).toContain('30.00%') // Transport: 300/1000 = 30%
      expect(blobContent).toContain('20.00%') // Entertainment: 200/1000 = 20%
    })

    it('should format amounts to 2 decimal places', async () => {
      const dataWithDecimals = [{ name: 'Test', value: 123.456 }]

      await exportCategoryBreakdownToCSV(dataWithDecimals)

      const blobContent = (global.Blob as any).mock.calls[0][0][0]
      expect(blobContent).toContain('123.46') // Rounded to 2 decimals
    })

    it('should handle zero total gracefully', async () => {
      const zeroData = [{ name: 'Test', value: 0 }]

      await exportCategoryBreakdownToCSV(zeroData)

      // Should not throw error
      expect(mockClick).toHaveBeenCalled()
    })

    it('should use custom filename when provided', async () => {
      const setAttributeMock = vi.fn()

      vi.spyOn(document, 'createElement').mockReturnValue({
        setAttribute: setAttributeMock,
        click: mockClick,
        style: {},
      } as any)

      await exportCategoryBreakdownToCSV(mockCategoryData, 'categories.csv')

      expect(setAttributeMock).toHaveBeenCalledWith('download', 'categories.csv')
    })
  })

})
