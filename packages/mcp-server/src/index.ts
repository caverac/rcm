#!/usr/bin/env node

import 'dotenv/config'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { isDatabaseAvailable, query, closePool } from './db.js'
import { normalizeClaim } from './tools/normalize-claim.js'
import { classifyDenial } from './tools/classify-denial.js'
import { suggestNextAction } from './tools/suggest-next-action.js'
import { batchClassifyDenials } from './tools/batch-classify-denials.js'
import { auditCoding } from './tools/audit-coding.js'
import { createAppeal } from './tools/create-appeal.js'
import { updateAppeal } from './tools/update-appeal.js'
import { listAppeals } from './tools/list-appeals.js'
import { getAppealAnalytics } from './tools/get-appeal-analytics.js'
import { createWriteOff } from './tools/create-write-off.js'
import { listWriteOffs } from './tools/list-write-offs.js'
import { getWriteOffAnalytics } from './tools/get-write-off-analytics.js'
import { createRebill } from './tools/create-rebill.js'
import { updateRebill } from './tools/update-rebill.js'
import { listRebills } from './tools/list-rebills.js'
import { getRebillAnalytics } from './tools/get-rebill-analytics.js'
import { createPaymentVariance } from './tools/create-payment-variance.js'
import { updatePaymentVariance } from './tools/update-payment-variance.js'
import { listPaymentVariances } from './tools/list-payment-variances.js'
import { getPaymentVarianceAnalytics } from './tools/get-payment-variance-analytics.js'
import { tools } from './tool-schemas.js'

// In-memory fallback for when database is not available
const inMemoryClaims = new Map<string, any>()

const server = new Server(
  {
    name: 'rcm-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    // Check database availability for database-dependent tools
    const dbAvailable = await isDatabaseAvailable()

    switch (name) {
      case 'normalize_claim': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await normalizeClaim(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'classify_denial': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await classifyDenial(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'suggest_next_action': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await suggestNextAction(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'batch_classify_denials': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await batchClassifyDenials(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'audit_coding': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await auditCoding(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'create_appeal': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await createAppeal(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'update_appeal': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await updateAppeal(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'list_appeals': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await listAppeals(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'get_appeal_analytics': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await getAppealAnalytics()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'create_write_off': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await createWriteOff(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'list_write_offs': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await listWriteOffs(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'get_write_off_analytics': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await getWriteOffAnalytics()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'create_rebill': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await createRebill(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'update_rebill': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await updateRebill(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'list_rebills': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await listRebills(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'get_rebill_analytics': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await getRebillAnalytics()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'create_payment_variance': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await createPaymentVariance(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'update_payment_variance': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await updatePaymentVariance(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'list_payment_variances': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await listPaymentVariances(args as any)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'get_payment_variance_analytics': {
        if (!dbAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error:
                      'Database not available. Set DATABASE_URL environment variable.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          }
        }
        const result = await getPaymentVarianceAnalytics()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      // Legacy tools (in-memory or database)
      case 'create_claim': {
        const { patientId, amount } = args as {
          patientId: string
          amount: number
        }
        const claimId = `CLM-${Date.now()}`

        if (dbAvailable) {
          // Use database
          const result = await query(
            `INSERT INTO claims (claim_id, patient_id, status, amount)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [claimId, patientId, 'pending', amount]
          )
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result[0], null, 2),
              },
            ],
          }
        } else {
          // Use in-memory
          const claim = {
            claimId,
            patientId,
            amount,
            status: 'pending',
          }
          inMemoryClaims.set(claimId, claim)
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claim, null, 2),
              },
            ],
          }
        }
      }

      case 'get_claim': {
        const { claimId } = args as { claimId: string }

        if (dbAvailable) {
          const result = await query(
            'SELECT * FROM claims WHERE claim_id = $1',
            [claimId]
          )
          if (result.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result[0], null, 2),
              },
            ],
          }
        } else {
          const claim = inMemoryClaims.get(claimId)
          if (!claim) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claim, null, 2),
              },
            ],
          }
        }
      }

      case 'update_claim_status': {
        const { claimId, status } = args as { claimId: string; status: string }

        if (dbAvailable) {
          const result = await query(
            'UPDATE claims SET status = $1, updated_at = now() WHERE claim_id = $2 RETURNING *',
            [status, claimId]
          )
          if (result.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            }
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result[0], null, 2),
              },
            ],
          }
        } else {
          const claim = inMemoryClaims.get(claimId)
          if (!claim) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Claim not found' }),
                },
              ],
              isError: true,
            }
          }
          claim.status = status
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claim, null, 2),
              },
            ],
          }
        }
      }

      case 'list_claims': {
        const { patientId } = (args as { patientId?: string }) || {}

        if (dbAvailable) {
          const result = patientId
            ? await query('SELECT * FROM claims WHERE patient_id = $1', [
                patientId,
              ])
            : await query(
                'SELECT * FROM claims ORDER BY created_at DESC LIMIT 100'
              )

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        } else {
          let claimsList = Array.from(inMemoryClaims.values())
          if (patientId) {
            claimsList = claimsList.filter((c) => c.patientId === patientId)
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(claimsList, null, 2),
              },
            ],
          }
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        }
    }
  } catch (error) {
    console.error(`Error in ${name}:`, error)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            tool: name,
          }),
        },
      ],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Check database connection
  const dbAvailable = await isDatabaseAvailable()
  if (dbAvailable) {
    console.error('RCM MCP Server v2.0 running on stdio (PostgreSQL connected)')
  } else {
    console.error(
      'RCM MCP Server v2.0 running on stdio (in-memory mode - set DATABASE_URL for full functionality)'
    )
  }
}

process.on('SIGINT', async () => {
  console.error('Shutting down...')
  await closePool()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.error('Shutting down...')
  await closePool()
  process.exit(0)
})

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
