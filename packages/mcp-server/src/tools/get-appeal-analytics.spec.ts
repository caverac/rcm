import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { getAppealAnalytics } = await import('./get-appeal-analytics.js')

describe('getAppealAnalytics', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should return comprehensive appeal analytics', async () => {
    // Mock overall statistics
    mockQuery.mockResolvedValueOnce([
      {
        total_appeals: '10',
        total_amount: '5000.00',
        total_approved_amount: '3500.00',
      },
    ])

    // Mock success count
    mockQuery.mockResolvedValueOnce([{ success_count: '7' }])

    // Mock average days
    mockQuery.mockResolvedValueOnce([{ avg_days: '15.5' }])

    // Mock by status
    mockQuery.mockResolvedValueOnce([
      { status: 'pending', count: '3' },
      { status: 'approved', count: '5' },
      { status: 'denied', count: '2' },
    ])

    // Mock by priority
    mockQuery.mockResolvedValueOnce([
      { priority: 'high', count: '4' },
      { priority: 'medium', count: '5' },
      { priority: 'low', count: '1' },
    ])

    // Mock overdue count
    mockQuery.mockResolvedValueOnce([{ overdue_count: '2' }])

    const result = await getAppealAnalytics()

    expect(result.total_appeals).toBe(10)
    expect(result.total_amount).toBe(5000)
    expect(result.total_approved_amount).toBe(3500)
    expect(result.success_rate).toBe(70)
    expect(result.average_days_to_decision).toBe(15.5)
    expect(result.by_status).toEqual({
      pending: 3,
      approved: 5,
      denied: 2,
    })
    expect(result.by_priority).toEqual({
      high: 4,
      medium: 5,
      low: 1,
    })
    expect(result.overdue_count).toBe(2)
    expect(result.insights).toContain('Overall appeal success rate: 70.0%')
  })

  it('should handle zero appeals gracefully', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_appeals: '0',
        total_amount: '0.00',
        total_approved_amount: '0.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([{ success_count: '0' }])
    mockQuery.mockResolvedValueOnce([{ avg_days: null }])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([{ overdue_count: '0' }])

    const result = await getAppealAnalytics()

    expect(result.total_appeals).toBe(0)
    expect(result.success_rate).toBe(0)
    expect(result.insights).toBeDefined()
    expect(Array.isArray(result.insights)).toBe(true)
  })

  it('should generate overdue warning insight', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_appeals: '10',
        total_amount: '5000.00',
        total_approved_amount: '3000.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([{ success_count: '6' }])
    mockQuery.mockResolvedValueOnce([{ avg_days: null }])
    mockQuery.mockResolvedValueOnce([{ status: 'pending', count: '4' }])
    mockQuery.mockResolvedValueOnce([{ priority: 'high', count: '5' }])
    mockQuery.mockResolvedValueOnce([{ overdue_count: '3' }])

    const result = await getAppealAnalytics()

    expect(result.insights).toContain(
      '⚠️ 3 appeals are overdue and requires immediate attention'
    )
  })

  it('should calculate recovery rate', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_appeals: '10',
        total_amount: '10000.00',
        total_approved_amount: '7500.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([{ success_count: '7' }])
    mockQuery.mockResolvedValueOnce([{ avg_days: '12' }])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([{ overdue_count: '0' }])

    const result = await getAppealAnalytics()

    const recoveryInsight = result.insights.find((insight) =>
      insight.includes('Recovery rate: 75.0%')
    )
    expect(recoveryInsight).toBeDefined()
  })

  it('should include high priority appeals insight', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        total_appeals: '15',
        total_amount: '7500.00',
        total_approved_amount: '5000.00',
      },
    ])

    mockQuery.mockResolvedValueOnce([{ success_count: '10' }])
    mockQuery.mockResolvedValueOnce([{ avg_days: null }])
    mockQuery.mockResolvedValueOnce([])
    mockQuery.mockResolvedValueOnce([{ priority: 'high', count: '5' }])
    mockQuery.mockResolvedValueOnce([{ overdue_count: '0' }])

    const result = await getAppealAnalytics()

    expect(result.insights).toContain('5 high-priority appeals in queue')
  })
})
