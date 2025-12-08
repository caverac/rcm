import type { Client } from 'pg'
import type { PaymentVarianceSeed } from '@rcm/shared-types'
import { logger } from '../utils/logger.js'

export async function seedPaymentVariances(client: Client): Promise<void> {
  logger.info('Seeding payment variances...')

  const paymentVariances: PaymentVarianceSeed[] = [
    // Underpayment variance - incorrect fee schedule applied
    {
      id: 'b50e8400-e29b-41d4-a716-446655440001',
      claim_id: '650e8400-e29b-41d4-a716-446655440006', // CLM-2024-001890
      payer_id: '550e8400-e29b-41d4-a716-446655440003', // Medicare
      expected_amount: 500.0,
      actual_amount: 425.0,
      variance_amount: -75.0,
      variance_percentage: -15.0,
      variance_type: 'underpayment',
      variance_reason: 'contract_adjustment',
      payment_date: '2024-02-25',
      reason_notes:
        'Payer applied incorrect fee schedule. Expected payment based on 2024 Medicare rates, but 2023 rates were applied.',
      requires_appeal: true,
      resolved: false,
      created_by: 'Payment Poster',
    },
  ]

  for (const variance of paymentVariances) {
    await client.query(
      `
      INSERT INTO payment_variances (id, claim_id, payer_id, expected_amount, actual_amount,
                                    variance_amount, variance_percentage, variance_type,
                                    variance_reason, payment_date, reason_notes,
                                    requires_appeal, resolved, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        variance.id,
        variance.claim_id,
        variance.payer_id,
        variance.expected_amount,
        variance.actual_amount,
        variance.variance_amount,
        variance.variance_percentage,
        variance.variance_type,
        variance.variance_reason,
        variance.payment_date,
        variance.reason_notes,
        variance.requires_appeal,
        variance.resolved,
        variance.created_by,
      ]
    )
    logger.debug(
      `Inserted payment variance: ${variance.id} (${variance.variance_type}: $${variance.variance_amount})`
    )
  }

  logger.info(`Seeded ${paymentVariances.length} payment variances`)
}
