import type { Client } from 'pg'
import type { DenialSeed } from '@rcm/shared-types'
import { logger } from '../utils/logger.js'

export async function seedDenials(client: Client): Promise<void> {
  logger.info('Seeding denials...')

  const denials: DenialSeed[] = [
    // CO-197: Missing prior authorization denial (will be appealed)
    {
      id: '750e8400-e29b-41d4-a716-446655440001',
      claim_id: '650e8400-e29b-41d4-a716-446655440002', // CLM-2024-001235
      denial_code: 'CO-197',
      denial_category: 'AUTHORIZATION',
      denial_reason: 'Precertification/authorization/notification absent',
      denial_amount: 500.0,
      denial_date: '2024-01-15',
      is_preventable: true,
      root_cause: 'Authorization not obtained prior to service',
      resolution_status: 'pending',
      appealed: true,
    },
    // PR-1: Patient responsibility - small balance (will be written off)
    {
      id: '750e8400-e29b-41d4-a716-446655440002',
      claim_id: '650e8400-e29b-41d4-a716-446655440003', // CLM-2024-001236
      denial_code: 'PR-1',
      denial_category: 'PATIENT_RESPONSIBILITY',
      denial_reason: 'Deductible amount - patient not covered',
      denial_amount: 15.0,
      denial_date: '2024-01-25',
      is_preventable: true,
      root_cause: 'Registration error - eligibility not verified',
      resolution_status: 'abandoned',
      written_off: true,
      write_off_date: '2024-01-30',
    },
    // CO-4: Modifier error (will be rebilled)
    {
      id: '750e8400-e29b-41d4-a716-446655440003',
      claim_id: '650e8400-e29b-41d4-a716-446655440004', // CLM-2024-001237
      denial_code: 'CO-4',
      denial_category: 'CODING_ERROR',
      denial_reason:
        'The procedure code is inconsistent with the modifier used or a required modifier is missing',
      denial_amount: 250.0,
      denial_date: '2024-02-05',
      is_preventable: true,
      root_cause: 'Missing modifier 25 on E/M code billed with procedure',
      resolution_status: 'resolved',
      action_taken: 'rebill',
      action_date: '2024-02-08',
      recovered_amount: 200.0,
      rebilled: true,
      rebill_date: '2024-02-08',
    },
    // CO-50: Medical necessity denial (pending review)
    {
      id: '750e8400-e29b-41d4-a716-446655440004',
      claim_id: '650e8400-e29b-41d4-a716-446655440002', // CLM-2024-001235 (second denial on same claim)
      denial_code: 'CO-50',
      denial_category: 'MEDICAL_NECESSITY',
      denial_reason:
        'These are non-covered services because this is not deemed a medical necessity',
      denial_amount: 500.0,
      denial_date: '2024-01-20',
      is_preventable: false,
      root_cause: 'Clinical documentation insufficient',
      resolution_status: 'pending',
    },
  ]

  for (const denial of denials) {
    await client.query(
      `
      INSERT INTO denials (id, claim_id, denial_code, denial_category, denial_reason,
                          denial_amount, denial_date, is_preventable, root_cause,
                          resolution_status, action_taken, action_date, recovered_amount,
                          appealed, written_off, write_off_date, rebilled, rebill_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        denial.id,
        denial.claim_id,
        denial.denial_code,
        denial.denial_category,
        denial.denial_reason,
        denial.denial_amount,
        denial.denial_date,
        denial.is_preventable,
        denial.root_cause,
        denial.resolution_status,
        denial.action_taken || null,
        denial.action_date || null,
        denial.recovered_amount || null,
        denial.appealed || false,
        denial.written_off || false,
        denial.write_off_date || null,
        denial.rebilled || false,
        denial.rebill_date || null,
      ]
    )
    logger.debug(`Inserted denial: ${denial.denial_code} for claim ${denial.claim_id}`)
  }

  logger.info(`Seeded ${denials.length} denials`)
}
