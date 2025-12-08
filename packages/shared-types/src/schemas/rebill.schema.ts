import { z } from 'zod'

// Rebill Reason Enum
export const RebillReasonSchema = z.enum([
  'corrected_coding',
  'added_modifier',
  'updated_diagnosis',
  'corrected_info',
  'resubmit_timely',
  'provider_change',
  'other',
])

export type RebillReason = z.infer<typeof RebillReasonSchema>

// Rebill Status Enum
export const RebillStatusSchema = z.enum([
  'pending',
  'submitted',
  'accepted',
  'paid',
  'denied_again',
  'partially_paid',
])

export type RebillStatus = z.infer<typeof RebillStatusSchema>

// Changes Made Schema (tracks what was corrected)
export const RebillChangesMadeSchema = z.object({
  original_codes: z.array(z.string()).optional(),
  corrected_codes: z.array(z.string()).optional(),
  change_description: z.string().optional(),
})

export type RebillChangesMade = z.infer<typeof RebillChangesMadeSchema>

// Rebill Schema
export const RebillSchema = z.object({
  id: z.string().uuid().optional(),
  original_claim_id: z.string().uuid(),
  new_claim_id: z.string().uuid().optional().nullable(),
  denial_id: z.string().uuid(),
  rebill_reason: RebillReasonSchema,
  changes_made: RebillChangesMadeSchema.optional().nullable(),
  reason_notes: z.string().optional().nullable(),
  rebill_amount: z.number().positive(),
  status: RebillStatusSchema.default('pending'),
  submitted_date: z.coerce.date().optional().nullable(),
  resolution_date: z.coerce.date().optional().nullable(),
  recovered_amount: z.number().nonnegative().optional().nullable(),
  created_by: z.string().optional().nullable(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type Rebill = z.infer<typeof RebillSchema>

// Seed Data Schema (for inserting seed data with string dates)
export const RebillSeedSchema = z.object({
  id: z.string().uuid(),
  original_claim_id: z.string().uuid(),
  new_claim_id: z.string().uuid().optional(),
  denial_id: z.string().uuid(),
  rebill_reason: RebillReasonSchema,
  changes_made: RebillChangesMadeSchema,
  reason_notes: z.string().optional(),
  rebill_amount: z.number().positive(),
  status: RebillStatusSchema,
  submitted_date: z.string().optional(), // String for seed data
  resolution_date: z.string().optional(), // String for seed data
  recovered_amount: z.number().nonnegative().optional(),
  created_by: z.string().optional(),
})

export type RebillSeed = z.infer<typeof RebillSeedSchema>

// Create Rebill Input Schema
export const CreateRebillInputSchema = z.object({
  original_claim_id: z.string().uuid(),
  denial_id: z.string().uuid(),
  rebill_reason: RebillReasonSchema,
  changes_made: RebillChangesMadeSchema.optional(),
  reason_notes: z.string().optional(),
  rebill_amount: z.number().positive(),
  new_claim_id: z.string().uuid().optional(),
  created_by: z.string().optional(),
})

export type CreateRebillInput = z.infer<typeof CreateRebillInputSchema>

// Update Rebill Input Schema
export const UpdateRebillInputSchema = z.object({
  rebill_id: z.string().uuid(),
  status: RebillStatusSchema.optional(),
  submitted_date: z.string().optional(),
  resolution_date: z.string().optional(),
  recovered_amount: z.number().nonnegative().optional(),
  new_claim_id: z.string().uuid().optional(),
})

export type UpdateRebillInput = z.infer<typeof UpdateRebillInputSchema>

// List Rebills Input Schema
export const ListRebillsInputSchema = z.object({
  status: RebillStatusSchema.optional(),
  rebill_reason: RebillReasonSchema.optional(),
  original_claim_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().nonnegative().default(0),
})

export type ListRebillsInput = z.infer<typeof ListRebillsInputSchema>

// Rebill Analytics Schema
export const RebillAnalyticsSchema = z.object({
  total_rebills: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  total_recovered: z.number().nonnegative(),
  success_rate: z.number().min(0).max(100),
  recovery_rate: z.number().min(0).max(100).optional(),
  average_days_to_resolution: z.number().nonnegative().optional(),
  by_status: z.record(z.string(), z.number().nonnegative()),
  by_reason: z.record(
    z.string(),
    z.object({
      count: z.number().nonnegative(),
      amount: z.number().nonnegative().optional(),
      recovered: z.number().nonnegative().optional(),
      success_rate: z.number().min(0).max(100),
    })
  ),
  insights: z.array(z.string()),
})

export type RebillAnalytics = z.infer<typeof RebillAnalyticsSchema>
