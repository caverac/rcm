import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { listWriteOffs } = await import('./list-write-offs.js')
import type { ListWriteOffsInput } from '../types.js'

describe('listWriteOffs', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should list all write-offs with default pagination', async () => {
    const input: ListWriteOffsInput = {}

    const mockWriteOffs = [
      {
        id: '1',
        write_off_reason: 'below_threshold',
        created_at: new Date(),
      },
      {
        id: '2',
        write_off_reason: 'timely_filing_expired',
        created_at: new Date(),
      },
    ]

    mockQuery.mockResolvedValueOnce(mockWriteOffs)

    const result = await listWriteOffs(input)

    expect(result).toEqual(mockWriteOffs)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM write_offs'),
      expect.arrayContaining([50, 0]) // default limit and offset
    )
  })

  it('should filter write-offs by reason', async () => {
    const input: ListWriteOffsInput = {
      write_off_reason: 'below_threshold',
    }

    mockQuery.mockResolvedValueOnce([])

    await listWriteOffs(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE write_off_reason = $1'),
      expect.arrayContaining(['below_threshold', 50, 0])
    )
  })

  it('should filter write-offs by category', async () => {
    const input: ListWriteOffsInput = {
      category: 'AUTHORIZATION',
    }

    mockQuery.mockResolvedValueOnce([])

    await listWriteOffs(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE category = $1'),
      expect.arrayContaining(['AUTHORIZATION'])
    )
  })

  it('should filter by preventability', async () => {
    const input: ListWriteOffsInput = {
      is_preventable: true,
    }

    mockQuery.mockResolvedValueOnce([])

    await listWriteOffs(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE is_preventable = $1'),
      expect.arrayContaining([true])
    )
  })

  it('should filter by date range', async () => {
    const input: ListWriteOffsInput = {
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    }

    mockQuery.mockResolvedValueOnce([])

    await listWriteOffs(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('created_at >='),
      expect.arrayContaining(['2024-01-01', '2024-12-31'])
    )
  })

  it('should use custom limit and offset', async () => {
    const input: ListWriteOffsInput = {
      limit: 10,
      offset: 20,
    }

    mockQuery.mockResolvedValueOnce([])

    await listWriteOffs(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([10, 20])
    )
  })

  it('should combine multiple filters', async () => {
    const input: ListWriteOffsInput = {
      write_off_reason: 'uncollectible',
      category: 'ELIGIBILITY',
      is_preventable: true,
    }

    mockQuery.mockResolvedValueOnce([])

    await listWriteOffs(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        'WHERE write_off_reason = $1 AND category = $2 AND is_preventable = $3'
      ),
      expect.arrayContaining(['uncollectible', 'ELIGIBILITY', true])
    )
  })

  it('should order by created_at DESC', async () => {
    const input: ListWriteOffsInput = {}

    mockQuery.mockResolvedValueOnce([])

    await listWriteOffs(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY created_at DESC'),
      expect.any(Array)
    )
  })
})
