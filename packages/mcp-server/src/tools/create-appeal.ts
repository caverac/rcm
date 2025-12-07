import { query } from '../db.js'
import { CreateAppealInput, Appeal } from '../types.js'

export async function createAppeal(input: CreateAppealInput): Promise<Appeal> {
  const {
    denial_id,
    claim_id,
    appeal_type = 'first_level',
    priority = 'medium',
    appeal_amount,
    due_date,
    appeal_reason,
    supporting_documents,
    assigned_to,
  } = input

  // Validate appeal reason length
  if (appeal_reason.length < 10) {
    throw new Error('Appeal reason must be at least 10 characters long')
  }

  // Validate that denial and claim exist
  const denialResults = await query(
    'SELECT id, denial_amount FROM denials WHERE id = $1',
    [denial_id]
  )

  if (denialResults.length === 0) {
    throw new Error(`Denial ${denial_id} not found`)
  }

  const claimResults = await query('SELECT id FROM claims WHERE id = $1', [
    claim_id,
  ])

  if (claimResults.length === 0) {
    throw new Error(`Claim ${claim_id} not found`)
  }

  // Insert the appeal
  const result = await query<Appeal>(
    `INSERT INTO appeals (
      denial_id,
      claim_id,
      appeal_type,
      status,
      priority,
      appeal_amount,
      due_date,
      appeal_reason,
      supporting_documents,
      assigned_to
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      denial_id,
      claim_id,
      appeal_type,
      'pending',
      priority,
      appeal_amount,
      due_date || null,
      appeal_reason,
      supporting_documents ? JSON.stringify(supporting_documents) : null,
      assigned_to || null,
    ]
  )

  // Update the claim status to 'appealed'
  await query(
    `UPDATE claims
     SET status = 'appealed', updated_at = now()
     WHERE id = $1`,
    [claim_id]
  )

  // Update the denial to track action taken
  await query(
    `UPDATE denials
     SET action_taken = 'appeal',
         action_date = now(),
         resolution_status = 'pending',
         updated_at = now()
     WHERE id = $1`,
    [denial_id]
  )

  return result[0]
}
