#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
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

// In-memory fallback for when database is not available
const inMemoryClaims = new Map<string, any>()

const tools: Tool[] = [
  {
    name: 'normalize_claim',
    description:
      'Normalize and validate claim data from various formats (837, 835, JSON). Stores claim in database if valid.',
    inputSchema: {
      type: 'object',
      properties: {
        claim_data: {
          type: 'object',
          description:
            'Claim data to normalize (supports 837, 835, or JSON format)',
        },
        format: {
          type: 'string',
          enum: ['837', '835', 'json'],
          description: 'Input format (default: json)',
        },
      },
      required: ['claim_data'],
    },
  },
  {
    name: 'classify_denial',
    description:
      'Classify a denial code and return category, description, and resolution guidance',
    inputSchema: {
      type: 'object',
      properties: {
        denial_code: {
          type: 'string',
          description: 'Denial code (e.g., CO-197, PR-1)',
        },
        denial_text: {
          type: 'string',
          description: 'Optional denial reason text from remittance',
        },
        claim_data: {
          type: 'object',
          description: 'Optional claim data for context',
        },
      },
      required: ['denial_code'],
    },
  },
  {
    name: 'suggest_next_action',
    description:
      'Suggest next action for a denial based on organization policies and denial characteristics',
    inputSchema: {
      type: 'object',
      properties: {
        claim_id: {
          type: 'string',
          description: 'Claim ID',
        },
        denial_code: {
          type: 'string',
          description: 'Denial code (e.g., CO-197)',
        },
        denial_amount: {
          type: 'number',
          description: 'Denied amount in dollars',
        },
        payer_id: {
          type: 'string',
          description: 'Optional payer ID for payer-specific policies',
        },
      },
      required: ['claim_id', 'denial_code', 'denial_amount'],
    },
  },
  {
    name: 'batch_classify_denials',
    description:
      'Classify multiple denials and return analytics grouped by category, payer, or code. Useful for identifying patterns and cash leakage.',
    inputSchema: {
      type: 'object',
      properties: {
        denials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              claim_id: { type: 'string' },
              denial_code: { type: 'string' },
              denial_amount: { type: 'number' },
              payer_id: { type: 'string' },
            },
            required: ['denial_code', 'denial_amount'],
          },
          description: 'Array of denials to classify',
        },
        group_by: {
          type: 'string',
          enum: ['category', 'payer', 'code'],
          description: 'How to group denials for analytics (default: category)',
        },
      },
      required: ['denials'],
    },
  },
  {
    name: 'audit_coding',
    description:
      'Audit claim coding for potential issues before submission. Checks for modifier requirements, diagnosis support, bundling issues, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        claim_data: {
          type: 'object',
          properties: {
            cpt_codes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  modifiers: { type: 'array', items: { type: 'string' } },
                  units: { type: 'number' },
                },
                required: ['code'],
              },
              description: 'CPT codes with optional modifiers',
            },
            diagnosis_codes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  pointer: { type: 'number' },
                },
                required: ['code'],
              },
              description: 'ICD-10 diagnosis codes',
            },
            payer_id: {
              type: 'string',
              description: 'Optional payer ID for payer-specific rules',
            },
            place_of_service: {
              type: 'string',
              description: 'Place of service code',
            },
          },
          required: ['cpt_codes', 'diagnosis_codes'],
        },
        include_warnings: {
          type: 'boolean',
          description: 'Include warning-level issues (default: true)',
        },
      },
      required: ['claim_data'],
    },
  },
  {
    name: 'create_appeal',
    description:
      'Create a new appeal for a denied claim. Automatically updates claim and denial status.',
    inputSchema: {
      type: 'object',
      properties: {
        denial_id: {
          type: 'string',
          description: 'UUID of the denial to appeal',
        },
        claim_id: {
          type: 'string',
          description: 'UUID of the claim associated with the denial',
        },
        appeal_type: {
          type: 'string',
          enum: [
            'first_level',
            'second_level',
            'third_level',
            'external_review',
          ],
          description: 'Type of appeal (default: first_level)',
        },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Appeal priority (default: medium)',
        },
        appeal_amount: {
          type: 'number',
          description: 'Amount being appealed in dollars',
        },
        due_date: {
          type: 'string',
          description: 'Optional due date for the appeal (ISO 8601 format)',
        },
        appeal_reason: {
          type: 'string',
          description: 'Detailed reason for the appeal (minimum 10 characters)',
        },
        supporting_documents: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of document references/URLs',
        },
        assigned_to: {
          type: 'string',
          description: 'Person or team assigned to the appeal',
        },
      },
      required: ['denial_id', 'claim_id', 'appeal_amount', 'appeal_reason'],
    },
  },
  {
    name: 'update_appeal',
    description:
      'Update an existing appeal with status changes, decision information, or payer response',
    inputSchema: {
      type: 'object',
      properties: {
        appeal_id: {
          type: 'string',
          description: 'UUID of the appeal to update',
        },
        status: {
          type: 'string',
          enum: [
            'pending',
            'in_progress',
            'submitted',
            'under_review',
            'approved',
            'denied',
            'partially_approved',
            'withdrawn',
          ],
          description: 'New status for the appeal',
        },
        filed_date: {
          type: 'string',
          description: 'Date the appeal was filed (ISO 8601 format)',
        },
        decision_date: {
          type: 'string',
          description: 'Date of payer decision (ISO 8601 format)',
        },
        approved_amount: {
          type: 'number',
          description: 'Amount approved by payer',
        },
        payer_response: {
          type: 'string',
          description: "Payer's response or decision details",
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the appeal',
        },
      },
      required: ['appeal_id'],
    },
  },
  {
    name: 'list_appeals',
    description:
      'Query appeals with various filters. Returns appeals sorted by priority and due date.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: [
            'pending',
            'in_progress',
            'submitted',
            'under_review',
            'approved',
            'denied',
            'partially_approved',
            'withdrawn',
          ],
          description: 'Filter by appeal status',
        },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Filter by priority level',
        },
        claim_id: {
          type: 'string',
          description: 'Filter by claim UUID',
        },
        assigned_to: {
          type: 'string',
          description: 'Filter by assignee',
        },
        overdue_only: {
          type: 'boolean',
          description: 'Only return overdue appeals',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
    },
  },
  {
    name: 'get_appeal_analytics',
    description:
      'Get comprehensive analytics on appeals including success rates, amounts, overdue counts, and insights',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_write_off',
    description:
      'Write off a denied claim amount. Automatically updates claim and denial status.',
    inputSchema: {
      type: 'object',
      properties: {
        denial_id: {
          type: 'string',
          description: 'UUID of the denial to write off',
        },
        claim_id: {
          type: 'string',
          description: 'UUID of the claim associated with the denial',
        },
        write_off_amount: {
          type: 'number',
          description: 'Amount to write off in dollars',
        },
        write_off_reason: {
          type: 'string',
          enum: [
            'below_threshold',
            'timely_filing_expired',
            'non_covered_service',
            'patient_responsibility',
            'contract_adjustment',
            'uncollectible',
            'other',
          ],
          description: 'Reason for the write-off',
        },
        reason_notes: {
          type: 'string',
          description: 'Additional details about the write-off decision',
        },
        approved_by: {
          type: 'string',
          description: 'Person who approved the write-off',
        },
        category: {
          type: 'string',
          description:
            "Denial category (optional, defaults to denial's category)",
        },
        is_preventable: {
          type: 'boolean',
          description:
            'Whether this write-off was preventable (default: false)',
        },
      },
      required: [
        'denial_id',
        'claim_id',
        'write_off_amount',
        'write_off_reason',
      ],
    },
  },
  {
    name: 'list_write_offs',
    description: 'Query write-offs with various filters',
    inputSchema: {
      type: 'object',
      properties: {
        write_off_reason: {
          type: 'string',
          description: 'Filter by write-off reason',
        },
        category: {
          type: 'string',
          description: 'Filter by denial category',
        },
        is_preventable: {
          type: 'boolean',
          description: 'Filter by preventability',
        },
        claim_id: {
          type: 'string',
          description: 'Filter by claim UUID',
        },
        start_date: {
          type: 'string',
          description:
            'Filter by write-offs created after this date (ISO 8601)',
        },
        end_date: {
          type: 'string',
          description:
            'Filter by write-offs created before this date (ISO 8601)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
    },
  },
  {
    name: 'get_write_off_analytics',
    description:
      'Get comprehensive analytics on write-offs including preventable amounts, top reasons, and insights',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_rebill',
    description:
      'Create a rebill for a denied claim after making corrections. Automatically updates denial status.',
    inputSchema: {
      type: 'object',
      properties: {
        original_claim_id: {
          type: 'string',
          description: 'UUID of the original denied claim',
        },
        denial_id: {
          type: 'string',
          description: 'UUID of the denial being rebilled',
        },
        rebill_reason: {
          type: 'string',
          enum: [
            'corrected_coding',
            'added_modifier',
            'updated_diagnosis',
            'corrected_info',
            'resubmit_timely',
            'provider_change',
            'other',
          ],
          description: 'Reason for rebilling',
        },
        changes_made: {
          type: 'object',
          description: 'JSON object describing what was changed',
        },
        reason_notes: {
          type: 'string',
          description: 'Detailed notes about the rebill',
        },
        rebill_amount: {
          type: 'number',
          description: 'Amount being rebilled in dollars',
        },
        new_claim_id: {
          type: 'string',
          description: 'Optional: UUID of new claim if claim ID changed',
        },
        created_by: {
          type: 'string',
          description: 'User who created the rebill',
        },
      },
      required: [
        'original_claim_id',
        'denial_id',
        'rebill_reason',
        'rebill_amount',
      ],
    },
  },
  {
    name: 'update_rebill',
    description: 'Update rebill status and resolution information',
    inputSchema: {
      type: 'object',
      properties: {
        rebill_id: {
          type: 'string',
          description: 'UUID of the rebill to update',
        },
        status: {
          type: 'string',
          enum: [
            'pending',
            'submitted',
            'accepted',
            'paid',
            'denied_again',
            'partially_paid',
          ],
          description: 'New status for the rebill',
        },
        submitted_date: {
          type: 'string',
          description: 'Date the rebill was submitted (ISO 8601)',
        },
        resolution_date: {
          type: 'string',
          description: 'Date of resolution (ISO 8601)',
        },
        recovered_amount: {
          type: 'number',
          description: 'Amount recovered from the rebill',
        },
        new_claim_id: {
          type: 'string',
          description: 'New claim ID if it changed',
        },
      },
      required: ['rebill_id'],
    },
  },
  {
    name: 'list_rebills',
    description: 'Query rebills with various filters',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by rebill status',
        },
        rebill_reason: {
          type: 'string',
          description: 'Filter by rebill reason',
        },
        original_claim_id: {
          type: 'string',
          description: 'Filter by original claim UUID',
        },
        start_date: {
          type: 'string',
          description: 'Filter by rebills created after this date (ISO 8601)',
        },
        end_date: {
          type: 'string',
          description: 'Filter by rebills created before this date (ISO 8601)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
    },
  },
  {
    name: 'get_rebill_analytics',
    description:
      'Get comprehensive analytics on rebills including success rates, recovery amounts, and insights',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_payment_variance',
    description:
      'Create a payment variance record when actual payment differs from expected amount. Automatically calculates variance and determines type (underpayment/overpayment).',
    inputSchema: {
      type: 'object',
      properties: {
        claim_id: {
          type: 'string',
          description: 'UUID of the claim that was paid',
        },
        payer_id: {
          type: 'string',
          description: 'UUID of the payer/insurer',
        },
        expected_amount: {
          type: 'number',
          description: 'Expected payment amount based on contract',
        },
        actual_amount: {
          type: 'number',
          description: 'Actual amount paid',
        },
        variance_reason: {
          type: 'string',
          enum: [
            'contract_adjustment',
            'bundling',
            'non_covered_service',
            'missing_authorization',
            'credentialing_issue',
            'coordination_of_benefits',
            'incorrect_coding',
            'timely_filing',
            'duplicate_claim',
            'other',
          ],
          description: 'Reason for the payment variance',
        },
        payment_date: {
          type: 'string',
          description: 'Date payment was received (ISO 8601)',
        },
        reason_notes: {
          type: 'string',
          description: 'Detailed notes about the variance reason',
        },
        requires_appeal: {
          type: 'boolean',
          description:
            'Whether this variance should trigger an appeal (default: false)',
        },
        created_by: {
          type: 'string',
          description: 'User creating the variance record',
        },
      },
      required: [
        'claim_id',
        'payer_id',
        'expected_amount',
        'actual_amount',
        'payment_date',
      ],
    },
  },
  {
    name: 'update_payment_variance',
    description:
      'Update a payment variance record with resolution information or link to appeal',
    inputSchema: {
      type: 'object',
      properties: {
        variance_id: {
          type: 'string',
          description: 'UUID of the payment variance to update',
        },
        variance_reason: {
          type: 'string',
          enum: [
            'contract_adjustment',
            'bundling',
            'non_covered_service',
            'missing_authorization',
            'credentialing_issue',
            'coordination_of_benefits',
            'incorrect_coding',
            'timely_filing',
            'duplicate_claim',
            'other',
          ],
          description: 'Updated variance reason',
        },
        resolved: {
          type: 'boolean',
          description: 'Whether the variance has been resolved',
        },
        resolution_date: {
          type: 'string',
          description: 'Date the variance was resolved (ISO 8601)',
        },
        resolution_notes: {
          type: 'string',
          description: 'Notes about how the variance was resolved',
        },
        appeal_id: {
          type: 'string',
          description: 'UUID of appeal filed for this variance',
        },
        requires_appeal: {
          type: 'boolean',
          description: 'Update whether this variance requires appeal',
        },
      },
      required: ['variance_id'],
    },
  },
  {
    name: 'list_payment_variances',
    description:
      'Query payment variances with optional filters for analysis and follow-up',
    inputSchema: {
      type: 'object',
      properties: {
        variance_type: {
          type: 'string',
          enum: ['underpayment', 'overpayment', 'expected'],
          description: 'Filter by variance type',
        },
        variance_reason: {
          type: 'string',
          description: 'Filter by variance reason',
        },
        payer_id: {
          type: 'string',
          description: 'Filter by payer UUID',
        },
        claim_id: {
          type: 'string',
          description: 'Filter by claim UUID',
        },
        resolved: {
          type: 'boolean',
          description: 'Filter by resolution status',
        },
        requires_appeal: {
          type: 'boolean',
          description: 'Filter by variances requiring appeal',
        },
        min_variance_percentage: {
          type: 'number',
          description: 'Minimum absolute variance percentage to include',
        },
        start_date: {
          type: 'string',
          description: 'Filter by payments received after this date (ISO 8601)',
        },
        end_date: {
          type: 'string',
          description:
            'Filter by payments received before this date (ISO 8601)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
        },
      },
    },
  },
  {
    name: 'get_payment_variance_analytics',
    description:
      'Get comprehensive analytics on payment variances including underpayments, overpayments, patterns by payer, and insights',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // Keep legacy tools for backward compatibility
  {
    name: 'create_claim',
    description:
      '[LEGACY] Create a new insurance claim for a patient. Use normalize_claim for better validation.',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'Unique identifier for the patient',
        },
        amount: {
          type: 'number',
          description: 'Claim amount in dollars',
        },
      },
      required: ['patientId', 'amount'],
    },
  },
  {
    name: 'get_claim',
    description: 'Retrieve claim information by claim ID',
    inputSchema: {
      type: 'object',
      properties: {
        claimId: {
          type: 'string',
          description: 'Unique identifier for the claim',
        },
      },
      required: ['claimId'],
    },
  },
  {
    name: 'update_claim_status',
    description: 'Update the status of an existing claim',
    inputSchema: {
      type: 'object',
      properties: {
        claimId: {
          type: 'string',
          description: 'Unique identifier for the claim',
        },
        status: {
          type: 'string',
          enum: [
            'pending',
            'submitted',
            'paid',
            'denied',
            'appealed',
            'written_off',
          ],
          description: 'New status for the claim',
        },
      },
      required: ['claimId', 'status'],
    },
  },
  {
    name: 'list_claims',
    description: 'List all claims, optionally filtered by patient ID',
    inputSchema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'Optional patient ID to filter claims',
        },
      },
    },
  },
]

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
