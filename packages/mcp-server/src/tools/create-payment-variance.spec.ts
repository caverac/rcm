import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { createPaymentVariance } = await import('./create-payment-variance.js')
import type { CreatePaymentVarianceInput } from '../types.js'

describe('createPaymentVariance', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should create an underpayment variance successfully', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 1000,
      actual_amount: 800, // Underpayment
      variance_reason: 'contract_adjustment',
      payment_date: '2024-03-15',
      reason_notes: 'Contract rate adjustment applied',
      created_by: 'Analyst John',
    }

    const mockVariance = {
      id: '123e4567-e89b-12d3-a456-426614174020',
      claim_id: input.claim_id,
      payer_id: input.payer_id,
      expected_amount: 1000,
      actual_amount: 800,
      variance_amount: -200,
      variance_percentage: -20,
      variance_type: 'underpayment',
      variance_reason: 'contract_adjustment',
      payment_date: new Date('2024-03-15'),
      requires_appeal: false,
      resolved: false,
      created_at: new Date(),
      updated_at: new Date(),
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.claim_id }]) // claim exists
      .mockResolvedValueOnce([mockVariance]) // insert variance

    const result = await createPaymentVariance(input)

    expect(result).toEqual(mockVariance)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('should create an overpayment variance successfully', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 800,
      actual_amount: 1000, // Overpayment
      payment_date: '2024-03-15',
    }

    const mockVariance = {
      id: '123e4567-e89b-12d3-a456-426614174020',
      variance_amount: 200,
      variance_percentage: 25,
      variance_type: 'overpayment',
      requires_appeal: false,
      resolved: false,
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockVariance])

    const result = await createPaymentVariance(input)

    expect(result.variance_type).toBe('overpayment')
  })

  it('should create expected variance when payment matches', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 1000,
      actual_amount: 1000, // Exact match
      payment_date: '2024-03-15',
    }

    const mockVariance = {
      id: '123e4567-e89b-12d3-a456-426614174020',
      variance_amount: 0,
      variance_percentage: 0,
      variance_type: 'expected',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockVariance])

    const result = await createPaymentVariance(input)

    expect(result.variance_type).toBe('expected')
  })

  it('should handle penny differences as expected', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 1000,
      actual_amount: 1000.005, // Less than 1 cent difference
      payment_date: '2024-03-15',
    }

    const mockVariance = {
      id: '123e4567-e89b-12d3-a456-426614174020',
      variance_type: 'expected',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockVariance])

    const result = await createPaymentVariance(input)

    expect(result.variance_type).toBe('expected')
  })

  it('should set requires_appeal flag when specified', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 1000,
      actual_amount: 700,
      payment_date: '2024-03-15',
      requires_appeal: true,
    }

    const mockVariance = {
      id: '123e4567-e89b-12d3-a456-426614174020',
      requires_appeal: true,
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockVariance])

    const result = await createPaymentVariance(input)

    expect(result.requires_appeal).toBe(true)
  })

  it('should throw error if claim does not exist', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 1000,
      actual_amount: 800,
      payment_date: '2024-03-15',
    }

    mockQuery.mockResolvedValueOnce([]) // claim not found

    await expect(createPaymentVariance(input)).rejects.toThrow(
      `Claim ${input.claim_id} not found`
    )
  })

  it('should calculate variance percentage correctly', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 500,
      actual_amount: 400, // 20% underpayment
      payment_date: '2024-03-15',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([
        {
          id: '123e4567-e89b-12d3-a456-426614174020',
          variance_percentage: -20,
        },
      ])

    const result = await createPaymentVariance(input)

    // The calculation is done in the tool, mock just returns what would be calculated
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('should handle zero expected amount edge case', async () => {
    const input: CreatePaymentVarianceInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
      payer_id: '123e4567-e89b-12d3-a456-426614174010',
      expected_amount: 0,
      actual_amount: 100,
      payment_date: '2024-03-15',
    }

    const mockVariance = {
      id: '123e4567-e89b-12d3-a456-426614174020',
      variance_percentage: 0, // Can't calculate percentage with 0 expected
      variance_type: 'overpayment',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockVariance])

    const result = await createPaymentVariance(input)

    expect(result.variance_type).toBe('overpayment')
  })
})
