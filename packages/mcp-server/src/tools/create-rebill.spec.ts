import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { createRebill } = await import('./create-rebill.js')
import type { CreateRebillInput } from '../types.js'

describe('createRebill', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should create a rebill successfully', async () => {
    const input: CreateRebillInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174000',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      rebill_reason: 'corrected_coding',
      rebill_amount: 500,
      changes_made: { cpt_code: 'Changed from 99213 to 99214' },
      reason_notes: 'Corrected E&M level based on documentation',
      created_by: 'Biller Jane',
    }

    const mockRebill = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      original_claim_id: input.original_claim_id,
      denial_id: input.denial_id,
      rebill_reason: 'corrected_coding',
      rebill_amount: 500,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id, denial_amount: 500 }]) // denial exists
      .mockResolvedValueOnce([
        { id: input.original_claim_id, status: 'denied' },
      ]) // claim exists
      .mockResolvedValueOnce([mockRebill]) // insert rebill

    const result = await createRebill(input)

    expect(result).toEqual(mockRebill)
    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  it('should throw error if rebill amount is zero or negative', async () => {
    const input: CreateRebillInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174000',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      rebill_reason: 'corrected_coding',
      rebill_amount: 0,
    }

    await expect(createRebill(input)).rejects.toThrow(
      'Rebill amount must be positive'
    )
  })

  it('should throw error if denial does not exist', async () => {
    const input: CreateRebillInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174000',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      rebill_reason: 'corrected_coding',
      rebill_amount: 500,
    }

    mockQuery.mockResolvedValueOnce([]) // denial not found

    await expect(createRebill(input)).rejects.toThrow(
      `Denial ${input.denial_id} not found`
    )
  })

  it('should throw error if original claim does not exist', async () => {
    const input: CreateRebillInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174000',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      rebill_reason: 'corrected_coding',
      rebill_amount: 500,
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id }]) // denial exists
      .mockResolvedValueOnce([]) // claim not found

    await expect(createRebill(input)).rejects.toThrow(
      `Claim ${input.original_claim_id} not found`
    )
  })

  it('should validate new claim exists if provided', async () => {
    const input: CreateRebillInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174000',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      rebill_reason: 'corrected_coding',
      rebill_amount: 500,
      new_claim_id: '123e4567-e89b-12d3-a456-426614174003',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id }])
      .mockResolvedValueOnce([{ id: input.original_claim_id }])
      .mockResolvedValueOnce([]) // new claim not found

    await expect(createRebill(input)).rejects.toThrow(
      `New claim ${input.new_claim_id} not found`
    )
  })

  it('should create rebill with new claim ID when provided and valid', async () => {
    const input: CreateRebillInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174000',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      rebill_reason: 'corrected_coding',
      rebill_amount: 500,
      new_claim_id: '123e4567-e89b-12d3-a456-426614174003',
    }

    const mockRebill = {
      id: '123e4567-e89b-12d3-a456-426614174004',
      new_claim_id: input.new_claim_id,
      status: 'pending',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id }])
      .mockResolvedValueOnce([{ id: input.original_claim_id }])
      .mockResolvedValueOnce([{ id: input.new_claim_id }]) // new claim exists
      .mockResolvedValueOnce([mockRebill])

    const result = await createRebill(input)

    expect(result.new_claim_id).toBe(input.new_claim_id)
  })

  it('should default status to pending', async () => {
    const input: CreateRebillInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174000',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      rebill_reason: 'added_modifier',
      rebill_amount: 300,
    }

    const mockRebill = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      status: 'pending',
    }

    mockQuery
      .mockResolvedValueOnce([{ id: input.denial_id }])
      .mockResolvedValueOnce([{ id: input.original_claim_id }])
      .mockResolvedValueOnce([mockRebill])

    const result = await createRebill(input)

    expect(result.status).toBe('pending')
  })
})
