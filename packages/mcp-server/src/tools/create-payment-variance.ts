import { query } from '../db.js'
import { CreatePaymentVarianceInput, PaymentVariance } from '../types.js'

export async function createPaymentVariance(
  input: CreatePaymentVarianceInput
): Promise<PaymentVariance> {
  const {
    claim_id,
    payer_id,
    expected_amount,
    actual_amount,
    variance_reason,
    payment_date,
    reason_notes,
    requires_appeal = false,
    created_by,
  } = input

  // Validate claim exists
  const claimResults = await query('SELECT id FROM claims WHERE id = $1', [
    claim_id,
  ])
  if (claimResults.length === 0) {
    throw new Error(`Claim ${claim_id} not found`)
  }

  // Calculate variance
  const variance_amount = actual_amount - expected_amount
  const variance_percentage =
    expected_amount !== 0 ? (variance_amount / expected_amount) * 100 : 0

  // Determine variance type
  let variance_type: 'underpayment' | 'overpayment' | 'expected'
  if (variance_amount < -0.01) {
    // More than 1 cent underpaid
    variance_type = 'underpayment'
  } else if (variance_amount > 0.01) {
    // More than 1 cent overpaid
    variance_type = 'overpayment'
  } else {
    variance_type = 'expected'
  }

  // Insert variance
  const result = await query<PaymentVariance>(
    `INSERT INTO payment_variances (
      claim_id,
      payer_id,
      expected_amount,
      actual_amount,
      variance_amount,
      variance_percentage,
      variance_type,
      variance_reason,
      payment_date,
      reason_notes,
      requires_appeal,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      claim_id,
      payer_id,
      expected_amount,
      actual_amount,
      variance_amount,
      variance_percentage,
      variance_type,
      variance_reason,
      payment_date,
      reason_notes,
      requires_appeal,
      created_by,
    ]
  )

  return result[0]
}
