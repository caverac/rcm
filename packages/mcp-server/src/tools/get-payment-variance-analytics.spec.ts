import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { getPaymentVarianceAnalytics } =
  await import('./get-payment-variance-analytics.js')

describe('getPaymentVarianceAnalytics', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should calculate comprehensive payment variance analytics', async () => {
    // Mock stats query
    mockQuery.mockResolvedValueOnce([
      {
        total_variances: '100',
        total_variance_amount: '50000.00',
        total_underpayment: '35000.00',
        total_overpayment: '15000.00',
        avg_variance_pct: '12.5',
      },
    ])

    // Mock unresolved query
    mockQuery.mockResolvedValueOnce([
      {
        unresolved_count: '25',
        unresolved_amount: '20000.00',
      },
    ])

    // Mock appeals required query
    mockQuery.mockResolvedValueOnce([{ appeals_required_count: '15' }])

    // Mock by type query
    mockQuery.mockResolvedValueOnce([
      { variance_type: 'underpayment', count: '70', amount: '35000.00' },
      { variance_type: 'overpayment', count: '25', amount: '15000.00' },
      { variance_type: 'expected', count: '5', amount: '0.00' },
    ])

    // Mock by reason query
    mockQuery.mockResolvedValueOnce([
      {
        variance_reason: 'contract_adjustment',
        count: '40',
        amount: '20000.00',
        avg_variance_pct: '10.5',
      },
      {
        variance_reason: 'bundling',
        count: '30',
        amount: '15000.00',
        avg_variance_pct: '8.2',
      },
    ])

    // Mock by payer query
    mockQuery.mockResolvedValueOnce([
      {
        payer_id: 'payer-1',
        count: '50',
        total_variance: '-25000.00',
        avg_variance_pct: '15.0',
      },
      {
        payer_id: 'payer-2',
        count: '30',
        total_variance: '-10000.00',
        avg_variance_pct: '10.0',
      },
    ])

    const result = await getPaymentVarianceAnalytics()

    expect(result.total_variances).toBe(100)
    expect(result.total_variance_amount).toBe(50000)
    expect(result.total_underpayment).toBe(35000)
    expect(result.total_overpayment).toBe(15000)
    expect(result.average_variance_percentage).toBe(12.5)
    expect(result.unresolved_count).toBe(25)
    expect(result.unresolved_amount).toBe(20000)
    expect(result.appeals_required_count).toBe(15)

    expect(result.by_variance_type).toEqual({
      underpayment: { count: 70, amount: 35000 },
      overpayment: { count: 25, amount: 15000 },
      expected: { count: 5, amount: 0 },
    })

    expect(result.by_reason).toEqual({
      contract_adjustment: { count: 40, amount: 20000, avg_variance_pct: 10.5 },
      bundling: { count: 30, amount: 15000, avg_variance_pct: 8.2 },
    })

    expect(result.by_payer['payer-1']).toEqual({
      count: 50,
      total_variance: -25000,
      avg_variance_pct: 15,
    })

    expect(result.insights.length).toBeGreaterThan(0)
    expect(mockQuery).toHaveBeenCalledTimes(6)
  })

  it('should handle zero variances', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '0',
          total_variance_amount: '0',
          total_underpayment: '0',
          total_overpayment: '0',
          avg_variance_pct: '0',
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '0', unresolved_amount: '0' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getPaymentVarianceAnalytics()

    expect(result.total_variances).toBe(0)
    expect(result.total_variance_amount).toBe(0)
    expect(result.by_variance_type).toEqual({})
    expect(result.by_reason).toEqual({})
    expect(result.by_payer).toEqual({})
    expect(result.insights).toEqual([])
  })

  it('should generate insight for total variances', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '50',
          total_variance_amount: '25000.00',
          total_underpayment: '20000.00',
          total_overpayment: '5000.00',
          avg_variance_pct: '10.0',
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '10', unresolved_amount: '8000.00' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getPaymentVarianceAnalytics()

    expect(result.insights).toContain(
      'Total variances: 50 ($25000.00 total variance)'
    )
  })

  it('should generate insight for underpayments', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '100',
          total_variance_amount: '50000.00',
          total_underpayment: '40000.00',
          total_overpayment: '10000.00',
          avg_variance_pct: '12.0',
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '20', unresolved_amount: '15000.00' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '10' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getPaymentVarianceAnalytics()

    const underpaymentInsight = result.insights.find((i) =>
      i.includes('Underpayments')
    )
    expect(underpaymentInsight).toBeTruthy()
    expect(underpaymentInsight).toContain('$40000.00')
  })

  it('should generate warning for appeals required', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '100',
          total_variance_amount: '50000.00',
          total_underpayment: '35000.00',
          total_overpayment: '15000.00',
          avg_variance_pct: '10.0',
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '20', unresolved_amount: '15000.00' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '15' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getPaymentVarianceAnalytics()

    const appealWarning = result.insights.find((i) =>
      i.includes('requiring appeal action')
    )
    expect(appealWarning).toBeTruthy()
  })

  it('should generate warning for high average variance percentage', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '100',
          total_variance_amount: '50000.00',
          total_underpayment: '35000.00',
          total_overpayment: '15000.00',
          avg_variance_pct: '18.0', // > 15%
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '20', unresolved_amount: '15000.00' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getPaymentVarianceAnalytics()

    const highVarianceWarning = result.insights.find((i) =>
      i.includes('contract verification needed')
    )
    expect(highVarianceWarning).toBeTruthy()
  })

  it('should identify top variance reason', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '100',
          total_variance_amount: '50000.00',
          total_underpayment: '35000.00',
          total_overpayment: '15000.00',
          avg_variance_pct: '10.0',
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '20', unresolved_amount: '15000.00' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          variance_reason: 'contract_adjustment',
          count: '10',
          amount: '25000.00',
          avg_variance_pct: '12.0',
        },
        {
          variance_reason: 'bundling',
          count: '20',
          amount: '15000.00',
          avg_variance_pct: '8.0',
        },
      ])
      .mockResolvedValueOnce([])

    const result = await getPaymentVarianceAnalytics()

    const topReasonInsight = result.insights.find((i) =>
      i.includes('Top variance reason')
    )
    expect(topReasonInsight).toBeTruthy()
    expect(topReasonInsight).toContain('contract adjustment')
  })

  it('should generate warning for underpayment dominance', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '100',
          total_variance_amount: '50000.00',
          total_underpayment: '40000.00', // 80% of total
          total_overpayment: '10000.00',
          avg_variance_pct: '10.0',
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '20', unresolved_amount: '15000.00' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await getPaymentVarianceAnalytics()

    const underpaymentDominance = result.insights.find((i) =>
      i.includes('Significant underpayment pattern')
    )
    expect(underpaymentDominance).toBeTruthy()
  })

  it('should warn about payers with many variances', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total_variances: '100',
          total_variance_amount: '50000.00',
          total_underpayment: '35000.00',
          total_overpayment: '15000.00',
          avg_variance_pct: '10.0',
        },
      ])
      .mockResolvedValueOnce([
        { unresolved_count: '20', unresolved_amount: '15000.00' },
      ])
      .mockResolvedValueOnce([{ appeals_required_count: '5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          payer_id: 'payer-1',
          count: '30', // 30% of total
          total_variance: '-20000.00',
          avg_variance_pct: '15.0',
        },
      ])

    const result = await getPaymentVarianceAnalytics()

    const payerWarning = result.insights.find((i) =>
      i.includes('review contract terms')
    )
    expect(payerWarning).toBeTruthy()
  })
})
