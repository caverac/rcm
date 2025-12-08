/**
 * Tool schemas using Zod from @rcm/shared-types
 * Converts Zod schemas to JSON Schema for MCP tool definitions
 */

import { z } from 'zod'
import {
  // Input schemas from shared-types
  NormalizeClaimInputSchema,
  ClassifyDenialInputSchema,
  SuggestNextActionInputSchema,
  BatchClassifyDenialsInputSchema,
  CreateAppealInputSchema,
  UpdateAppealInputSchema,
  ListAppealsInputSchema,
  CreateWriteOffInputSchema,
  ListWriteOffsInputSchema,
  CreateRebillInputSchema,
  UpdateRebillInputSchema,
  ListRebillsInputSchema,
  CreatePaymentVarianceInputSchema,
  UpdatePaymentVarianceInputSchema,
  ListPaymentVariancesInputSchema,
  // Enum schemas for reference
  // AppealTypeSchema,
  // AppealStatusSchema,
  // AppealPrioritySchema,
  // WriteOffReasonSchema,
  // RebillReasonSchema,
  // RebillStatusSchema,
  // VarianceTypeSchema,
  // VarianceReasonSchema,
  ClaimStatusSchema,
} from '@rcm/shared-types'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

// Helper to convert Zod schema to JSON Schema with MCP-compatible format
function toInputSchema(schema: z.ZodType): Tool['inputSchema'] {
  return z.toJSONSchema(schema, {
    target: 'draft-7', // MCP uses JSON Schema draft-7
    unrepresentable: 'any',
  }) as Tool['inputSchema']
}

// Local schemas for tools not yet in shared-types
const AuditCodingInputSchema = z.object({
  claim_data: z.object({
    cpt_codes: z
      .array(
        z.object({
          code: z.string().describe('CPT code'),
          modifiers: z.array(z.string()).optional().describe('Modifiers'),
          units: z.number().optional().describe('Number of units'),
        })
      )
      .describe('CPT codes with optional modifiers'),
    diagnosis_codes: z
      .array(
        z.object({
          code: z.string().describe('ICD-10 diagnosis code'),
          pointer: z.number().optional().describe('Diagnosis pointer'),
        })
      )
      .describe('ICD-10 diagnosis codes'),
    payer_id: z
      .string()
      .optional()
      .describe('Optional payer ID for payer-specific rules'),
    place_of_service: z.string().optional().describe('Place of service code'),
  }),
  include_warnings: z
    .boolean()
    .optional()
    .describe('Include warning-level issues (default: true)'),
})

// Legacy tool schemas
const CreateClaimInputSchema = z.object({
  patientId: z.string().describe('Unique identifier for the patient'),
  amount: z.number().describe('Claim amount in dollars'),
})

const GetClaimInputSchema = z.object({
  claimId: z.string().describe('Unique identifier for the claim'),
})

const UpdateClaimStatusInputSchema = z.object({
  claimId: z.string().describe('Unique identifier for the claim'),
  status: ClaimStatusSchema.describe('New status for the claim'),
})

const ListClaimsInputSchema = z.object({
  patientId: z
    .string()
    .optional()
    .describe('Optional patient ID to filter claims'),
})

// Empty schema for analytics tools
const EmptyInputSchema = z.object({})

/**
 * MCP Tool definitions with Zod-generated JSON schemas
 */
