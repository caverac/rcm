import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockQuery = jest.fn()
jest.unstable_mockModule('../db.js', () => ({
  query: mockQuery,
}))

const { listAppeals } = await import('./list-appeals.js')
import type { ListAppealsInput } from '../types.js'

describe('listAppeals', () => {
  beforeEach(() => {
    mockQuery.mockClear()
  })

  it('should list all appeals with default pagination', async () => {
    const input: ListAppealsInput = {}

    const mockAppeals = [
      {
        id: '1',
        status: 'pending',
        priority: 'high',
        created_at: new Date(),
      },
      {
        id: '2',
        status: 'submitted',
        priority: 'medium',
        created_at: new Date(),
      },
    ]

    mockQuery.mockResolvedValueOnce(mockAppeals)

    const result = await listAppeals(input)

    expect(result).toEqual(mockAppeals)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM appeals'),
      expect.arrayContaining([50, 0]) // default limit and offset
    )
  })

  it('should filter appeals by status', async () => {
    const input: ListAppealsInput = {
      status: 'pending',
    }

    mockQuery.mockResolvedValueOnce([])

    await listAppeals(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE status = $1'),
      expect.arrayContaining(['pending', 50, 0])
    )
  })

  it('should filter appeals by priority', async () => {
    const input: ListAppealsInput = {
      priority: 'high',
    }

    mockQuery.mockResolvedValueOnce([])

    await listAppeals(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE priority = $1'),
      expect.arrayContaining(['high'])
    )
  })

  it('should filter appeals by claim_id', async () => {
    const input: ListAppealsInput = {
      claim_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    mockQuery.mockResolvedValueOnce([])

    await listAppeals(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE claim_id = $1'),
      expect.arrayContaining([input.claim_id])
    )
  })

  it('should filter overdue appeals only', async () => {
    const input: ListAppealsInput = {
      overdue_only: true,
    }

    mockQuery.mockResolvedValueOnce([])

    await listAppeals(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('due_date < now()'),
      expect.any(Array)
    )
  })

  it('should use custom limit and offset', async () => {
    const input: ListAppealsInput = {
      limit: 10,
      offset: 20,
    }

    mockQuery.mockResolvedValueOnce([])

    await listAppeals(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([10, 20])
    )
  })

  it('should combine multiple filters', async () => {
    const input: ListAppealsInput = {
      status: 'pending',
      priority: 'high',
      assigned_to: 'John Doe',
    }

    mockQuery.mockResolvedValueOnce([])

    await listAppeals(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        'WHERE status = $1 AND priority = $2 AND assigned_to = $3'
      ),
      expect.arrayContaining(['pending', 'high', 'John Doe'])
    )
  })

  it('should order by priority and due date', async () => {
    const input: ListAppealsInput = {}

    mockQuery.mockResolvedValueOnce([])

    await listAppeals(input)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY'),
      expect.any(Array)
    )
  })
})
