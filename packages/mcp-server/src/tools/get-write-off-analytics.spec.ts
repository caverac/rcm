import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { getWriteOffAnalytics } = await import('./get-write-off-analytics.js')

describe('getWriteOffAnalytics', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should return comprehensive write-off analytics', async () => {
    // Mock overall statistics
    mockQuery.mockResolvedValueOnce([
      {
        total_write_offs: '50',
        total_amount: '10000.00',
        preventable_amount: '3000.00',
      },
    ])

    // Mock by reason
    mockQuery.mockResolvedValueOnce([
      { write_off_reason: 'below_threshold', count: '20', amount: '1000.00' },
      {
        write_off_reason: 'timely_filing_expired',
        count: '15',
        amount: '4500.00',
      },
      { write_off_reason: 'uncollectible', count: '15', amount: '4500.00' },
    ])

    // Mock by category
    mockQuery.mockResolvedValueOnce([
      { category: 'AUTHORIZATION', count: '10', amount: '2500.00' },
      { category: 'ELIGIBILITY', count: '8', amount: '2000.00' },
    ])

    // Mock top preventable categories
    mockQuery.mockResolvedValueOnce([
      { category: 'TIMELY_FILING', count: '10', amount: '2000.00' },
      { category: 'CODING_ERROR', count: '5', amount: '1000.00' },
    ])

    const result = await getWriteOffAnalytics()

    expect(result.total_write_offs).toBe(50)
    expect(result.total_amount).toBe(10000)
    expect(result.preventable_amount).toBe(3000)
    expect(result.preventable_percentage).toBe(30)
    expect(result.by_reason).toEqual({
      below_threshold: { count: 20, amount: 1000 },
      timely_filing_expired: { count: 15, amount: 4500 },
      uncollectible: { count: 15, amount: 4500 },
    })
    expect(result.by_category).toEqual({
      AUTHORIZATION: { count: 10, amount: 2500 },
      ELIGIBILITY: { count: 8, amount: 2000 },
    })
    expect(result.top_preventable_categories).toHaveLength(2)
    expect(result.insights).toBeDefined()
  })

  it('should handle zero write-offs gracefully', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_write_offs: '0',
        total_amount: '0.00',
        preventable_amount: '0.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])

    const result = await getWriteOffAnalytics()

    expect(result.total_write_offs).toBe(0)
    expect(result.preventable_percentage).toBe(0)
    expect(result.insights).toBeDefined()
  })

  it('should generate high preventable percentage warning', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_write_offs: '100',
        total_amount: '20000.00',
        preventable_amount: '8000.00', // 40% preventable
      },
    ])

    mockQuery.mockResolvedValueOnce([
      {
        write_off_reason: 'timely_filing_expired',
        count: '50',
        amount: '8000.00',
      },
    ])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])

    const result = await getWriteOffAnalytics()

    const warningInsight = result.insights.find((insight) =>
      insight.includes('High preventable write-off rate')
    )
    expect(warningInsight).toBeDefined()
  })

  it('should generate timely filing insight', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_write_offs: '100',
        total_amount: '10000.00',
        preventable_amount: '3000.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([
      {
        write_off_reason: 'timely_filing_expired',
        count: '40',
        amount: '4000.00',
      }, // 40% of total
      { write_off_reason: 'below_threshold', count: '60', amount: '6000.00' },
    ])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])

    const result = await getWriteOffAnalytics()

    const timelyFilingInsight = result.insights.find((insight) =>
      insight.includes('timely filing')
    )
    expect(timelyFilingInsight).toBeDefined()
  })

  it('should generate below threshold insight', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_write_offs: '100',
        total_amount: '5000.00',
        preventable_amount: '1000.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([
      { write_off_reason: 'below_threshold', count: '40', amount: '2000.00' }, // 40% of count
      { write_off_reason: 'uncollectible', count: '60', amount: '3000.00' },
    ])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])

    const result = await getWriteOffAnalytics()

    const thresholdInsight = result.insights.find((insight) =>
      insight.includes('small-dollar write-offs')
    )
    expect(thresholdInsight).toBeDefined()
  })

  it('should identify top preventable category', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_write_offs: '50',
        total_amount: '10000.00',
        preventable_amount: '4000.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([
      { category: 'CODING_ERROR', count: '15', amount: '3000.00' },
      { category: 'TIMELY_FILING', count: '10', amount: '1000.00' },
    ])

    const result = await getWriteOffAnalytics()

    const topCategoryInsight = result.insights.find((insight) =>
      insight.includes('Top preventable category: CODING_ERROR')
    )
    expect(topCategoryInsight).toBeDefined()
  })
})
