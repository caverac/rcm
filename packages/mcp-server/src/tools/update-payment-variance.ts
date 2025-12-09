import { query, QueryParam } from '../db.js'
import { UpdatePaymentVarianceInput, PaymentVariance } from '../types.js'

export async function updatePaymentVariance(
  input: UpdatePaymentVarianceInput
): Promise<PaymentVariance> {
  const {
    variance_id,
    variance_reason,
    resolved,
    resolution_date,
    resolution_notes,
    appeal_id,
    requires_appeal,
  } = input

  // Build dynamic update query
  const updates: string[] = []
  const values: QueryParam[] = []
  let paramCount = 1

  if (variance_reason !== undefined) {
    updates.push(`variance_reason = $${paramCount++}`)
    values.push(variance_reason)
  }

  if (resolved !== undefined) {
    updates.push(`resolved = $${paramCount++}`)
    values.push(resolved)
  }

  if (resolution_date !== undefined) {
    updates.push(`resolution_date = $${paramCount++}`)
    values.push(resolution_date)
  }

  if (resolution_notes !== undefined) {
    updates.push(`resolution_notes = $${paramCount++}`)
    values.push(resolution_notes)
  }

  if (appeal_id !== undefined) {
    updates.push(`appeal_id = $${paramCount++}`)
    values.push(appeal_id)
  }

  if (requires_appeal !== undefined) {
    updates.push(`requires_appeal = $${paramCount++}`)
    values.push(requires_appeal)
  }

  if (updates.length === 0) {
    throw new Error('No fields to update')
  }

  // Add variance_id to parameters
  values.push(variance_id)

  const result = await query<PaymentVariance>(
    `UPDATE payment_variances
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  )

  if (result.length === 0) {
    throw new Error(`Payment variance ${variance_id} not found`)
  }

  return result[0]
}