export const tools: Tool[] = [
  {
    name: 'normalize_claim',
    description:
      'Normalize and validate claim data from various formats (837, 835, JSON). Stores claim in database if valid.',
    inputSchema: toInputSchema(NormalizeClaimInputSchema),
  },
  {
    name: 'classify_denial',
    description:
      'Classify a denial code and return category, description, and resolution guidance',
    inputSchema: toInputSchema(ClassifyDenialInputSchema),
  },
  {
    name: 'suggest_next_action',
    description:
      'Suggest next action for a denial based on organization policies and denial characteristics',
    inputSchema: toInputSchema(SuggestNextActionInputSchema),
  },
  {
    name: 'batch_classify_denials',
    description:
      'Classify multiple denials and return analytics grouped by category, payer, or code. Useful for identifying patterns and cash leakage.',
    inputSchema: toInputSchema(BatchClassifyDenialsInputSchema),
  },
  {
    name: 'audit_coding',
    description:
      'Audit claim coding for potential issues before submission. Checks for modifier requirements, diagnosis support, bundling issues, etc.',
    inputSchema: toInputSchema(AuditCodingInputSchema),
  },
  {
    name: 'create_appeal',
    description:
      'Create a new appeal for a denied claim. Automatically updates claim and denial status.',
    inputSchema: toInputSchema(CreateAppealInputSchema),
  },
  {
    name: 'update_appeal',
    description:
      'Update an existing appeal with status changes, decision information, or payer response',
    inputSchema: toInputSchema(UpdateAppealInputSchema),
  },
  {
    name: 'list_appeals',
    description:
      'Query appeals with various filters. Returns appeals sorted by priority and due date.',
    inputSchema: toInputSchema(ListAppealsInputSchema),
  },
  {
    name: 'get_appeal_analytics',
    description:
      'Get comprehensive analytics on appeals including success rates, amounts, overdue counts, and insights',
    inputSchema: toInputSchema(EmptyInputSchema),
  },
  {
    name: 'create_write_off',
    description:
      'Write off a denied claim amount. Automatically updates claim and denial status.',
    inputSchema: toInputSchema(CreateWriteOffInputSchema),
  },
  {
    name: 'list_write_offs',
    description: 'Query write-offs with various filters',
    inputSchema: toInputSchema(ListWriteOffsInputSchema),
  },
  {
    name: 'get_write_off_analytics',
    description:
      'Get comprehensive analytics on write-offs including preventable amounts, top reasons, and insights',
    inputSchema: toInputSchema(EmptyInputSchema),
  },
  {
    name: 'create_rebill',
    description:
      'Create a rebill for a denied claim after making corrections. Automatically updates denial status.',
    inputSchema: toInputSchema(CreateRebillInputSchema),
  },
  {
    name: 'update_rebill',
    description: 'Update rebill status and resolution information',
    inputSchema: toInputSchema(UpdateRebillInputSchema),
  },
  {
    name: 'list_rebills',
    description: 'Query rebills with various filters',
    inputSchema: toInputSchema(ListRebillsInputSchema),
  },
  {
    name: 'get_rebill_analytics',
    description:
      'Get comprehensive analytics on rebills including success rates, recovery amounts, and insights',
    inputSchema: toInputSchema(EmptyInputSchema),
  },
  {
    name: 'create_payment_variance',
    description:
      'Create a payment variance record when actual payment differs from expected amount. Automatically calculates variance and determines type (underpayment/overpayment).',
    inputSchema: toInputSchema(CreatePaymentVarianceInputSchema),
  },
  {
    name: 'update_payment_variance',
    description:
      'Update a payment variance record with resolution information or link to appeal',
    inputSchema: toInputSchema(UpdatePaymentVarianceInputSchema),
  },
  {
    name: 'list_payment_variances',
    description:
      'Query payment variances with optional filters for analysis and follow-up',
    inputSchema: toInputSchema(ListPaymentVariancesInputSchema),
  },
  {
    name: 'get_payment_variance_analytics',
    description:
      'Get comprehensive analytics on payment variances including underpayments, overpayments, patterns by payer, and insights',
    inputSchema: toInputSchema(EmptyInputSchema),
  },
  // Legacy tools for backward compatibility
  {
    name: 'create_claim',
    description:
      '[LEGACY] Create a new insurance claim for a patient. Use normalize_claim for better validation.',
    inputSchema: toInputSchema(CreateClaimInputSchema),
  },
  {
    name: 'get_claim',
    description: 'Retrieve claim information by claim ID',
    inputSchema: toInputSchema(GetClaimInputSchema),
  },
  {
    name: 'update_claim_status',
    description: 'Update the status of an existing claim',
    inputSchema: toInputSchema(UpdateClaimStatusInputSchema),
  },
  {
    name: 'list_claims',
    description: 'List all claims, optionally filtered by patient ID',
    inputSchema: toInputSchema(ListClaimsInputSchema),
  },
]
