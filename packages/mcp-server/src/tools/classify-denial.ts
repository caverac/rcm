import { query } from '../db.js'
import {
  ClassifyDenialInput,
  DenialClassification,
  DenialCodeLibrary,
} from '../types.js'

export async function classifyDenial(
  input: ClassifyDenialInput
): Promise<DenialClassification> {
  const { denial_code, denial_text } = input

  // Look up denial code in library
  const results = await query<DenialCodeLibrary>(
    `SELECT code, category, description, is_appealable, common_resolution, prevention_tips
     FROM denial_code_library
     WHERE code = $1`,
    [denial_code]
  )

  if (results.length > 0) {
    const denialInfo = results[0]
    return {
      code: denialInfo.code,
      category: denialInfo.category,
      description: denialInfo.description,
      is_appealable: denialInfo.is_appealable,
      common_resolution: denialInfo.common_resolution || '',
      prevention_tips: denialInfo.prevention_tips || '',
    }
  }

  // If not found in library, attempt to classify based on code pattern
  const classification = classifyByPattern(denial_code, denial_text)

  return classification
}

function classifyByPattern(code: string, text?: string): DenialClassification {
  // Parse code format (e.g., CO-197, PR-1)
  const [prefix, number] = code.split('-')

  let category = 'UNKNOWN'
  let description = text || 'Unknown denial reason'
  let is_appealable = true
  let common_resolution = 'Review denial details and consult payer guidelines'
  let prevention_tips =
    'Ensure all claim requirements are met before submission'

  // Classify based on prefix
  if (prefix === 'CO') {
    // Contractual Obligation - Payer responsibility
    if (number === '197') {
      category = 'AUTHORIZATION'
      description = 'Precertification/authorization/notification absent'
      common_resolution =
        'Obtain retroactive authorization or appeal with medical necessity'
      prevention_tips = 'Implement pre-service authorization checks'
    } else if (number === '16') {
      category = 'MISSING_INFO'
      description = 'Claim lacks information needed for adjudication'
      common_resolution = 'Resubmit with complete information'
    } else if (number === '4') {
      category = 'CODING_ERROR'
      description =
        'Procedure code inconsistent with modifier or modifier missing'
      common_resolution = 'Correct modifier and resubmit'
    } else if (number === '50') {
      category = 'NON_COVERED'
      description = 'Not deemed medically necessary'
      common_resolution = 'Appeal with medical necessity documentation'
    } else if (number === '22') {
      category = 'COORDINATION_BENEFITS'
      description = 'May be covered by another payer (COB)'
      common_resolution = 'Bill primary insurance or provide COB documentation'
    } else if (number === '97') {
      category = 'BUNDLING'
      description = 'Service included in payment for another procedure'
      common_resolution =
        'Review bundling rules or appeal if services were distinct'
    } else if (number === '29') {
      category = 'TIMELY_FILING'
      description = 'Time limit for filing has expired'
      common_resolution = 'Appeal with timely filing documentation'
    } else if (number === '18') {
      category = 'DUPLICATE'
      description = 'Exact duplicate claim/service'
      common_resolution = 'Review claims history or appeal with clarification'
    } else if (number === '27') {
      category = 'ELIGIBILITY'
      description = 'Coverage terminated before service date'
      common_resolution =
        'Verify coverage dates and appeal if service was covered'
    } else if (number === '96') {
      category = 'NON_COVERED'
      description = 'Non-covered charge(s)'
      common_resolution = 'Review policy coverage and appeal if appropriate'
    } else {
      category = 'CONTRACTUAL_ADJUSTMENT'
      description = 'Payer contractual obligation adjustment'
    }
  } else if (prefix === 'PR') {
    // Patient Responsibility
    category = 'PATIENT_RESPONSIBILITY'
    is_appealable = false

    if (number === '1') {
      description = 'Deductible amount'
      common_resolution = 'Bill patient for deductible'
      prevention_tips = 'Collect deductible at time of service'
    } else if (number === '2') {
      description = 'Coinsurance amount'
      common_resolution = 'Bill patient for coinsurance'
      prevention_tips = 'Verify patient cost-sharing before service'
    } else if (number === '3') {
      description = 'Co-payment amount'
      common_resolution = 'Bill patient for copay'
      prevention_tips = 'Collect copay at time of service'
    } else {
      description = 'Patient responsibility amount'
      common_resolution = 'Transfer to patient balance'
    }
  } else if (prefix === 'OA') {
    // Other Adjustment
    category = 'OTHER_ADJUSTMENT'
    description = 'Other adjustment'
    is_appealable = true
  } else if (prefix === 'PI') {
    // Payer Initiated Reduction
    category = 'PAYER_INITIATED'
    description = 'Payer-initiated reduction'
    is_appealable = true
  }

  return {
    code,
    category,
    description,
    is_appealable,
    common_resolution,
    prevention_tips,
  }
}
