import { query } from '../db.js'
import { CreateRebillInput, Rebill } from '../types.js'

export async function createRebill(input: CreateRebillInput): Promise<Rebill> {
  const {
    original_claim_id,
    denial_id,
    rebill_reason,
    changes_made,
    reason_notes,
    rebill_amount,
    new_claim_id,
    created_by,
  } = input

  // Validate rebill amount is positive
  if (rebill_amount <= 0) {
    throw new Error('Rebill amount must be positive')
  }

  // Validate that denial and original claim exist
  const denialResults = await query(
    'SELECT id, denial_amount FROM denials WHERE id = $1',
    [denial_id]
  )

  if (denialResults.length === 0) {
    throw new Error(`Denial ${denial_id} not found`)
  }

  const claimResults = await query(
    'SELECT id, status FROM claims WHERE id = $1',
    [original_claim_id]
  )

  if (claimResults.length === 0) {
    throw new Error(`Claim ${original_claim_id} not found`)
  }

  // If new_claim_id provided, validate it exists
  if (new_claim_id) {
    const newClaimResults = await query('SELECT id FROM claims WHERE id = $1', [
      new_claim_id,
    ])

    if (newClaimResults.length === 0) {
      throw new Error(`New claim ${new_claim_id} not found`)
    }
  }

  // Insert the rebill
  const result = await query<Rebill>(
    `INSERT INTO rebills (
      original_claim_id,
      denial_id,
      rebill_reason,
      changes_made,
      reason_notes,
      rebill_amount,
      new_claim_id,
      created_by,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      original_claim_id,
      denial_id,
      rebill_reason,
      changes_made ? JSON.stringify(changes_made) : null,
      reason_notes || null,
      rebill_amount,
      new_claim_id || null,
      created_by || null,
      'pending',
    ]
  )

  return result[0]
}
