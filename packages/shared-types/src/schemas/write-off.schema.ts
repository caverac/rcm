import { z } from 'zod'
import { DenialCategorySchema } from './denial.schema.js'

// Write-off Reason Enum
export const WriteOffReasonSchema = z.enum([
  'below_threshold',
  'timely_filing_expired',
  'non_covered_service',
  'patient_responsibility',
  'contract_adjustment',
  'uncollectible',
  'other',
])

export type WriteOffReason = z.infer<typeof WriteOffReasonSchema>

// Write-off Category Enum (maps to denial categories for tracking)
export const WriteOffCategorySchema = z.enum([
  'ADMINISTRATIVE',
  'CLINICAL',
  'FINANCIAL',
  'PATIENT_RESPONSIBILITY',
])

export type WriteOffCategory = z.infer<typeof WriteOffCategorySchema>

// Write-off Schema
export const WriteOffSchema = z.object({
  id: z.string().uuid().optional(),
  denial_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  write_off_amount: z.number().positive(),
  write_off_reason: WriteOffReasonSchema,
  reason_notes: z.string().optional().nullable(),
  approved_by: z.string().optional().nullable(),
  approval_date: z.coerce.date().optional().nullable(),
  category: WriteOffCategorySchema.optional().nullable(),
  is_preventable: z.boolean().default(false),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type WriteOff = z.infer<typeof WriteOffSchema>

// Seed Data Schema (for inserting seed data with string dates)
export const WriteOffSeedSchema = z.object({
  id: z.string().uuid(),
  denial_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  write_off_amount: z.number().positive(),
  write_off_reason: WriteOffReasonSchema,
  reason_notes: z.string().optional(),
  approved_by: z.string().optional(),
  approval_date: z.string().optional(), // String for seed data
  category: WriteOffCategorySchema.optional(),
  is_preventable: z.boolean(),
})

export type WriteOffSeed = z.infer<typeof WriteOffSeedSchema>

// Create Write-off Input Schema
export const CreateWriteOffInputSchema = z.object({
  denial_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  write_off_amount: z.number().positive(),
  write_off_reason: WriteOffReasonSchema,
  reason_notes: z.string().optional(),
  approved_by: z.string().optional(),
  category: WriteOffCategorySchema.optional(),
  is_preventable: z.boolean().default(false),
})

export type CreateWriteOffInput = z.infer<typeof CreateWriteOffInputSchema>

// List Write-offs Input Schema
export const ListWriteOffsInputSchema = z.object({
  write_off_reason: WriteOffReasonSchema.optional(),
  category: WriteOffCategorySchema.optional(),
  is_preventable: z.boolean().optional(),
  claim_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().nonnegative().default(0),
})

export type ListWriteOffsInput = z.infer<typeof ListWriteOffsInputSchema>

// Write-off Analytics Schema
export const WriteOffAnalyticsSchema = z.object({
  total_write_offs: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  preventable_count: z.number().nonnegative().optional(),
  preventable_amount: z.number().nonnegative(),
  preventable_percentage: z.number().min(0).max(100),
  by_reason: z.record(
    z.string(),
    z.object({
      count: z.number().nonnegative(),
      amount: z.number().nonnegative(),
    })
  ),
  by_category: z.record(
    z.string(),
    z.object({
      count: z.number().nonnegative(),
      amount: z.number().nonnegative(),
    })
  ),
  top_preventable_categories: z.array(
    z.object({
      category: z.string(),
      count: z.number().nonnegative(),
      amount: z.number().nonnegative(),
    })
  ),
  insights: z.array(z.string()),
})

export type WriteOffAnalytics = z.infer<typeof WriteOffAnalyticsSchema>
