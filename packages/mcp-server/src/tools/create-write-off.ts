import { query } from '../db.js'
import { CreateWriteOffInput, WriteOff } from '../types.js'

export async function createWriteOff(
  input: CreateWriteOffInput
): Promise<WriteOff> {
  const {
    denial_id,
    claim_id,
    write_off_amount,
    write_off_reason,
    reason_notes,
    approved_by,
    category,
    is_preventable = false,
  } = input

  // Validate write-off amount is positive
  if (write_off_amount <= 0) {
    throw new Error('Write-off amount must be positive')
  }

  // Validate that denial exists and check if already written off
  const denialResults = await query(
    'SELECT id, denial_amount, denial_category, written_off FROM denials WHERE id = $1',
    [denial_id]
  )

  if (denialResults.length === 0) {
    throw new Error(`Denial ${denial_id} not found`)
  }

  const denial = denialResults[0]

  // Check if denial already written off
  if (denial.written_off) {
    throw new Error(`Denial ${denial_id} has already been written off`)
  }

  // Validate that claim exists
  const claimResults = await query('SELECT id FROM claims WHERE id = $1', [
    claim_id,
  ])

  if (claimResults.length === 0) {
    throw new Error(`Claim ${claim_id} not found`)
  }

  // Insert the write-off
  const result = await query<WriteOff>(
    `INSERT INTO write_offs (
      denial_id,
      claim_id,
      write_off_amount,
      write_off_reason,
      reason_notes,
      approved_by,
      approval_date,
      category,
      is_preventable
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      denial_id,
      claim_id,
      write_off_amount,
      write_off_reason,
      reason_notes || null,
      approved_by || null,
      approved_by ? new Date() : null, // Set approval date if approved_by is provided
      category || denial.denial_category,
      is_preventable,
    ]
  )

  // Update the claim status to 'written_off'
  await query(
    `UPDATE claims
     SET status = 'written_off', updated_at = now()
     WHERE id = $1`,
    [claim_id]
  )

  return result[0]
}
