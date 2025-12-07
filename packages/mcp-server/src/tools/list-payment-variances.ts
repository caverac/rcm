import { query } from '../db.js'
import { ListPaymentVariancesInput, PaymentVariance } from '../types.js'

export async function listPaymentVariances(
  input: ListPaymentVariancesInput
): Promise<PaymentVariance[]> {
  const {
    variance_type,
    variance_reason,
    payer_id,
    claim_id,
    resolved,
    requires_appeal,
    min_variance_percentage,
    start_date,
    end_date,
    limit = 50,
    offset = 0,
  } = input

  // Build dynamic WHERE clause
  const conditions: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (variance_type !== undefined) {
    conditions.push(`variance_type = $${paramCount++}`)
    values.push(variance_type)
  }

  if (variance_reason !== undefined) {
    conditions.push(`variance_reason = $${paramCount++}`)
    values.push(variance_reason)
  }

  if (payer_id !== undefined) {
    conditions.push(`payer_id = $${paramCount++}`)
    values.push(payer_id)
  }

  if (claim_id !== undefined) {
    conditions.push(`claim_id = $${paramCount++}`)
    values.push(claim_id)
  }

  if (resolved !== undefined) {
    conditions.push(`resolved = $${paramCount++}`)
    values.push(resolved)
  }

  if (requires_appeal !== undefined) {
    conditions.push(`requires_appeal = $${paramCount++}`)
    values.push(requires_appeal)
  }

  if (min_variance_percentage !== undefined) {
    conditions.push(`ABS(variance_percentage) >= $${paramCount++}`)
    values.push(min_variance_percentage)
  }

  if (start_date !== undefined) {
    conditions.push(`payment_date >= $${paramCount++}`)
    values.push(start_date)
  }

  if (end_date !== undefined) {
    conditions.push(`payment_date <= $${paramCount++}`)
    values.push(end_date)
  }

  // Add pagination parameters
  values.push(limit, offset)
  const limitParam = `$${paramCount++}`
  const offsetParam = `$${paramCount++}`

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const results = await query<PaymentVariance>(
    `SELECT * FROM payment_variances
     ${whereClause}
     ORDER BY payment_date DESC, ABS(variance_percentage) DESC
     LIMIT ${limitParam}
     OFFSET ${offsetParam}`,
    values
  )

  return results
}
