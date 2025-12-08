import { z } from 'zod'

// CPT Code Schema
export const CPTCodeSchema = z.object({
  code: z.string().regex(/^\d{5}$/, 'CPT code must be exactly 5 digits'),
  modifiers: z.array(z.string().max(2)).optional(),
  units: z.number().positive().optional(),
  description: z.string().optional(),
})

export type CPTCode = z.infer<typeof CPTCodeSchema>

// CPT Code Seed Schema (looser validation for seed data)
export const CPTCodeSeedSchema = z.object({
  code: z.string(),
  modifier: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
  units: z.number().positive().optional(),
  description: z.string().optional(),
})

export type CPTCodeSeed = z.infer<typeof CPTCodeSeedSchema>

// Diagnosis Code Schema
export const DiagnosisCodeSchema = z.object({
  code: z
    .string()
    .regex(
      /^[A-Z]\d{2}/,
      'ICD-10 code must start with a letter followed by at least 2 digits'
    ),
  pointer: z.number().positive().optional(),
  description: z.string().optional(),
})

export type DiagnosisCode = z.infer<typeof DiagnosisCodeSchema>

// Claim Status Enum
export const ClaimStatusSchema = z.enum([
  'pending',
  'submitted',
  'paid',
  'denied',
  'appealed',
  'written_off',
  'partially_paid',
])

export type ClaimStatus = z.infer<typeof ClaimStatusSchema>

// Claim Schema
export const ClaimSchema = z.object({
  id: z.string().uuid().optional(),
  claim_id: z.string().min(1),
  patient_id: z.string().min(1),
  payer_id: z.string().uuid().optional().nullable(),
  status: ClaimStatusSchema.default('pending'),
  amount: z.number().positive(),
  paid_amount: z.number().nonnegative().optional().nullable(),
  service_date: z.coerce.date().optional().nullable(),
  submitted_date: z.coerce.date().optional().nullable(),
  cpt_codes: z.array(CPTCodeSchema).optional(),
  diagnosis_codes: z.array(DiagnosisCodeSchema).optional(),
  place_of_service: z.string().max(10).optional().nullable(),
  claim_type: z.string().max(50).optional().nullable(),
  raw_data: z.record(z.string(), z.any()).optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
})

export type Claim = z.infer<typeof ClaimSchema>

// Normalize Claim Input Schema
export const NormalizeClaimInputSchema = z.object({
  claim_data: z.record(z.string(), z.any()),
  format: z.enum(['837', '835', 'json']).default('json'),
})

export type NormalizeClaimInput = z.infer<typeof NormalizeClaimInputSchema>

// Normalized Claim Output Schema
export const NormalizedClaimSchema = ClaimSchema.extend({
  validation_warnings: z.array(z.string()).optional(),
})

export type NormalizedClaim = z.infer<typeof NormalizedClaimSchema>

// Diagnosis Code Seed Schema (looser validation for seed data)
export const DiagnosisCodeSeedSchema = z.object({
  code: z.string(),
  pointer: z.number().positive().optional(),
  description: z.string().optional(),
})

export type DiagnosisCodeSeed = z.infer<typeof DiagnosisCodeSeedSchema>

// Claim Seed Schema (for inserting seed data with string dates)
export const ClaimSeedSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string(),
  patient_id: z.string(),
  payer_id: z.string().uuid().optional(),
  status: ClaimStatusSchema,
  amount: z.number().positive(),
  paid_amount: z.number().nonnegative().nullable().optional(),
  service_date: z.string().optional(), // String for seed data
  submitted_date: z.string().optional(), // String for seed data
  cpt_codes: z.array(CPTCodeSeedSchema).optional(),
  diagnosis_codes: z.array(DiagnosisCodeSeedSchema).optional(),
  place_of_service: z.string().optional(),
  claim_type: z.string().optional(),
  has_payment_variance: z.boolean().optional(),
  variance_count: z.number().optional(),
})

export type ClaimSeed = z.infer<typeof ClaimSeedSchema>
