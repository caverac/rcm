import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { listPaymentVariances } = await import('./list-payment-variances.js')
import type { ListPaymentVariancesInput } from '../types.js'

describe('listPaymentVariances', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  const mockVariance1 = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    claim_id: '123e4567-e89b-12d3-a456-426614174010',
    payer_id: '123e4567-e89b-12d3-a456-426614174020',
    variance_type: 'underpayment',
    variance_reason: 'contract_adjustment',
    variance_percentage: -20,
    payment_date: new Date('2024-03-01'),
  }

  const mockVariance2 = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    claim_id: '123e4567-e89b-12d3-a456-426614174011',
    payer_id: '123e4567-e89b-12d3-a456-426614174020',
    variance_type: 'overpayment',
    variance_reason: 'bundling',
    variance_percentage: 15,
    payment_date: new Date('2024-02-28'),
  }

  it('should return all variances with default pagination', async () => {
    const input: ListPaymentVariancesInput = {}

    mockQuery.mockResolvedValueOnce([mockVariance1, mockVariance2])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance1, mockVariance2])
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][0]).toContain('LIMIT')
    expect(mockQuery.mock.calls[0][0]).toContain('OFFSET')
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY payment_date DESC')
  })

  it('should filter by variance_type', async () => {
    const input: ListPaymentVariancesInput = {
      variance_type: 'underpayment',
    }

    mockQuery.mockResolvedValueOnce([mockVariance1])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance1])
    expect(mockQuery.mock.calls[0][0]).toContain('variance_type = $1')
  })

  it('should filter by variance_reason', async () => {
    const input: ListPaymentVariancesInput = {
      variance_reason: 'contract_adjustment',
    }

    mockQuery.mockResolvedValueOnce([mockVariance1])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance1])
    expect(mockQuery.mock.calls[0][0]).toContain('variance_reason = $1')
  })

  it('should filter by payer_id', async () => {
    const input: ListPaymentVariancesInput = {
      payer_id: '123e4567-e89b-12d3-a456-426614174020',
    }

    mockQuery.mockResolvedValueOnce([mockVariance1, mockVariance2])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance1, mockVariance2])
    expect(mockQuery.mock.calls[0][0]).toContain('payer_id = $1')
  })

  it('should filter by claim_id', async () => {
    const input: ListPaymentVariancesInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174010',
    }

    mockQuery.mockResolvedValueOnce([mockVariance1])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance1])
    expect(mockQuery.mock.calls[0][0]).toContain('claim_id = $1')
  })

  it('should filter by resolved status', async () => {
    const input: ListPaymentVariancesInput = {
      resolved: false,
    }

    mockQuery.mockResolvedValueOnce([mockVariance1, mockVariance2])

    const result = await listPaymentVariances(input)

    expect(mockQuery.mock.calls[0][0]).toContain('resolved = $1')
  })

  it('should filter by requires_appeal', async () => {
    const input: ListPaymentVariancesInput = {
      requires_appeal: true,
    }

    mockQuery.mockResolvedValueOnce([mockVariance1])

    const result = await listPaymentVariances(input)

    expect(mockQuery.mock.calls[0][0]).toContain('requires_appeal = $1')
  })

  it('should filter by minimum variance percentage', async () => {
    const input: ListPaymentVariancesInput = {
      min_variance_percentage: 15,
    }

    mockQuery.mockResolvedValueOnce([mockVariance1, mockVariance2])

    const result = await listPaymentVariances(input)

    expect(mockQuery.mock.calls[0][0]).toContain(
      'ABS(variance_percentage) >= $1'
    )
  })

  it('should filter by date range', async () => {
    const input: ListPaymentVariancesInput = {
      start_date: '2024-02-01',
      end_date: '2024-02-29',
    }

    mockQuery.mockResolvedValueOnce([mockVariance2])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance2])
    expect(mockQuery.mock.calls[0][0]).toContain('payment_date >= $1')
    expect(mockQuery.mock.calls[0][0]).toContain('payment_date <= $2')
  })

  it('should support custom limit and offset', async () => {
    const input: ListPaymentVariancesInput = {
      limit: 10,
      offset: 20,
    }

    mockQuery.mockResolvedValueOnce([mockVariance1])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance1])
    expect(mockQuery.mock.calls[0][1]).toContain(10)
    expect(mockQuery.mock.calls[0][1]).toContain(20)
  })

  it('should combine multiple filters', async () => {
    const input: ListPaymentVariancesInput = {
      variance_type: 'underpayment',
      payer_id: '123e4567-e89b-12d3-a456-426614174020',
      resolved: false,
      min_variance_percentage: 10,
    }

    mockQuery.mockResolvedValueOnce([mockVariance1])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([mockVariance1])
    expect(mockQuery.mock.calls[0][0]).toContain('variance_type = $1')
    expect(mockQuery.mock.calls[0][0]).toContain('payer_id = $2')
    expect(mockQuery.mock.calls[0][0]).toContain('resolved = $3')
    expect(mockQuery.mock.calls[0][0]).toContain(
      'ABS(variance_percentage) >= $4'
    )
  })

  it('should handle empty results', async () => {
    const input: ListPaymentVariancesInput = {
      variance_type: 'expected',
    }

    mockQuery.mockResolvedValueOnce([])

    const result = await listPaymentVariances(input)

    expect(result).toEqual([])
  })
})
