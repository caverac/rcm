import type { Client } from 'pg'
import type { ClaimSeed } from '@rcm/shared-types'
import { logger } from '../utils/logger.js'

export async function seedClaims(client: Client): Promise<void> {
  logger.info('Seeding claims...')

  const claims: ClaimSeed[] = [
    // Claim that will be paid successfully
    {
      id: '650e8400-e29b-41d4-a716-446655440001',
      claim_id: 'CLM-2024-001234',
      patient_id: 'PAT-001',
      payer_id: '550e8400-e29b-41d4-a716-446655440000', // BCBS-CA
      status: 'paid',
      amount: 150.0,
      paid_amount: 120.0,
      service_date: '2024-01-15',
      submitted_date: '2024-01-16',
      cpt_codes: [
        {
          code: '99213',
          description:
            'Office/outpatient visit, established patient, low complexity',
        },
      ],
      diagnosis_codes: [
        { code: 'I10', description: 'Essential (primary) hypertension' },
      ],
      place_of_service: '11',
      claim_type: 'professional',
    },
    // Claim that will be denied for missing authorization (CO-197)
    {
      id: '650e8400-e29b-41d4-a716-446655440002',
      claim_id: 'CLM-2024-001235',
      patient_id: 'PAT-002',
      payer_id: '550e8400-e29b-41d4-a716-446655440000', // BCBS-CA
      status: 'denied',
      amount: 500.0,
      paid_amount: null,
      service_date: '2024-01-10',
      submitted_date: '2024-01-11',
      cpt_codes: [{ code: '70553', description: 'MRI brain with contrast' }],
      diagnosis_codes: [
        { code: 'R51.9', description: 'Headache, unspecified' },
      ],
      place_of_service: '22',
      claim_type: 'professional',
    },
    // Claim that will be denied for small balance write-off (PR-1)
    {
      id: '650e8400-e29b-41d4-a716-446655440003',
      claim_id: 'CLM-2024-001236',
      patient_id: 'PAT-003',
      payer_id: '550e8400-e29b-41d4-a716-446655440001', // UHC
      status: 'denied',
      amount: 15.0,
      paid_amount: null,
      service_date: '2024-01-20',
      submitted_date: '2024-01-21',
      cpt_codes: [
        { code: '99211', description: 'Office visit, minimal complexity' },
      ],
      diagnosis_codes: [
        { code: 'Z00.00', description: 'General adult medical examination' },
      ],
      place_of_service: '11',
      claim_type: 'professional',
    },
    // Claim that will be denied for modifier error (CO-4) and rebilled
    {
      id: '650e8400-e29b-41d4-a716-446655440004',
      claim_id: 'CLM-2024-001237',
      patient_id: 'PAT-004',
      payer_id: '550e8400-e29b-41d4-a716-446655440002', // Aetna
      status: 'denied',
      amount: 250.0,
      paid_amount: null,
      service_date: '2024-02-01',
      submitted_date: '2024-02-02',
      cpt_codes: [
        { code: '99213', description: 'Office visit, low complexity' },
        { code: '11102', description: 'Tangential biopsy of skin' },
      ],
      diagnosis_codes: [
        { code: 'L82.1', description: 'Other seborrheic keratosis' },
      ],
      place_of_service: '11',
      claim_type: 'professional',
    },
    // Corrected rebill claim for CLM-2024-001237
    {
      id: '650e8400-e29b-41d4-a716-446655440005',
      claim_id: 'CLM-2024-001567',
      patient_id: 'PAT-004',
      payer_id: '550e8400-e29b-41d4-a716-446655440002', // Aetna
      status: 'paid',
      amount: 250.0,
      paid_amount: 200.0,
      service_date: '2024-02-01',
      submitted_date: '2024-02-10',
      cpt_codes: [
        {
          code: '99213',
          modifier: '25',
          description: 'Office visit with significant separate E/M',
        },
        { code: '11102', description: 'Tangential biopsy of skin' },
      ],
      diagnosis_codes: [
        { code: 'L82.1', description: 'Other seborrheic keratosis' },
      ],
      place_of_service: '11',
      claim_type: 'professional',
    },
    // Claim with payment variance (underpayment)
    {
      id: '650e8400-e29b-41d4-a716-446655440006',
      claim_id: 'CLM-2024-001890',
      patient_id: 'PAT-005',
      payer_id: '550e8400-e29b-41d4-a716-446655440003', // Medicare
      status: 'paid',
      amount: 500.0,
      paid_amount: 425.0,
      service_date: '2024-02-15',
      submitted_date: '2024-02-16',
      cpt_codes: [
        { code: '99214', description: 'Office visit, moderate complexity' },
        { code: '93000', description: 'Electrocardiogram, complete' },
      ],
      diagnosis_codes: [
        { code: 'I25.10', description: 'Atherosclerotic heart disease' },
      ],
      place_of_service: '11',
      claim_type: 'professional',
      has_payment_variance: true,
      variance_count: 1,
    },
  ]

  for (const claim of claims) {
    await client.query(
      `
      INSERT INTO claims (id, claim_id, patient_id, payer_id, status, amount, paid_amount,
                         service_date, submitted_date, cpt_codes, diagnosis_codes,
                         place_of_service, claim_type, has_payment_variance, variance_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        claim.id,
        claim.claim_id,
        claim.patient_id,
        claim.payer_id,
        claim.status,
        claim.amount,
        claim.paid_amount,
        claim.service_date,
        claim.submitted_date,
        JSON.stringify(claim.cpt_codes),
        JSON.stringify(claim.diagnosis_codes),
        claim.place_of_service,
        claim.claim_type,
        claim.has_payment_variance || false,
        claim.variance_count || 0,
      ]
    )
    logger.debug(`Inserted claim: ${claim.claim_id}`)
  }

  logger.info(`Seeded ${claims.length} claims`)
}
