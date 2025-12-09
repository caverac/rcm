import type { Client } from 'pg'
import type { RebillSeed } from '@rcm/shared-types'
import { logger } from '../utils/logger.js'

export async function seedRebills(client: Client): Promise<void> {
  logger.info('Seeding rebills...')

  const rebills: RebillSeed[] = [
    // Rebill for CO-4 modifier error - successfully paid
    {
      id: 'a50e8400-e29b-41d4-a716-446655440001',
      original_claim_id: '650e8400-e29b-41d4-a716-446655440004', // CLM-2024-001237
      new_claim_id: '650e8400-e29b-41d4-a716-446655440005', // CLM-2024-001567
      denial_id: '750e8400-e29b-41d4-a716-446655440003',
      rebill_reason: 'added_modifier',
      changes_made: {
        original_codes: ['99213', '11102'],
        corrected_codes: ['99213-25', '11102'],
        change_description:
          'Added modifier 25 to E/M code 99213 to indicate significant, separately identifiable evaluation and management service',
      },
      reason_notes:
        'Modifier 25 required when billing E/M service on same day as procedure per payer guidelines',
      rebill_amount: 250.0,
      status: 'paid',
      submitted_date: '2024-02-10',
      resolution_date: '2024-02-20',
      recovered_amount: 200.0,
      created_by: 'Coding Specialist',
    },
  ]

  for (const rebill of rebills) {
    await client.query(
      `
      INSERT INTO rebills (id, original_claim_id, new_claim_id, denial_id, rebill_reason,
                          changes_made, reason_notes, rebill_amount, status,
                          submitted_date, resolution_date, recovered_amount, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        rebill.id,
        rebill.original_claim_id,
        rebill.new_claim_id,
        rebill.denial_id,
        rebill.rebill_reason,
        JSON.stringify(rebill.changes_made),
        rebill.reason_notes,
        rebill.rebill_amount,
        rebill.status,
        rebill.submitted_date,
        rebill.resolution_date,
        rebill.recovered_amount,
        rebill.created_by,
      ]
    )
    logger.debug(`Inserted rebill: ${rebill.id} (${rebill.rebill_reason})`)
  }

  logger.info(`Seeded ${rebills.length} rebills`)
}
