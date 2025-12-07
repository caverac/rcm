import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { listRebills } = await import('./list-rebills.js')
import type { ListRebillsInput } from '../types.js'

describe('listRebills', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  const mockRebill1 = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    original_claim_id: '123e4567-e89b-12d3-a456-426614174010',
    denial_id: '123e4567-e89b-12d3-a456-426614174020',
    rebill_reason: 'corrected_coding',
    rebill_amount: 500,
    status: 'pending',
    created_at: new Date('2024-03-01'),
  }

  const mockRebill2 = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    original_claim_id: '123e4567-e89b-12d3-a456-426614174011',
    denial_id: '123e4567-e89b-12d3-a456-426614174021',
    rebill_reason: 'added_modifier',
    rebill_amount: 300,
    status: 'paid',
    created_at: new Date('2024-02-28'),
  }

  it('should return all rebills with default pagination', async () => {
    const input: ListRebillsInput = {}

    mockQuery.mockResolvedValueOnce([mockRebill1, mockRebill2])

    const result = await listRebills(input)

    expect(result).toEqual([mockRebill1, mockRebill2])
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][0]).toContain('LIMIT')
    expect(mockQuery.mock.calls[0][0]).toContain('OFFSET')
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC')
  })

  it('should filter by status', async () => {
    const input: ListRebillsInput = {
      status: 'pending',
    }

    mockQuery.mockResolvedValueOnce([mockRebill1])

    const result = await listRebills(input)

    expect(result).toEqual([mockRebill1])
    expect(mockQuery.mock.calls[0][0]).toContain('status = $1')
  })

  it('should filter by rebill_reason', async () => {
    const input: ListRebillsInput = {
      rebill_reason: 'corrected_coding',
    }

    mockQuery.mockResolvedValueOnce([mockRebill1])

    const result = await listRebills(input)

    expect(result).toEqual([mockRebill1])
    expect(mockQuery.mock.calls[0][0]).toContain('rebill_reason = $1')
  })

  it('should filter by original_claim_id', async () => {
    const input: ListRebillsInput = {
      original_claim_id: '123e4567-e89b-12d3-a456-426614174010',
    }

    mockQuery.mockResolvedValueOnce([mockRebill1])

    const result = await listRebills(input)

    expect(result).toEqual([mockRebill1])
    expect(mockQuery.mock.calls[0][0]).toContain('original_claim_id = $1')
  })

  it('should filter by date range', async () => {
    const input: ListRebillsInput = {
      start_date: '2024-02-01',
      end_date: '2024-02-29',
    }

    mockQuery.mockResolvedValueOnce([mockRebill2])

    const result = await listRebills(input)

    expect(result).toEqual([mockRebill2])
    expect(mockQuery.mock.calls[0][0]).toContain('created_at >= $1')
    expect(mockQuery.mock.calls[0][0]).toContain('created_at <= $2')
  })

  it('should support custom limit and offset', async () => {
    const input: ListRebillsInput = {
      limit: 10,
      offset: 20,
    }

    mockQuery.mockResolvedValueOnce([mockRebill1])

    const result = await listRebills(input)

    expect(result).toEqual([mockRebill1])
    expect(mockQuery.mock.calls[0][1]).toContain(10)
    expect(mockQuery.mock.calls[0][1]).toContain(20)
  })

  it('should combine multiple filters', async () => {
    const input: ListRebillsInput = {
      status: 'pending',
      rebill_reason: 'corrected_coding',
      start_date: '2024-03-01',
    }

    mockQuery.mockResolvedValueOnce([mockRebill1])

    const result = await listRebills(input)

    expect(result).toEqual([mockRebill1])
    expect(mockQuery.mock.calls[0][0]).toContain('status = $1')
    expect(mockQuery.mock.calls[0][0]).toContain('rebill_reason = $2')
    expect(mockQuery.mock.calls[0][0]).toContain('created_at >= $3')
  })

  it('should handle empty results', async () => {
    const input: ListRebillsInput = {
      status: 'denied_again',
    }

    mockQuery.mockResolvedValueOnce([])

    const result = await listRebills(input)

    expect(result).toEqual([])
  })
})
