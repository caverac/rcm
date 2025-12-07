import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { createWriteOff } = await import('./create-write-off.js')
import type { CreateWriteOffInput } from '../types.js'

describe('createWriteOff', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should create a write-off successfully', async () => {
    const input: CreateWriteOffInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      write_off_amount: 50,
      write_off_reason: 'below_threshold',
      reason_notes: 'Amount below minimum appeal threshold of $100',
      approved_by: 'Manager Jane',
      is_preventable: false,
    }

    const mockWriteOff = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      denial_id: input.denial_id,
      claim_id: input.claim_id,
      write_off_amount: 50,
      write_off_reason: 'below_threshold',
      is_preventable: false,
      created_at: new Date(),
      updated_at: new Date(),
    }

    mockQuery
      .mockResolvedValueOnce([
        {
          id: input.denial_id,
          denial_amount: 50,
          denial_category: 'PATIENT_RESPONSIBILITY',
          written_off: false,
        },
      ]) // denial exists
      .mockResolvedValueOnce([{ id: input.claim_id }]) // claim exists
      .mockResolvedValueOnce([mockWriteOff]) // insert write-off
      .mockResolvedValueOnce([]) // update claim

    const result = await createWriteOff(input)

    expect(result).toEqual(mockWriteOff)
    expect(mockQuery).toHaveBeenCalledTimes(4)
  })

  it('should throw error if write-off amount is zero or negative', async () => {
    const input: CreateWriteOffInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      write_off_amount: 0,
      write_off_reason: 'below_threshold',
    }

    await expect(createWriteOff(input)).rejects.toThrow(
      'Write-off amount must be positive'
    )
  })

  it('should throw error if denial does not exist', async () => {
    const input: CreateWriteOffInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      write_off_amount: 100,
      write_off_reason: 'uncollectible',
    }

    mockQuery.mockResolvedValueOnce([]) // denial not found

    await expect(createWriteOff(input)).rejects.toThrow(
      `Denial ${input.denial_id} not found`
    )
  })

  it('should throw error if claim does not exist', async () => {
    const input: CreateWriteOffInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      write_off_amount: 100,
      write_off_reason: 'uncollectible',
    }

    mockQuery
      .mockResolvedValueOnce([
        {
          id: input.denial_id,
          written_off: false,
        },
      ]) // denial exists
      .mockResolvedValueOnce([]) // claim not found

    await expect(createWriteOff(input)).rejects.toThrow(
      `Claim ${input.claim_id} not found`
    )
  })

  it('should throw error if denial already written off', async () => {
    const input: CreateWriteOffInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      write_off_amount: 100,
      write_off_reason: 'below_threshold',
    }

    mockQuery.mockResolvedValueOnce([
      {
        id: input.denial_id,
        written_off: true, // already written off
      },
    ])

    await expect(createWriteOff(input)).rejects.toThrow(
      `Denial ${input.denial_id} has already been written off`
    )
  })

  it('should use denial category if not provided', async () => {
    const input: CreateWriteOffInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      write_off_amount: 25,
      write_off_reason: 'below_threshold',
    }

    const mockWriteOff = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      category: 'CODING_ERROR',
    }

    mockQuery
      .mockResolvedValueOnce([
        {
          id: input.denial_id,
          denial_category: 'CODING_ERROR',
          written_off: false,
        },
      ])
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockWriteOff])
      .mockResolvedValueOnce([])

    const result = await createWriteOff(input)

    expect(result.category).toBe('CODING_ERROR')
  })

  it('should default is_preventable to false', async () => {
    const input: CreateWriteOffInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      write_off_amount: 100,
      write_off_reason: 'timely_filing_expired',
    }

    const mockWriteOff = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      is_preventable: false,
    }

    mockQuery
      .mockResolvedValueOnce([
        {
          id: input.denial_id,
          written_off: false,
        },
      ])
      .mockResolvedValueOnce([{ id: input.claim_id }])
      .mockResolvedValueOnce([mockWriteOff])
      .mockResolvedValueOnce([])

    const result = await createWriteOff(input)

    expect(result.is_preventable).toBe(false)
  })
})
