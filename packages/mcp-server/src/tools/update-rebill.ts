import { query } from '../db.js'
import { UpdateRebillInput, Rebill } from '../types.js'

export async function updateRebill(input: UpdateRebillInput): Promise<Rebill> {
  const {
    rebill_id,
    status,
    submitted_date,
    resolution_date,
    recovered_amount,
    new_claim_id,
  } = input

  // Build dynamic update query
  const updates: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`)
    values.push(status)
  }

  if (submitted_date !== undefined) {
    updates.push(`submitted_date = $${paramCount++}`)
    values.push(submitted_date)
  }

  if (resolution_date !== undefined) {
    updates.push(`resolution_date = $${paramCount++}`)
    values.push(resolution_date)
  }

  if (recovered_amount !== undefined) {
    updates.push(`recovered_amount = $${paramCount++}`)
    values.push(recovered_amount)
  }

  if (new_claim_id !== undefined) {
    updates.push(`new_claim_id = $${paramCount++}`)
    values.push(new_claim_id)
  }

  if (updates.length === 0) {
    throw new Error('No fields to update')
  }

  // Add rebill_id to parameters
  values.push(rebill_id)

  const result = await query<Rebill>(
    `UPDATE rebills
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  )

  if (result.length === 0) {
    throw new Error(`Rebill ${rebill_id} not found`)
  }

  const rebill = result[0]

  // If rebill was paid or partially paid, update denial resolution
  if (status === 'paid' || status === 'partially_paid') {
    await query(
      `UPDATE denials
       SET resolution_status = 'resolved',
           recovered_amount = COALESCE(recovered_amount, 0) + $1,
           updated_at = now()
       WHERE id = $2`,
      [recovered_amount || 0, rebill.denial_id]
    )
  } else if (status === 'denied_again') {
    // Rebill was denied again
    await query(
      `UPDATE denials
       SET resolution_status = 'pending',
           updated_at = now()
       WHERE id = $1`,
      [rebill.denial_id]
    )
  }

  return rebill
}
