import type { Client } from 'pg'
import { logger } from '../utils/logger.js'

export async function seedPayers(client: Client): Promise<void> {
  logger.info('Seeding payers...')

  const payers = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      payer_id: 'BCBS-CA-001',
      name: 'Blue Cross Blue Shield - California',
      type: 'commercial',
      contact_info: {
        phone: '1-800-555-0101',
        email: 'claims@bcbs-ca.example.com',
        address: '123 Insurance Way, Los Angeles, CA 90001',
      },
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      payer_id: 'UHC-001',
      name: 'United Healthcare',
      type: 'commercial',
      contact_info: {
        phone: '1-800-555-0102',
        email: 'claims@uhc.example.com',
        address: '456 Health Blvd, Minneapolis, MN 55402',
      },
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      payer_id: 'AETNA-001',
      name: 'Aetna',
      type: 'commercial',
      contact_info: {
        phone: '1-800-555-0103',
        email: 'claims@aetna.example.com',
        address: '789 Coverage Dr, Hartford, CT 06156',
      },
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      payer_id: 'MEDICARE-001',
      name: 'Medicare',
      type: 'medicare',
      contact_info: {
        phone: '1-800-MEDICARE',
        email: 'claims@medicare.gov',
        address: '7500 Security Blvd, Baltimore, MD 21244',
      },
    },
  ]

  for (const payer of payers) {
    await client.query(
      `
      INSERT INTO payers (id, payer_id, name, type, contact_info)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        payer.id,
        payer.payer_id,
        payer.name,
        payer.type,
        JSON.stringify(payer.contact_info),
      ]
    )
    logger.debug(`Inserted payer: ${payer.name}`)
  }

  logger.info(`Seeded ${payers.length} payers`)
}
