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
  contact_info: z.record(z.string(), z.any()).optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type Payer = z.infer<typeof PayerSchema>

// Payer Seed Schema (for inserting seed data)
export const PayerSeedSchema = z.object({
  id: z.string().uuid(),
  payer_id: z.string(),
  name: z.string(),
  type: PayerTypeSchema.optional(),
  contact_info: z
    .object({
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
})

export type PayerSeed = z.infer<typeof PayerSeedSchema>
