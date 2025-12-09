import { query, QueryParam } from '../db.js'
import { ListAppealsInput, Appeal } from '../types.js'

export async function listAppeals(input: ListAppealsInput): Promise<Appeal[]> {
  const {
    status,
    priority,
    claim_id,
    assigned_to,
    overdue_only = false,
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

  if (priority !== undefined) {
    conditions.push(`priority = $${paramCount++}`)
    values.push(priority)
  }

  if (claim_id !== undefined) {
    conditions.push(`claim_id = $${paramCount++}`)
    values.push(claim_id)
  }

  if (assigned_to !== undefined) {
    conditions.push(`assigned_to = $${paramCount++}`)
    values.push(assigned_to)
  }

  if (overdue_only) {
    conditions.push(`due_date < now()`)
    conditions.push(
      `status IN ('pending', 'in_progress', 'submitted', 'under_review')`
    )
  }

  // Add pagination parameters
  values.push(limit, offset)
  const limitParam = `$${paramCount++}`
  const offsetParam = `$${paramCount++}`

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const results = await query<Appeal>(
    `SELECT * FROM appeals
     ${whereClause}
     ORDER BY
       CASE priority
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
       END,
       due_date ASC NULLS LAST,
       created_at DESC
     LIMIT ${limitParam}
     OFFSET ${offsetParam}`,
    values
  )

  return results
}
