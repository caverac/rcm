import { describe, it, expect } from '@jest/globals'
import {
  CPTCodeSchema,
  DiagnosisCodeSchema,
  ClaimSchema,
  NormalizeClaimInputSchema,
  ClaimStatusSchema,
} from './claim.schema.js'

describe('CPTCodeSchema', () => {
  it('should validate a valid CPT code', () => {
    const validCode = {
      code: '99213',
      modifiers: ['25'],
      units: 1,
    }

    const result = CPTCodeSchema.safeParse(validCode)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe('99213')
      expect(result.data.modifiers).toEqual(['25'])
    }
  })

  it('should reject invalid CPT code format', () => {
    const invalidCode = {
      code: '123', // Not 5 digits
    }

    const result = CPTCodeSchema.safeParse(invalidCode)
    expect(result.success).toBe(false)
  })

  it('should accept CPT code without modifiers', () => {
    const codeWithoutModifiers = {
      code: '11055',
    }

    const result = CPTCodeSchema.safeParse(codeWithoutModifiers)
    expect(result.success).toBe(true)
  })
})

describe('DiagnosisCodeSchema', () => {
  it('should validate a valid ICD-10 code', () => {
    const validCode = {
      code: 'Z12.11',
      pointer: 1,
    }

    const result = DiagnosisCodeSchema.safeParse(validCode)
    expect(result.success).toBe(true)
  })

  it('should reject invalid ICD-10 code format', () => {
    const invalidCode = {
      code: '12.11', // Doesn't start with letter
    }

    const result = DiagnosisCodeSchema.safeParse(invalidCode)
    expect(result.success).toBe(false)
  })
})

describe('ClaimStatusSchema', () => {
  it('should validate all claim statuses', () => {
    const validStatuses = [
      'pending',
      'submitted',
      'paid',
      'denied',
      'appealed',
      'written_off',
      'partially_paid',
    ]

    validStatuses.forEach((status) => {
      const result = ClaimStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid status', () => {
    const result = ClaimStatusSchema.safeParse('invalid_status')
    expect(result.success).toBe(false)
  })
})

describe('ClaimSchema', () => {
  it('should validate a complete claim', () => {
    const validClaim = {
      claim_id: 'CLM-123',
      patient_id: 'PAT-001',
      status: 'pending',
      amount: 150.0,
      cpt_codes: [{ code: '99213', modifiers: ['25'] }, { code: '11055' }],
      diagnosis_codes: [{ code: 'L60.0' }],
      service_date: '2024-01-15',
    }

    const result = ClaimSchema.safeParse(validClaim)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.claim_id).toBe('CLM-123')
      expect(result.data.amount).toBe(150)
      expect(result.data.status).toBe('pending')
    }
  })

  it('should reject claim with negative amount', () => {
    const invalidClaim = {
      claim_id: 'CLM-123',
      patient_id: 'PAT-001',
      status: 'pending',
      amount: -100, // Negative amount
    }

    const result = ClaimSchema.safeParse(invalidClaim)
    expect(result.success).toBe(false)
  })

  it('should apply default status', () => {
    const claimWithoutStatus = {
      claim_id: 'CLM-123',
      patient_id: 'PAT-001',
      amount: 150,
    }

    const result = ClaimSchema.safeParse(claimWithoutStatus)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('pending')
    }
  })
})

describe('NormalizeClaimInputSchema', () => {
  it('should validate normalize claim input', () => {
    const validInput = {
      claim_data: {
        patient_id: 'PAT-001',
        amount: 150,
      },
      format: '837',
    }

    const result = NormalizeClaimInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('should apply default format', () => {
    const inputWithoutFormat = {
      claim_data: {
        patient_id: 'PAT-001',
      },
    }

    const result = NormalizeClaimInputSchema.safeParse(inputWithoutFormat)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.format).toBe('json')
    }
  })
})
