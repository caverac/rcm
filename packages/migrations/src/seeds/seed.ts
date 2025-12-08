import 'dotenv/config'
import pg from 'pg'
import { logger } from '../utils/logger.js'
import { seedPayers } from './seed_payers.js'
import { seedClaims } from './seed_claims.js'
import { seedDenials } from './seed_denials.js'
import { seedAppeals } from './seed_appeals.js'
import { seedWriteOffs } from './seed_write_offs.js'
import { seedRebills } from './seed_rebills.js'
import { seedPaymentVariances } from './seed_payment_variances.js'

/**
 * Seeds the database with demo data for local development.
 *
 * Data created:
 *   - 4 payers: BCBS-CA, United Healthcare, Aetna, Medicare
 *   - 6 claims: Various statuses (paid, denied, with variances)
 *   - 4 denials: CO-197 (authorization), PR-1 (patient responsibility), CO-4 (coding), CO-50 (medical necessity)
 *   - 2 appeals: First-level appeals for authorization and medical necessity denials
 *   - 1 write-off: Small balance write-off for PR-1 denial
 *   - 1 rebill: Modifier correction for CO-4 denial
 *   - 1 payment variance: Underpayment due to incorrect fee schedule
 *
 * Run with: yarn workspace @rcm/migrations seed
 */
async function seed() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    logger.info('Connected to database')

    // Seed in order of dependencies
    await seedPayers(client)
    await seedClaims(client)
    await seedDenials(client)
    await seedAppeals(client)
    await seedWriteOffs(client)
    await seedRebills(client)
    await seedPaymentVariances(client)

    logger.info('Seed completed successfully')
  } catch (error) {
    logger.error(`Seed failed: ${error}`)
    process.exit(1)
  } finally {
    await client.end()
  }
}

void seed()
