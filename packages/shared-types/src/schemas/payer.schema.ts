import { z } from 'zod'

// Payer Type Enum
export const PayerTypeSchema = z.enum([
  'commercial',
  'medicare',
  'medicaid',
  'tricare',
  'workers_comp',
  'other',
])

export type PayerType = z.infer<typeof PayerTypeSchema>

// Payer Schema
export const PayerSchema = z.object({
  id: z.string().uuid().optional(),
  payer_id: z.string().min(1),
  name: z.string().min(1),
  type: PayerTypeSchema.optional().nullable(),
  contact_info: z.record(z.any()).optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type Payer = z.infer<typeof PayerSchema>
