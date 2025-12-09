import { query, QueryParam } from '../db.js'
import { UpdateAppealInput, Appeal } from '../types.js'

export async function updateAppeal(input: UpdateAppealInput): Promise<Appeal> {
  const {
    appeal_id,
    status,
    filed_date,
    decision_date,
    approved_amount,
    payer_response,
    notes,
  } = input

  // Build dynamic update query
  const updates: string[] = []
  const values: QueryParam[] = []
  let paramCount = 1

  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`)
    values.push(status)
  }

  if (filed_date !== undefined) {
    updates.push(`filed_date = $${paramCount++}`)
    values.push(filed_date)
  }

  if (decision_date !== undefined) {
    updates.push(`decision_date = $${paramCount++}`)
    values.push(decision_date)
  }

  if (approved_amount !== undefined) {
    updates.push(`approved_amount = $${paramCount++}`)
    values.push(approved_amount)
  }

  if (payer_response !== undefined) {
    updates.push(`payer_response = $${paramCount++}`)
    values.push(payer_response)
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramCount++}`)
    values.push(notes)
  }

  if (updates.length === 0) {
    throw new Error('No fields to update')
  }

  // Add appeal_id to parameters
  values.push(appeal_id)

  const result = await query<Appeal>(
    `UPDATE appeals
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  )

  if (result.length === 0) {
    throw new Error(`Appeal ${appeal_id} not found`)
  }

  const appeal = result[0]

  // If appeal was approved or partially approved, update denial resolution
  if (status === 'approved' || status === 'partially_approved') {
    await query(
      `UPDATE denials
       SET resolution_status = 'resolved',
           recovered_amount = $1,
           updated_at = now()
       WHERE id = $2`,
      [approved_amount || 0, appeal.denial_id]
    )
  } else if (status === 'denied') {
    // Appeal was denied, mark denial as unrecoverable
    await query(
      `UPDATE denials
       SET resolution_status = 'abandoned',
           updated_at = now()
       WHERE id = $1`,
      [appeal.denial_id]
    )
  }

  return appeal
}
