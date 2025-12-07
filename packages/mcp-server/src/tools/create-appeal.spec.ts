import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock must be defined before imports
const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { createAppeal } = await import('./create-appeal.js')
import type { CreateAppealInput } from '../types.js'

describe('createAppeal', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should create a new appeal successfully', async () => {
    const input: CreateAppealInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 500,
      appeal_reason: 'Authorization was obtained prior to service date',
      priority: 'high',
    }

    const mockAppeal = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      denial_id: input.denial_id,
      claim_id: input.claim_id,
      appeal_type: 'first_level',
      status: 'pending',
      priority: 'high',
      appeal_amount: 500,
      appeal_reason: input.appeal_reason,
      created_at: new Date(),
      updated_at: new Date(),
    }

    // Mock query responses
    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id, denial_amount: 500 }]) // denial exists
      .mockResolvedValueOnce([{ id: input.claim_id }]) // claim exists
      .mockResolvedValueOnce([mockAppeal]) // insert appeal
      .mockResolvedValueOnce([]) // update claim
      .mockResolvedValueOnce([]) // update denial

    const result = await createAppeal(input)

    expect(result).toEqual(mockAppeal)
    expect(mockQuery).toHaveBeenCalledTimes(5)
  })

  it('should throw error if appeal reason is too short', async () => {
    const input: CreateAppealInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 500,
      appeal_reason: 'Too short',
    }

    await expect(createAppeal(input)).rejects.toThrow(
      'Appeal reason must be at least 10 characters long'
    )
  })

  it('should throw error if denial does not exist', async () => {
    const input: CreateAppealInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 500,
      appeal_reason: 'Valid appeal reason that is long enough',
    }

    mockQuery.mockResolvedValueOnce([]) // denial not found

    await expect(createAppeal(input)).rejects.toThrow(
      `Denial ${input.denial_id} not found`
    )
  })

  it('should throw error if claim does not exist', async () => {
    const input: CreateAppealInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 500,
      appeal_reason: 'Valid appeal reason that is long enough',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id }]) // denial exists
      .mockResolvedValueOnce([]) // claim not found

    await expect(createAppeal(input)).rejects.toThrow(
      `Claim ${input.claim_id} not found`
    )
  })

  it('should use default values for optional fields', async () => {
    const input: CreateAppealInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 500,
      appeal_reason: 'Valid appeal reason',
    }

    const mockAppeal = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      appeal_type: 'first_level', // default
      priority: 'medium', // default
      status: 'pending',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id }])
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockAppeal])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await createAppeal(input)

    expect(result.appeal_type).toBe('first_level')
    expect(result.priority).toBe('medium')
  })
})
