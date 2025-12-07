import { describe, it, expect } from '@jest/globals'
import {
  AppealSchema,
  CreateAppealInputSchema,
  AppealStatusSchema,
  AppealPrioritySchema,
} from './appeal.schema.js'

describe('AppealStatusSchema', () => {
  it('should validate all appeal statuses', () => {
    const validStatuses = [
      'pending',
      'in_progress',
      'submitted',
      'under_review',
      'approved',
      'denied',
      'partially_approved',
      'withdrawn',
    ]

    validStatuses.forEach((status) => {
      const result = AppealStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })
})

describe('AppealPrioritySchema', () => {
  it('should validate all priorities', () => {
    ;['high', 'medium', 'low'].forEach((priority) => {
      const result = AppealPrioritySchema.safeParse(priority)
      expect(result.success).toBe(true)
    })
  })
})

describe('AppealSchema', () => {
  it('should validate a complete appeal', () => {
    const validAppeal = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_type: 'first_level',
      status: 'pending',
      priority: 'high',
      appeal_amount: 450.0,
      appeal_reason: 'Authorization was obtained prior to service',
      supporting_documents: ['doc1.pdf', 'doc2.pdf'],
    }

    const result = AppealSchema.safeParse(validAppeal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.appeal_amount).toBe(450)
      expect(result.data.priority).toBe('high')
    }
  })

  it('should apply default values', () => {
    const minimalAppeal = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 450,
    }

    const result = AppealSchema.safeParse(minimalAppeal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.appeal_type).toBe('first_level')
      expect(result.data.status).toBe('pending')
      expect(result.data.priority).toBe('medium')
    }
  })

  it('should reject invalid UUID', () => {
    const invalidAppeal = {
      denial_id: 'invalid-uuid',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 450,
    }

    const result = AppealSchema.safeParse(invalidAppeal)
    expect(result.success).toBe(false)
  })

  it('should reject negative appeal amount', () => {
    const invalidAppeal = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: -100,
    }

    const result = AppealSchema.safeParse(invalidAppeal)
    expect(result.success).toBe(false)
  })
})

describe('CreateAppealInputSchema', () => {
  it('should validate create appeal input', () => {
    const validInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 450,
      appeal_reason: 'Authorization was obtained prior to service date',
      priority: 'high',
    }

    const result = CreateAppealInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('should reject short appeal reason', () => {
    const invalidInput = {
      denial_id: '123e4567-e89b-12d3-a456-426614174000',
      claim_id: '123e4567-e89b-12d3-a456-426614174001',
      appeal_amount: 450,
      appeal_reason: 'Too short', // Less than 10 characters
    }

    const result = CreateAppealInputSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
  })
})
