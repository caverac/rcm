import { query } from '../db.js'
import {
  NormalizeClaimInput,
  NormalizedClaim,
  CPTCode,
  DiagnosisCode,
} from '../types.js'

export async function normalizeClaim(
  input: NormalizeClaimInput
): Promise<NormalizedClaim> {
  const { claim_data, format = 'json' } = input
  const validation_warnings: string[] = []

  // Extract and normalize based on format
  let normalized: Partial<NormalizedClaim>

  if (format === '837' || format === '835') {
    // Parse EDI format (simplified - in production use proper EDI parser)
    normalized = parseEDIFormat(claim_data, validation_warnings)
  } else {
    // JSON format
    normalized = parseJSONFormat(claim_data, validation_warnings)
  }

  // Generate claim ID if not present
  if (!normalized.claim_id) {
    normalized.claim_id = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Validate required fields
  if (!normalized.patient_id) {
    validation_warnings.push('Missing required field: patient_id')
  }
  if (!normalized.amount || normalized.amount <= 0) {
    validation_warnings.push('Invalid or missing claim amount')
  }

  // Validate CPT codes
  if (normalized.cpt_codes) {
    for (const cpt of normalized.cpt_codes) {
      if (!cpt.code || !cpt.code.match(/^\d{5}$/)) {
        validation_warnings.push(`Invalid CPT code format: ${cpt.code}`)
      }
    }
  }

  // Validate diagnosis codes
  if (normalized.diagnosis_codes) {
    for (const dx of normalized.diagnosis_codes) {
      if (!dx.code || !dx.code.match(/^[A-Z]\d{2}/)) {
        validation_warnings.push(`Invalid ICD-10 code format: ${dx.code}`)
      }
    }
  }

  // Set defaults
  const claim: NormalizedClaim = {
    id: normalized.id || '',
    claim_id: normalized.claim_id,
    patient_id: normalized.patient_id || '',
    payer_id: normalized.payer_id,
    status: normalized.status || 'pending',
    amount: normalized.amount || 0,
    paid_amount: normalized.paid_amount,
    service_date: normalized.service_date,
    submitted_date: normalized.submitted_date,
    cpt_codes: normalized.cpt_codes,
    diagnosis_codes: normalized.diagnosis_codes,
    place_of_service: normalized.place_of_service,
    claim_type: normalized.claim_type,
    raw_data: claim_data,
    created_at: new Date(),
    updated_at: new Date(),
    validation_warnings:
      validation_warnings.length > 0 ? validation_warnings : undefined,
  }

  // Insert into database if valid
  if (
    validation_warnings.length === 0 ||
    !validation_warnings.some((w) => w.includes('required'))
  ) {
    try {
      const result = await query<NormalizedClaim>(
        `INSERT INTO claims (
          claim_id, patient_id, payer_id, status, amount, paid_amount,
          service_date, submitted_date, cpt_codes, diagnosis_codes,
          place_of_service, claim_type, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, created_at, updated_at`,
        [
          claim.claim_id,
          claim.patient_id,
          claim.payer_id || null,
          claim.status,
          claim.amount,
          claim.paid_amount || null,
          claim.service_date || null,
          claim.submitted_date || null,
          JSON.stringify(claim.cpt_codes || []),
          JSON.stringify(claim.diagnosis_codes || []),
          claim.place_of_service || null,
          claim.claim_type || null,
          JSON.stringify(claim.raw_data),
        ]
      )

      if (result.length > 0) {
        claim.id = result[0].id
        claim.created_at = result[0].created_at
        claim.updated_at = result[0].updated_at
      }
    } catch (error) {
      console.error('Error inserting claim:', error)
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      validation_warnings.push(`Database error: ${errorMessage}`)
      claim.validation_warnings = validation_warnings
    }
  }

  return claim
}

function parseEDIFormat(
  data: Record<string, unknown>,
  warnings: string[]
): Partial<NormalizedClaim> {
  // Simplified EDI parsing - in production use proper EDI parser library
  warnings.push(
    'EDI format parsing is simplified. Use proper EDI parser for production.'
  )

  return {
    claim_id: data.claimId || data.claim_id,
    patient_id: data.patientId || data.patient_id,
    payer_id: data.payerId || data.payer_id,
    amount: parseFloat(data.amount || data.claimAmount || '0'),
    service_date: data.serviceDate ? new Date(data.serviceDate) : undefined,
    cpt_codes: data.procedureCodes || data.cpt_codes,
    diagnosis_codes: data.diagnosisCodes || data.diagnosis_codes,
    place_of_service: data.placeOfService || data.place_of_service,
  }
}

function parseJSONFormat(
  data: Record<string, unknown>,
  _warnings: string[]
): Partial<NormalizedClaim> {
  // Parse CPT codes
  let cpt_codes: CPTCode[] | undefined
  if (data.cpt_codes || data.procedureCodes) {
    const codes = data.cpt_codes || data.procedureCodes
    if (Array.isArray(codes)) {
      cpt_codes = codes.map((c) => {
        if (typeof c === 'string') {
          return { code: c }
        }
        return {
          code: c.code,
          modifiers: c.modifiers,
          units: c.units,
        }
      })
    }
  }

  // Parse diagnosis codes
  let diagnosis_codes: DiagnosisCode[] | undefined
  if (data.diagnosis_codes || data.diagnosisCodes) {
    const codes = data.diagnosis_codes || data.diagnosisCodes
    if (Array.isArray(codes)) {
      diagnosis_codes = codes.map((c) => {
        if (typeof c === 'string') {
          return { code: c }
        }
        return {
          code: c.code,
          pointer: c.pointer,
        }
      })
    }
  }

  return {
    claim_id: data.claim_id || data.claimId,
    patient_id: data.patient_id || data.patientId,
    payer_id: data.payer_id || data.payerId,
    status: data.status,
    amount: parseFloat(data.amount || '0'),
    paid_amount: data.paid_amount ? parseFloat(data.paid_amount) : undefined,
    service_date: data.service_date ? new Date(data.service_date) : undefined,
    submitted_date: data.submitted_date
      ? new Date(data.submitted_date)
      : undefined,
    cpt_codes,
    diagnosis_codes,
    place_of_service: data.place_of_service || data.placeOfService,
    claim_type: data.claim_type || data.claimType,
  }
}
