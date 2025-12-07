import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { updateAppeal } = await import('./update-appeal.js')
import type { UpdateAppealInput } from '../types.js'

describe('updateAppeal', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should update appeal status successfully', async () => {
    const input: UpdateAppealInput = {
      appeal_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'submitted',
    }

    const mockAppeal = {
      id: input.appeal_id,
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'submitted',
    }

    mockQuery.mockResolvedValueOnce([mockAppeal])

    const result = await updateAppeal(input)

    expect(result).toEqual(mockAppeal)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('should update appeal with approved status and amount', async () => {
    const input: UpdateAppealInput = {
      appeal_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'approved',
      approved_amount: 450,
      decision_date: '2024-12-01',
      payer_response: 'Appeal approved',
    }

    const mockAppeal = {
      id: input.appeal_id,
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'approved',
      approved_amount: 450,
    }

    mockQuery
      .mockResolvedValueOnce([mockAppeal]) // update appeal
      .mockResolvedValueOnce([]) // update denial

    const result = await updateAppeal(input)

    expect(result.status).toBe('approved')
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('should update denial when appeal is approved', async () => {
    const input: UpdateAppealInput = {
      appeal_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'approved',
      approved_amount: 300,
    }

    const mockAppeal = {
      id: input.appeal_id,
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'approved',
      approved_amount: 300,
    }

    mockQuery.mockResolvedValueOnce([mockAppeal]).mockResolvedValueOnce([])

    await updateAppeal(input)

    // Should have called query to update denial
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE denials'),
      expect.arrayContaining([300, mockAppeal.denial_id])
    )
  })

  it('should update denial as abandoned when appeal is denied', async () => {
    const input: UpdateAppealInput = {
      appeal_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'denied',
    }

    const mockAppeal = {
      id: input.appeal_id,
      denial_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'denied',
    }

    mockQuery.mockResolvedValueOnce([mockAppeal]).mockResolvedValueOnce([])

    await updateAppeal(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("resolution_status = 'abandoned'"),
      expect.arrayContaining([mockAppeal.denial_id])
    )
  })

  it('should throw error if appeal not found', async () => {
    const input: UpdateAppealInput = {
      appeal_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'submitted',
    }

    mockQuery.mockResolvedValueOnce([])

    await expect(updateAppeal(input)).rejects.toThrow(
      `Appeal ${input.appeal_id} not found`
    )
  })

  it('should throw error if no fields to update', async () => {
    const input: UpdateAppealInput = {
      appeal_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    await expect(updateAppeal(input)).rejects.toThrow('No fields to update')
  })
})
