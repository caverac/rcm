import { z } from 'zod'

// Denial Category Enum
export const DenialCategorySchema = z.enum([
  'AUTHORIZATION',
  'MISSING_INFO',
  'CODING_ERROR',
  'NON_COVERED',
  'COORDINATION_BENEFITS',
  'BUNDLING',
  'PATIENT_RESPONSIBILITY',
  'TIMELY_FILING',
  'DUPLICATE',
  'ELIGIBILITY',
  'CONTRACTUAL_ADJUSTMENT',
  'PAYER_INITIATED',
  'OTHER_ADJUSTMENT',
  'UNKNOWN',
])

export type DenialCategory = z.infer<typeof DenialCategorySchema>

// Denial Action Enum
export const DenialActionSchema = z.enum([
  'appeal',
  'write_off',
  'rebill',
  'transfer_to_patient',
  'investigate',
  'resubmit',
])

export type DenialAction = z.infer<typeof DenialActionSchema>

// Resolution Status Enum
export const ResolutionStatusSchema = z.enum([
  'pending',
  'in_progress',
  'resolved',
  'abandoned',
  'appealed',
])

export type ResolutionStatus = z.infer<typeof ResolutionStatusSchema>

// Denial Schema
export const DenialSchema = z.object({
  id: z.string().uuid().optional(),
  claim_id: z.string().uuid(),
  denial_code: z.string().min(1),
  denial_category: DenialCategorySchema.optional().nullable(),
  denial_reason: z.string().optional().nullable(),
  denial_amount: z.number().positive(),
  denial_date: z.coerce.date(),
  is_preventable: z.boolean().default(false),
  root_cause: z.string().optional().nullable(),
  action_taken: DenialActionSchema.optional().nullable(),
  action_date: z.coerce.date().optional().nullable(),
  resolution_status: ResolutionStatusSchema.default('pending'),
  recovered_amount: z.number().nonnegative().optional().nullable(),
  raw_data: z.record(z.any()).optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type Denial = z.infer<typeof DenialSchema>

// Denial Code Library Schema
export const DenialCodeLibrarySchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  category: DenialCategorySchema,
  description: z.string(),
  is_appealable: z.boolean().default(true),
  common_resolution: z.string().optional().nullable(),
  prevention_tips: z.string().optional().nullable(),
  created_at: z.coerce.date().optional(),
})

export type DenialCodeLibrary = z.infer<typeof DenialCodeLibrarySchema>

// Classify Denial Input Schema
export const ClassifyDenialInputSchema = z.object({
  denial_code: z.string().min(1),
  denial_text: z.string().optional(),
  claim_data: z.record(z.any()).optional(),
})

export type ClassifyDenialInput = z.infer<typeof ClassifyDenialInputSchema>

// Denial Classification Output Schema
export const DenialClassificationSchema = z.object({
  code: z.string(),
  category: DenialCategorySchema,
  description: z.string(),
  is_appealable: z.boolean(),
  common_resolution: z.string(),
  prevention_tips: z.string(),
})

export type DenialClassification = z.infer<typeof DenialClassificationSchema>

// Suggest Next Action Input Schema
export const SuggestNextActionInputSchema = z.object({
  claim_id: z.string().min(1),
  denial_code: z.string().min(1),
  denial_amount: z.number().positive(),
  payer_id: z.string().uuid().optional(),
})

export type SuggestNextActionInput = z.infer<
  typeof SuggestNextActionInputSchema
>

// Next Action Suggestion Output Schema
export const NextActionSuggestionSchema = z.object({
  recommended_action: DenialActionSchema,
  reason: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  days_to_action: z.number().positive(),
  auto_process: z.boolean(),
  policy_applied: z.string().optional(),
  estimated_recovery_chance: z.number().min(0).max(100).optional(),
  next_steps: z.array(z.string()),
})

export type NextActionSuggestion = z.infer<typeof NextActionSuggestionSchema>

// Batch Classify Denials Input Schema
export const BatchClassifyDenialsInputSchema = z.object({
  denials: z.array(
    z.object({
      claim_id: z.string().optional(),
      denial_code: z.string().min(1),
      denial_amount: z.number().positive(),
      payer_id: z.string().optional(),
    })
  ),
  group_by: z.enum(['category', 'payer', 'code']).default('category'),
})

export type BatchClassifyDenialsInput = z.infer<
  typeof BatchClassifyDenialsInputSchema
>

// Denial Analytics Output Schema
export const DenialAnalyticsSchema = z.object({
  total_denials: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  groups: z.array(
    z.object({
      group_key: z.string(),
      count: z.number().nonnegative(),
      total_amount: z.number().nonnegative(),
      percentage: z.number().min(0).max(100),
      top_codes: z.array(z.string()).optional(),
      avg_amount: z.number().nonnegative().optional(),
    })
  ),
  insights: z.array(z.string()),
})

export type DenialAnalytics = z.infer<typeof DenialAnalyticsSchema>
