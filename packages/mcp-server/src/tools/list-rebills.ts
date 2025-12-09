import { query, QueryParam } from '../db.js'
import { ListRebillsInput, Rebill } from '../types.js'

export async function listRebills(input: ListRebillsInput): Promise<Rebill[]> {
  const {
    status,
    rebill_reason,
    original_claim_id,
    start_date,
    end_date,
    limit = 50,
    offset = 0,
  } = input

  // Build dynamic WHERE clause
  const conditions: string[] = []
  const values: QueryParam[] = []
  let paramCount = 1

  if (status !== undefined) {
    conditions.push(`status = $${paramCount++}`)
    values.push(status)
  }

  if (rebill_reason !== undefined) {
    conditions.push(`rebill_reason = $${paramCount++}`)
    values.push(rebill_reason)
  }

  if (original_claim_id !== undefined) {
    conditions.push(`original_claim_id = $${paramCount++}`)
    values.push(original_claim_id)
  }

  if (start_date !== undefined) {
    conditions.push(`created_at >= $${paramCount++}`)
    values.push(start_date)
  }

  if (end_date !== undefined) {
    conditions.push(`created_at <= $${paramCount++}`)
    values.push(end_date)
  }

  // Add pagination parameters
  values.push(limit, offset)
  const limitParam = `$${paramCount++}`
  const offsetParam = `$${paramCount++}`

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const results = await query<Rebill>(
    `SELECT * FROM rebills
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${limitParam}
     OFFSET ${offsetParam}`,
    values
  )

  return results
}
