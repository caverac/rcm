import { z } from 'zod'

// Appeal Status Enum
export const AppealStatusSchema = z.enum([
  'pending',
  'in_progress',
  'submitted',
  'under_review',
  'approved',
  'denied',
  'partially_approved',
  'withdrawn',
])

export type AppealStatus = z.infer<typeof AppealStatusSchema>

// Appeal Priority Enum
export const AppealPrioritySchema = z.enum(['high', 'medium', 'low'])

export type AppealPriority = z.infer<typeof AppealPrioritySchema>

// Appeal Type Enum
export const AppealTypeSchema = z.enum([
  'first_level',
  'second_level',
  'third_level',
  'external_review',
])

export type AppealType = z.infer<typeof AppealTypeSchema>

// Appeal Schema
export const AppealSchema = z.object({
  id: z.string().uuid().optional(),
  denial_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  appeal_type: AppealTypeSchema.default('first_level'),
  status: AppealStatusSchema.default('pending'),
  priority: AppealPrioritySchema.default('medium'),
  appeal_amount: z.number().positive(),
  filed_date: z.coerce.date().optional().nullable(),
  due_date: z.coerce.date().optional().nullable(),
  decision_date: z.coerce.date().optional().nullable(),
  approved_amount: z.number().nonnegative().optional().nullable(),
  appeal_reason: z.string().optional().nullable(),
  supporting_documents: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  payer_response: z.string().optional().nullable(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type Appeal = z.infer<typeof AppealSchema>

// Create Appeal Input Schema
export const CreateAppealInputSchema = z.object({
  denial_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  appeal_type: AppealTypeSchema.default('first_level'),
  priority: AppealPrioritySchema.default('medium'),
  appeal_amount: z.number().positive(),
  due_date: z.string().optional().describe('Due date for the appeal (ISO 8601 format)'),
  appeal_reason: z
    .string()
    .min(10, 'Appeal reason must be at least 10 characters'),
  supporting_documents: z.array(z.string()).optional(),
  assigned_to: z.string().optional(),
})

export type CreateAppealInput = z.infer<typeof CreateAppealInputSchema>

// Update Appeal Input Schema
export const UpdateAppealInputSchema = z.object({
  appeal_id: z.string().uuid(),
  status: AppealStatusSchema.optional(),
  filed_date: z.coerce.date().optional(),
  decision_date: z.coerce.date().optional(),
  approved_amount: z.number().nonnegative().optional(),
  payer_response: z.string().optional(),
  notes: z.string().optional(),
})

export type UpdateAppealInput = z.infer<typeof UpdateAppealInputSchema>

// List Appeals Input Schema
export const ListAppealsInputSchema = z.object({
  status: AppealStatusSchema.optional(),
  priority: AppealPrioritySchema.optional(),
  claim_id: z.string().uuid().optional(),
  assigned_to: z.string().optional(),
  overdue_only: z.boolean().optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().nonnegative().default(0),
})

export type ListAppealsInput = z.infer<typeof ListAppealsInputSchema>

// Appeal Analytics Schema
export const AppealAnalyticsSchema = z.object({
  total_appeals: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  total_approved_amount: z.number().nonnegative(),
  success_rate: z.number().min(0).max(100),
  average_days_to_decision: z.number().nonnegative().optional(),
  by_status: z.record(AppealStatusSchema, z.number().nonnegative()),
  by_priority: z.record(AppealPrioritySchema, z.number().nonnegative()),
  overdue_count: z.number().nonnegative(),
  insights: z.array(z.string()),
})

export type AppealAnalytics = z.infer<typeof AppealAnalyticsSchema>

// Supporting Document Seed Schema
export const SupportingDocumentSeedSchema = z.object({
  type: z.string(),
  filename: z.string(),
  uploaded_at: z.string(),
})

export type SupportingDocumentSeed = z.infer<typeof SupportingDocumentSeedSchema>

// Appeal Seed Schema (for inserting seed data with string dates)
export const AppealSeedSchema = z.object({
  id: z.string().uuid(),
  denial_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  appeal_type: AppealTypeSchema,
  status: AppealStatusSchema,
  priority: AppealPrioritySchema,
  appeal_amount: z.number().positive(),
  filed_date: z.string().optional(), // String for seed data
  due_date: z.string().optional(), // String for seed data
  decision_date: z.string().optional(), // String for seed data
  approved_amount: z.number().nonnegative().optional(),
  appeal_reason: z.string().optional(),
  supporting_documents: z.array(SupportingDocumentSeedSchema).optional(),
  notes: z.string().optional(),
  assigned_to: z.string().optional(),
  payer_response: z.string().optional(),
})

export type AppealSeed = z.infer<typeof AppealSeedSchema>
