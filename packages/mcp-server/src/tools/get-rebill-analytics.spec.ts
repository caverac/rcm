import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { getRebillAnalytics } = await import('./get-rebill-analytics.js')

describe('getRebillAnalytics', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should calculate comprehensive rebill analytics', async () => {
    // Mock stats query
    mockQuery.mockResolvedValueOnce([
      {
        total_rebills: '100',
        total_amount: '50000.00',
        total_recovered: '35000.00',
      },
    ])

    // Mock success count query
    mockQuery.mockResolvedValueOnce([{ success_count: '70' }])

    // Mock average days query
    mockQuery.mockResolvedValueOnce([{ avg_days: '15.5' }])

    // Mock by status query
    mockQuery.mockResolvedValueOnce([
      { status: 'pending', count: '10' },
      { status: 'submitted', count: '5' },
      { status: 'paid', count: '60' },
      { status: 'partially_paid', count: '10' },
      { status: 'denied_again', count: '15' },
    ])

    // Mock by reason query
    mockQuery.mockResolvedValueOnce([
      {
        rebill_reason: 'corrected_coding',
        total_count: '50',
        success_count: '40',
      },
      {
        rebill_reason: 'added_modifier',
        total_count: '30',
        success_count: '25',
      },
      {
        rebill_reason: 'updated_diagnosis',
        total_count: '20',
        success_count: '5',
      },
    ])

    const result = await getRebillAnalytics()

    expect(result.total_rebills).toBe(100)
    expect(result.total_amount).toBe(50000)
    expect(result.total_recovered).toBe(35000)
    expect(result.success_rate).toBe(70)
    expect(result.average_days_to_resolution).toBe(15.5)

    expect(result.by_status).toEqual({
      pending: 10,
      submitted: 5,
      paid: 60,
      partially_paid: 10,
      denied_again: 15,
    })

    expect(result.by_reason).toEqual({
      corrected_coding: { count: 50, success_rate: 80 },
      added_modifier: { count: 30, success_rate: expect.closeTo(83.33, 1) },
      updated_diagnosis: { count: 20, success_rate: 25 },
    })

    expect(result.insights.length).toBeGreaterThan(0)
    expect(mockQuery).toHaveBeenCalledTimes(5)
  })

  it('should handle zero rebills', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { total_rebills: '0', total_amount: '0', total_recovered: '0' },
      ])
      .mockResolvedValueOnce([{ success_count: '0' }])
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    expect(result.total_rebills).toBe(0)
    expect(result.total_amount).toBe(0)
    expect(result.total_recovered).toBe(0)
    expect(result.success_rate).toBe(0)
    expect(result.average_days_to_resolution).toBeUndefined()
    expect(result.by_status).toEqual({})
    expect(result.by_reason).toEqual({})
    expect(result.insights).toEqual([])
  })

  it('should generate insight for total rebills and amounts', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '50',
          total_amount: '25000.00',
          total_recovered: '20000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '40' }])
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    expect(result.insights).toContain('Total rebills: 50 ($25000.00 attempted)')
  })

  it('should generate insight for success rate', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '100',
          total_amount: '50000.00',
          total_recovered: '40000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '80' }])
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    expect(result.insights).toContain('Rebill success rate: 80.0%')
  })

  it('should generate insight for recovery rate', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '100',
          total_amount: '50000.00',
          total_recovered: '35000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '70' }])
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    expect(result.insights).toContain(
      'Recovery rate: 70.0% ($35000.00 recovered)'
    )
  })

  it('should generate insight for average days to resolution', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '100',
          total_amount: '50000.00',
          total_recovered: '35000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '70' }])
      .mockResolvedValueOnce([{ avg_days: '12.5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    expect(result.insights).toContain('Average time to resolution: 12.5 days')
  })

  it('should generate warning for low success rate', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '100',
          total_amount: '50000.00',
          total_recovered: '20000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '40' }]) // 40% success rate
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    const lowRateWarning = result.insights.find((i) =>
      i.includes('Low rebill success rate')
    )
    expect(lowRateWarning).toBeTruthy()
  })

  it('should generate warning for high denied_again count', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '100',
          total_amount: '50000.00',
          total_recovered: '35000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '70' }])
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([
        { status: 'paid', count: '70' },
        { status: 'denied_again', count: '25' }, // 25% denied again
      ])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    const deniedAgainWarning = result.insights.find((i) =>
      i.includes('rebills denied again')
    )
    expect(deniedAgainWarning).toBeTruthy()
  })

  it('should identify top performing reason', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '100',
          total_amount: '50000.00',
          total_recovered: '35000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '70' }])
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          rebill_reason: 'corrected_coding',
          total_count: '10',
          success_count: '9',
        },
        {
          rebill_reason: 'added_modifier',
          total_count: '20',
          success_count: '15',
        },
      ])

    const result = await getRebillAnalytics()

    const topReasonInsight = result.insights.find((i) =>
      i.includes('Best performing reason')
    )
    expect(topReasonInsight).toBeTruthy()
    expect(topReasonInsight).toContain('corrected coding') // 90% success rate
  })

  it('should report pending rebills count', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_rebills: '100',
          total_amount: '50000.00',
          total_recovered: '35000.00',
        },
      ])
      .mockResolvedValueOnce([{ success_count: '70' }])
      .mockResolvedValueOnce([{ avg_days: null }])
      .mockResolvedValueOnce([
        { status: 'pending', count: '10' },
        { status: 'submitted', count: '5' },
      ])
      .mockResolvedValueOnce([])

    const result = await getRebillAnalytics()

    expect(result.insights).toContain('15 rebills currently pending')
  })
})
