import type { Client } from 'pg'
import { logger } from '../utils/logger.js'

export async function seedWriteOffs(client: Client): Promise<void> {
  logger.info('Seeding write-offs...')

  const writeOffs = [
    // Small balance write-off for PR-1 denial
    {
      id: '950e8400-e29b-41d4-a716-446655440001',
      denial_id: '750e8400-e29b-41d4-a716-446655440002',
      claim_id: '650e8400-e29b-41d4-a716-446655440003', // CLM-2024-001236
      write_off_amount: 15.0,
      write_off_reason: 'below_threshold',
      reason_notes:
        'Amount below $25 small-balance threshold per organization policy. Cost to pursue exceeds potential recovery.',
      approved_by: 'Billing Manager',
      approval_date: '2024-01-30',
      category: 'PATIENT_RESPONSIBILITY',
      is_preventable: true,
    },
  ]

  for (const writeOff of writeOffs) {
    await client.query(
      `
      INSERT INTO write_offs (id, denial_id, claim_id, write_off_amount, write_off_reason,
                             reason_notes, approved_by, approval_date, category, is_preventable)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        writeOff.id,
        writeOff.denial_id,
        writeOff.claim_id,
        writeOff.write_off_amount,
        writeOff.write_off_reason,
        writeOff.reason_notes,
        writeOff.approved_by,
        writeOff.approval_date,
        writeOff.category,
        writeOff.is_preventable,
      ]
    )
    logger.debug(`Inserted write-off: ${writeOff.id} ($${writeOff.write_off_amount})`)
  }

  logger.info(`Seeded ${writeOffs.length} write-offs`)
}
