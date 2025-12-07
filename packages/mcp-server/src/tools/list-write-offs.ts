import { query } from '../db.js'
import { ListWriteOffsInput, WriteOff } from '../types.js'

export async function listWriteOffs(
  input: ListWriteOffsInput
): Promise<WriteOff[]> {
  const {
    write_off_reason,
    category,
    is_preventable,
    claim_id,
    start_date,
    end_date,
    limit = 50,
    offset = 0,
  } = input

  // Build dynamic WHERE clause
  const conditions: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (write_off_reason !== undefined) {
    conditions.push(`write_off_reason = $${paramCount++}`)
    values.push(write_off_reason)
  }

  if (category !== undefined) {
    conditions.push(`category = $${paramCount++}`)
    values.push(category)
  }

  if (is_preventable !== undefined) {
    conditions.push(`is_preventable = $${paramCount++}`)
    values.push(is_preventable)
  }

  if (claim_id !== undefined) {
    conditions.push(`claim_id = $${paramCount++}`)
    values.push(claim_id)
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

  const results = await query<WriteOff>(
    `SELECT * FROM write_offs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${limitParam}
     OFFSET ${offsetParam}`,
    values
  )

  return results
}
