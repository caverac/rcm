import { z } from 'zod'

// Rule Type Enum
export const RuleTypeSchema = z.enum([
  'modifier_required',
  'diagnosis_support',
  'bundling',
  'incompatible_codes',
  'diagnosis_validation',
])

export type RuleType = z.infer<typeof RuleTypeSchema>

// Severity Enum
export const SeveritySchema = z.enum(['error', 'warning', 'info'])

export type Severity = z.infer<typeof SeveritySchema>

// Coding Rule Schema
export const CodingRuleSchema = z.object({
  id: z.string().uuid().optional(),
  rule_name: z.string().min(1),
  rule_type: RuleTypeSchema,
  cpt_code: z.string().optional().nullable(),
  cpt_pattern: z.string().optional().nullable(),
  required_modifier: z.string().max(10).optional().nullable(),
  incompatible_codes: z.array(z.string()).optional(),
  required_diagnosis_pattern: z.string().optional().nullable(),
  payer_specific: z.string().uuid().optional().nullable(),
  error_message: z.string().min(1),
  severity: SeveritySchema.default('warning'),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().optional(),
})

export type CodingRule = z.infer<typeof CodingRuleSchema>

// Audit Coding Input Schema
export const AuditCodingInputSchema = z.object({
  claim_data: z.object({
    cpt_codes: z.array(
      z.object({
        code: z.string(),
        modifiers: z.array(z.string()).optional(),
      })
    ),
    diagnosis_codes: z.array(
      z.object({
        code: z.string(),
      })
    ),
    payer_id: z.string().uuid().optional(),
    place_of_service: z.string().optional(),
  }),
  include_warnings: z.boolean().default(true),
})

export type AuditCodingInput = z.infer<typeof AuditCodingInputSchema>

// Coding Audit Result Schema
export const CodingAuditResultSchema = z.object({
  passed: z.boolean(),
  errors: z.array(
    z.object({
      rule_name: z.string(),
      severity: SeveritySchema,
      message: z.string(),
      cpt_code: z.string().optional(),
      suggestion: z.string().optional(),
    })
  ),
  summary: z.object({
    total_issues: z.number().nonnegative(),
    errors: z.number().nonnegative(),
    warnings: z.number().nonnegative(),
    info: z.number().nonnegative(),
  }),
  risk_level: z.enum(['high', 'medium', 'low']),
})

export type CodingAuditResult = z.infer<typeof CodingAuditResultSchema>
