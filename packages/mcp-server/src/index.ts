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
import type {
  NormalizeClaimInput,
  ClassifyDenialInput,
  SuggestNextActionInput,
  BatchClassifyDenialsInput,
  CreateAppealInput,
  UpdateAppealInput,
  ListAppealsInput,
  CreateWriteOffInput,
  ListWriteOffsInput,
  CreateRebillInput,
  UpdateRebillInput,
  ListRebillsInput,
  CreatePaymentVarianceInput,
  UpdatePaymentVarianceInput,
  ListPaymentVariancesInput,
  ClaimStatus,
} from '@rcm/shared-types'
import type { AuditCodingInput } from './types.js'

// Helper to create error response
function errorResponse(message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message }, null, 2),
      },
    ],
    isError: true,
  }
}

// Helper to create success response
function successResponse(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  }
}

// Helper to check database and return error if not available
async function requireDatabase(): Promise<
  | { available: true }
  | { available: false; response: ReturnType<typeof errorResponse> }
> {
  const dbAvailable = await isDatabaseAvailable()
  if (!dbAvailable) {
    return {
      available: false,
      response: errorResponse(
        'Database not available. Set DATABASE_URL environment variable.'
      ),
    }
  }
  return { available: true }
}

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
    // All tools require database
    const dbCheck = await requireDatabase()
    if (!dbCheck.available) {
      return dbCheck.response
    }

    // Cast args to unknown first to allow proper type assertions
    const toolArgs = args as unknown

    switch (name) {
      case 'normalize_claim': {
        const input = toolArgs as NormalizeClaimInput
        const result = await normalizeClaim(input)
        return successResponse(result)
      }

      case 'classify_denial': {
        const input = toolArgs as ClassifyDenialInput
        const result = await classifyDenial(input)
        return successResponse(result)
      }

      case 'suggest_next_action': {
        const input = toolArgs as SuggestNextActionInput
        const result = await suggestNextAction(input)
        return successResponse(result)
      }

      case 'batch_classify_denials': {
        const input = toolArgs as BatchClassifyDenialsInput
        const result = await batchClassifyDenials(input)
        return successResponse(result)
      }

      case 'audit_coding': {
        const input = toolArgs as AuditCodingInput
        const result = await auditCoding(input)
        return successResponse(result)
      }

      case 'create_appeal': {
        const input = toolArgs as CreateAppealInput
        const result = await createAppeal(input)
        return successResponse(result)
      }

      case 'update_appeal': {
        const input = toolArgs as UpdateAppealInput
        const result = await updateAppeal(input)
        return successResponse(result)
      }

      case 'list_appeals': {
        const input = toolArgs as ListAppealsInput
        const result = await listAppeals(input)
        return successResponse(result)
      }

      case 'get_appeal_analytics': {
        const result = await getAppealAnalytics()
        return successResponse(result)
      }

      case 'create_write_off': {
        const input = toolArgs as CreateWriteOffInput
        const result = await createWriteOff(input)
        return successResponse(result)
      }

      case 'list_write_offs': {
        const input = toolArgs as ListWriteOffsInput
        const result = await listWriteOffs(input)
        return successResponse(result)
      }

      case 'get_write_off_analytics': {
        const result = await getWriteOffAnalytics()
        return successResponse(result)
      }

      case 'create_rebill': {
        const input = toolArgs as CreateRebillInput
        const result = await createRebill(input)
        return successResponse(result)
      }

      case 'update_rebill': {
        const input = toolArgs as UpdateRebillInput
        const result = await updateRebill(input)
        return successResponse(result)
      }

      case 'list_rebills': {
        const input = toolArgs as ListRebillsInput
        const result = await listRebills(input)
        return successResponse(result)
      }

      case 'get_rebill_analytics': {
        const result = await getRebillAnalytics()
        return successResponse(result)
      }

      case 'create_payment_variance': {
        const input = toolArgs as CreatePaymentVarianceInput
        const result = await createPaymentVariance(input)
        return successResponse(result)
      }

      case 'update_payment_variance': {
        const input = toolArgs as UpdatePaymentVarianceInput
        const result = await updatePaymentVariance(input)
        return successResponse(result)
      }

      case 'list_payment_variances': {
        const input = toolArgs as ListPaymentVariancesInput
        const result = await listPaymentVariances(input)
        return successResponse(result)
      }

      case 'get_payment_variance_analytics': {
        const result = await getPaymentVarianceAnalytics()
        return successResponse(result)
      }

      // Legacy tools
      case 'create_claim': {
        const { patientId, amount } = toolArgs as {
          patientId: string
          amount: number
        }
        const claimId = `CLM-${Date.now()}`
        const result = await query(
          `INSERT INTO claims (claim_id, patient_id, status, amount)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [claimId, patientId, 'pending', amount]
        )
        return successResponse(result[0])
      }

      case 'get_claim': {
        const { claimId } = toolArgs as { claimId: string }
        const result = await query('SELECT * FROM claims WHERE claim_id = $1', [
          claimId,
        ])
        if (result.length === 0) {
          return errorResponse('Claim not found')
        }
        return successResponse(result[0])
      }

      case 'update_claim_status': {
        const { claimId, status } = toolArgs as {
          claimId: string
          status: ClaimStatus
        }
        const result = await query(
          'UPDATE claims SET status = $1, updated_at = now() WHERE claim_id = $2 RETURNING *',
          [status, claimId]
        )
        if (result.length === 0) {
          return errorResponse('Claim not found')
        }
        return successResponse(result[0])
      }

      case 'list_claims': {
        const { patientId } = (toolArgs as { patientId?: string }) || {}
        const result = patientId
          ? await query('SELECT * FROM claims WHERE patient_id = $1', [
              patientId,
            ])
          : await query(
              'SELECT * FROM claims ORDER BY created_at DESC LIMIT 100'
            )
        return successResponse(result)
      }

      default:
        return errorResponse(`Unknown tool: ${name}`)
    }
  } catch (error) {
    console.error(`Error in ${name}:`, error)
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error'
    )
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
      'Warning: Database not available. Set DATABASE_URL environment variable. All tools will return errors until database is connected.'
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
