import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { updatePaymentVariance } = await import('./update-payment-variance.js')
import type { UpdatePaymentVarianceInput } from '../types.js'

describe('updatePaymentVariance', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should update variance reason successfully', async () => {
    const input: UpdatePaymentVarianceInput = {
      variance_id: '123e4567-e89b-12d3-a456-426614174000',
      variance_reason: 'bundling',
    }

    const mockVariance = {
      id: input.variance_id,
      variance_reason: 'bundling',
      updated_at: new Date(),
    }

    mockQuery.mockResolvedValueOnce([mockVariance])

    const result = await updatePaymentVariance(input)

    expect(result).toEqual(mockVariance)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('should mark variance as resolved', async () => {
    const input: UpdatePaymentVarianceInput = {
      variance_id: '123e4567-e89b-12d3-a456-426614174000',
      resolved: true,
      resolution_date: '2024-03-20',
      resolution_notes: 'Payer issued additional payment',
    }

    const mockVariance = {
      id: input.variance_id,
      resolved: true,
      resolution_date: new Date('2024-03-20'),
      resolution_notes: 'Payer issued additional payment',
    }

    mockQuery.mockResolvedValueOnce([mockVariance])

    const result = await updatePaymentVariance(input)

    expect(result.resolved).toBe(true)
    expect(result.resolution_notes).toBe('Payer issued additional payment')
  })

  it('should link variance to appeal', async () => {
    const input: UpdatePaymentVarianceInput = {
      variance_id: '123e4567-e89b-12d3-a456-426614174000',
      appeal_id: '123e4567-e89b-12d3-a456-426614174100',
      requires_appeal: false, // Appeal already filed
    }

    const mockVariance = {
      id: input.variance_id,
      appeal_id: input.appeal_id,
      requires_appeal: false,
    }

    mockQuery.mockResolvedValueOnce([mockVariance])

    const result = await updatePaymentVariance(input)

    expect(result.appeal_id).toBe(input.appeal_id)
    expect(result.requires_appeal).toBe(false)
  })

  it('should update multiple fields at once', async () => {
    const input: UpdatePaymentVarianceInput = {
      variance_id: '123e4567-e89b-12d3-a456-426614174000',
      variance_reason: 'missing_authorization',
      resolved: true,
      resolution_date: '2024-03-20',
      resolution_notes: 'Obtained retroactive authorization',
      appeal_id: '123e4567-e89b-12d3-a456-426614174100',
    }

    const mockVariance = {
      id: input.variance_id,
      variance_reason: 'missing_authorization',
      resolved: true,
      resolution_date: new Date('2024-03-20'),
      resolution_notes: 'Obtained retroactive authorization',
      appeal_id: input.appeal_id,
    }

    mockQuery.mockResolvedValueOnce([mockVariance])

    const result = await updatePaymentVariance(input)

    expect(result.variance_reason).toBe('missing_authorization')
    expect(result.resolved).toBe(true)
  })

  it('should throw error if no fields to update', async () => {
    const input: UpdatePaymentVarianceInput = {
      variance_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    await expect(updatePaymentVariance(input)).rejects.toThrow(
      'No fields to update'
    )
  })

  it('should throw error if variance not found', async () => {
    const input: UpdatePaymentVarianceInput = {
      variance_id: '123e4567-e89b-12d3-a456-426614174000',
      resolved: true,
    }

    mockQuery.mockResolvedValueOnce([]) // variance not found

    await expect(updatePaymentVariance(input)).rejects.toThrow(
      `Payment variance ${input.variance_id} not found`
    )
  })

  it('should update requires_appeal flag independently', async () => {
    const input: UpdatePaymentVarianceInput = {
      variance_id: '123e4567-e89b-12d3-a456-426614174000',
      requires_appeal: true,
    }

    const mockVariance = {
      id: input.variance_id,
      requires_appeal: true,
    }

    mockQuery.mockResolvedValueOnce([mockVariance])

    const result = await updatePaymentVariance(input)

    expect(result.requires_appeal).toBe(true)
  })
})
