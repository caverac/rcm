import type { Client } from 'pg'
import { logger } from '../utils/logger.js'

export async function seedAppeals(client: Client): Promise<void> {
  logger.info('Seeding appeals...')

  const appeals = [
    // First-level appeal for CO-197 authorization denial
    {
      id: '850e8400-e29b-41d4-a716-446655440001',
      denial_id: '750e8400-e29b-41d4-a716-446655440001',
      claim_id: '650e8400-e29b-41d4-a716-446655440002', // CLM-2024-001235
      appeal_type: 'first_level',
      status: 'submitted',
      priority: 'high',
      appeal_amount: 500.0,
      filed_date: '2024-01-20',
      due_date: '2024-02-20',
      appeal_reason:
        'Authorization was obtained prior to service - see attached documentation',
      supporting_documents: [
        {
          type: 'authorization_form',
          filename: 'auth_form_12345.pdf',
          uploaded_at: '2024-01-20',
        },
        {
          type: 'clinical_notes',
          filename: 'clinical_notes_pat002.pdf',
          uploaded_at: '2024-01-20',
        },
      ],
      notes: 'Escalated to high priority due to amount exceeding $250 threshold',
      assigned_to: 'Jane Smith',
    },
    // Appeal for payment variance recovery
    {
      id: '850e8400-e29b-41d4-a716-446655440002',
      denial_id: '750e8400-e29b-41d4-a716-446655440004', // CO-50 denial
      claim_id: '650e8400-e29b-41d4-a716-446655440002',
      appeal_type: 'first_level',
      status: 'pending',
      priority: 'medium',
      appeal_amount: 500.0,
      filed_date: '2024-01-25',
      due_date: '2024-02-25',
      appeal_reason:
        'Medical necessity supported by clinical documentation - MRI indicated for persistent headaches',
      supporting_documents: [
        {
          type: 'letter_of_medical_necessity',
          filename: 'lmn_pat002.pdf',
          uploaded_at: '2024-01-25',
        },
      ],
      assigned_to: 'John Doe',
    },
  ]

  for (const appeal of appeals) {
    await client.query(
      `
      INSERT INTO appeals (id, denial_id, claim_id, appeal_type, status, priority,
                          appeal_amount, filed_date, due_date, appeal_reason,
                          supporting_documents, notes, assigned_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        appeal.id,
        appeal.denial_id,
        appeal.claim_id,
        appeal.appeal_type,
        appeal.status,
        appeal.priority,
        appeal.appeal_amount,
        appeal.filed_date,
        appeal.due_date,
        appeal.appeal_reason,
        JSON.stringify(appeal.supporting_documents),
        appeal.notes || null,
        appeal.assigned_to,
      ]
    )
    logger.debug(`Inserted appeal: ${appeal.id} (${appeal.appeal_type})`)
  }

  logger.info(`Seeded ${appeals.length} appeals`)
}
