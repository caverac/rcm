import { z } from 'zod'

// Payment Variance Type Enum (auto-calculated based on amounts)
export const VarianceTypeSchema = z.enum([
  'underpayment',
  'overpayment',
  'expected',
])

export type VarianceType = z.infer<typeof VarianceTypeSchema>

// Payment Variance Reason Enum
export const VarianceReasonSchema = z.enum([
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
])

export type VarianceReason = z.infer<typeof VarianceReasonSchema>

// Payment Variance Schema
export const PaymentVarianceSchema = z.object({
  id: z.string().uuid().optional(),
  claim_id: z.string().uuid(),
  payer_id: z.string().uuid(),
  expected_amount: z.number().nonnegative(),
  actual_amount: z.number().nonnegative(),
  variance_amount: z.number(), // Can be negative (underpayment) or positive (overpayment)
  variance_percentage: z.number(),
  variance_type: VarianceTypeSchema,
  variance_reason: VarianceReasonSchema.optional().nullable(),
  payment_date: z.coerce.date(),
  reason_notes: z.string().optional().nullable(),
  requires_appeal: z.boolean().default(false),
  appeal_id: z.string().uuid().optional().nullable(),
  resolved: z.boolean().default(false),
  resolution_date: z.coerce.date().optional().nullable(),
  resolution_notes: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type PaymentVariance = z.infer<typeof PaymentVarianceSchema>

// Seed Data Schema (for inserting seed data with string dates)
export const PaymentVarianceSeedSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  payer_id: z.string().uuid(),
  expected_amount: z.number().nonnegative(),
  actual_amount: z.number().nonnegative(),
  variance_amount: z.number(),
  variance_percentage: z.number(),
  variance_type: VarianceTypeSchema,
  variance_reason: VarianceReasonSchema.optional(),
  payment_date: z.string(), // String for seed data
  reason_notes: z.string().optional(),
  requires_appeal: z.boolean(),
  resolved: z.boolean(),
  created_by: z.string().optional(),
})

export type PaymentVarianceSeed = z.infer<typeof PaymentVarianceSeedSchema>

// Create Payment Variance Input Schema
export const CreatePaymentVarianceInputSchema = z.object({
  claim_id: z.string().uuid(),
  payer_id: z.string().uuid(),
  expected_amount: z.number().nonnegative(),
  actual_amount: z.number().nonnegative(),
  variance_reason: VarianceReasonSchema.optional(),
  payment_date: z.string(),
  reason_notes: z.string().optional(),
  requires_appeal: z.boolean().default(false),
  created_by: z.string().optional(),
})

export type CreatePaymentVarianceInput = z.infer<
  typeof CreatePaymentVarianceInputSchema
>

// Update Payment Variance Input Schema
export const UpdatePaymentVarianceInputSchema = z.object({
  variance_id: z.string().uuid(),
  variance_reason: VarianceReasonSchema.optional(),
  resolved: z.boolean().optional(),
  resolution_date: z.string().optional(),
  resolution_notes: z.string().optional(),
  appeal_id: z.string().uuid().optional(),
  requires_appeal: z.boolean().optional(),
})

export type UpdatePaymentVarianceInput = z.infer<
  typeof UpdatePaymentVarianceInputSchema
>

// List Payment Variances Input Schema
export const ListPaymentVariancesInputSchema = z.object({
  variance_type: VarianceTypeSchema.optional(),
  variance_reason: VarianceReasonSchema.optional(),
  payer_id: z.string().uuid().optional(),
  claim_id: z.string().uuid().optional(),
  resolved: z.boolean().optional(),
  requires_appeal: z.boolean().optional(),
  min_variance_percentage: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().nonnegative().default(0),
})

export type ListPaymentVariancesInput = z.infer<
  typeof ListPaymentVariancesInputSchema
>

// Payment Variance Analytics Schema
export const PaymentVarianceAnalyticsSchema = z.object({
  total_variances: z.number().nonnegative(),
  total_variance_amount: z.number(),
  // Support both naming conventions
  underpayment_total: z.number().nonnegative().optional(),
  overpayment_total: z.number().nonnegative().optional(),
  total_underpayment: z.number().nonnegative().optional(),
  total_overpayment: z.number().nonnegative().optional(),
  average_variance_percentage: z.number(),
  unresolved_count: z.number().nonnegative(),
  unresolved_amount: z.number(),
  appeals_required_count: z.number().nonnegative(),
  // Support both naming conventions for by_type
  by_type: z
    .record(
      z.string(),
      z.object({
        count: z.number().nonnegative(),
        amount: z.number(),
      })
    )
    .optional(),
  by_variance_type: z
    .record(
      z.string(),
      z.object({
        count: z.number().nonnegative(),
        amount: z.number(),
      })
    )
    .optional(),
  by_reason: z.record(
    z.string(),
    z.object({
      count: z.number().nonnegative(),
      amount: z.number(),
      avg_variance_pct: z.number(),
    })
  ),
  by_payer: z.record(
    z.string(),
    z.object({
      count: z.number().nonnegative(),
      total_variance: z.number(),
      avg_variance_pct: z.number(),
    })
  ),
  insights: z.array(z.string()),
})

export type PaymentVarianceAnalytics = z.infer<
  typeof PaymentVarianceAnalyticsSchema
>
