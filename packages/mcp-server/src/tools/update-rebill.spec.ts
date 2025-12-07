import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { updateRebill } = await import('./update-rebill.js')
import type { UpdateRebillInput } from '../types.js'

describe('updateRebill', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should update rebill status successfully', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'submitted',
      submitted_date: '2024-03-15',
    }

    const mockRebill = {
      id: input.rebill_id,
      status: 'submitted',
      submitted_date: new Date('2024-03-15'),
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    mockQuery.mockResolvedValueOnce([mockRebill]) // update rebill

    const result = await updateRebill(input)

    expect(result).toEqual(mockRebill)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('should update multiple fields at once', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'paid',
      resolution_date: '2024-03-20',
      recovered_amount: 500,
    }

    const mockRebill = {
      id: input.rebill_id,
      status: 'paid',
      resolution_date: new Date('2024-03-20'),
      recovered_amount: 500,
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    mockQuery
      .mockResolvedValueOnce([mockRebill]) // update rebill
      .mockResolvedValueOnce([]) // update denial resolution

    const result = await updateRebill(input)

    expect(result).toEqual(mockRebill)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('should update denial resolution when rebill is paid', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'paid',
      recovered_amount: 500,
    }

    const mockRebill = {
      id: input.rebill_id,
      status: 'paid',
      recovered_amount: 500,
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    mockQuery
      .mockResolvedValueOnce([mockRebill]) // update rebill
      .mockResolvedValueOnce([]) // update denial resolution

    await updateRebill(input)

    expect(mockQuery).toHaveBeenCalledTimes(2)
    // Second call should update denial to resolved
    expect(mockQuery.mock.calls[1][0]).toContain(
      "resolution_status = 'resolved'"
    )
  })

  it('should update denial resolution when rebill is partially paid', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'partially_paid',
      recovered_amount: 300,
    }

    const mockRebill = {
      id: input.rebill_id,
      status: 'partially_paid',
      recovered_amount: 300,
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    mockQuery
      .mockResolvedValueOnce([mockRebill]) // update rebill
      .mockResolvedValueOnce([]) // update denial resolution

    await updateRebill(input)

    expect(mockQuery).toHaveBeenCalledTimes(2)
    expect(mockQuery.mock.calls[1][0]).toContain(
      "resolution_status = 'resolved'"
    )
  })

  it('should update denial to pending when rebill is denied again', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'denied_again',
    }

    const mockRebill = {
      id: input.rebill_id,
      status: 'denied_again',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    mockQuery
      .mockResolvedValueOnce([mockRebill]) // update rebill
      .mockResolvedValueOnce([]) // update denial to pending

    await updateRebill(input)

    expect(mockQuery).toHaveBeenCalledTimes(2)
    expect(mockQuery.mock.calls[1][0]).toContain(
      "resolution_status = 'pending'"
    )
  })

  it('should update only new_claim_id without triggering denial updates', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
      new_claim_id: '123e4567-e89b-12d3-a456-426614174003',
    }

    const mockRebill = {
      id: input.rebill_id,
      new_claim_id: input.new_claim_id,
      status: 'pending',
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    mockQuery.mockResolvedValueOnce([mockRebill]) // update rebill only

    await updateRebill(input)

    expect(mockQuery).toHaveBeenCalledTimes(1) // No denial update
  })

  it('should throw error if no fields to update', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    await expect(updateRebill(input)).rejects.toThrow('No fields to update')
  })

  it('should throw error if rebill not found', async () => {
    const input: UpdateRebillInput = {
      rebill_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'submitted',
    }

    mockQuery.mockResolvedValueOnce([]) // rebill not found

    await expect(updateRebill(input)).rejects.toThrow(
      `Rebill ${input.rebill_id} not found`
    )
  })
})
