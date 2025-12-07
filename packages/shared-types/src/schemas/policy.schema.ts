import { z } from 'zod'

// Policy Type Enum
export const PolicyTypeSchema = z.enum([
  'appeal_threshold',
  'write_off_threshold',
  'rebill_threshold',
  'transfer_to_patient',
])

export type PolicyType = z.infer<typeof PolicyTypeSchema>

// Organization Policy Schema
export const OrgPolicySchema = z.object({
  id: z.string().uuid().optional(),
  policy_name: z.string().min(1),
  policy_type: PolicyTypeSchema,
  payer_id: z.string().uuid().optional().nullable(),
  denial_category: z.string().optional().nullable(),
  min_amount: z.number().nonnegative().optional().nullable(),
  max_amount: z.number().nonnegative().optional().nullable(),
  days_to_action: z.number().positive().optional().nullable(),
  auto_appeal: z.boolean().default(false),
  auto_write_off: z.boolean().default(false),
  config: z.record(z.any()).optional(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type OrgPolicy = z.infer<typeof OrgPolicySchema>
