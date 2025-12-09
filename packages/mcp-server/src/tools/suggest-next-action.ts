import { query } from '../db.js'
import {
  SuggestNextActionInput,
  NextActionSuggestion,
  OrgPolicy,
} from '../types.js'
import { classifyDenial } from './classify-denial.js'

export async function suggestNextAction(
  input: SuggestNextActionInput
): Promise<NextActionSuggestion> {
  const { denial_code, denial_amount, payer_id } = input

  // Get denial classification
  const classification = await classifyDenial({ denial_code })

  // Find applicable org policies
  const policies = await query<OrgPolicy>(
    `SELECT * FROM org_policies
     WHERE is_active = true
     AND (payer_id IS NULL OR payer_id = $1)
     AND (denial_category IS NULL OR denial_category = $2)
     ORDER BY
       CASE WHEN payer_id IS NOT NULL THEN 1 ELSE 2 END,
       CASE WHEN denial_category IS NOT NULL THEN 1 ELSE 2 END,
       created_at DESC
     LIMIT 5`,
    [payer_id || null, classification.category]
  )

  // Determine recommended action based on policies and denial characteristics
  let recommended_action: NextActionSuggestion['recommended_action'] =
    'investigate'
  let reason = ''
  let priority: NextActionSuggestion['priority'] = 'medium'
  let days_to_action = 30
  let auto_process = false
  let policy_applied: string | undefined
  let estimated_recovery_chance: number | undefined
  const next_steps: string[] = []

  // Check if denial is appealable
  if (!classification.is_appealable) {
    if (classification.category === 'PATIENT_RESPONSIBILITY') {
      recommended_action = 'transfer_to_patient'
      reason =
        'Patient responsibility amounts should be transferred to patient balance'
      priority = 'medium'
      days_to_action = 5
      next_steps.push('Generate patient statement')
      next_steps.push('Update patient account')
      next_steps.push('Send payment reminder if not paid within 30 days')
    } else {
      recommended_action = 'write_off'
      reason = 'Denial is not appealable based on payer policy'
      priority = 'low'
      days_to_action = 90
      next_steps.push('Review for process improvement opportunities')
      next_steps.push('Document write-off reason')
    }
  } else {
    // Apply org policies
    for (const policy of policies) {
      if (policy.policy_type === 'write_off_threshold') {
        if (policy.max_amount && denial_amount <= policy.max_amount) {
          recommended_action = 'write_off'
          reason = `Amount $${denial_amount} is below write-off threshold of $${policy.max_amount}`
          priority = 'low'
          days_to_action = policy.days_to_action || 90
          auto_process = policy.auto_write_off
          policy_applied = policy.policy_name
          next_steps.push('Submit write-off approval if required')
          next_steps.push('Update claim status to written_off')
          break
        }
      } else if (policy.policy_type === 'appeal_threshold') {
        if (policy.min_amount && denial_amount >= policy.min_amount) {
          recommended_action = 'appeal'
          reason = `Amount $${denial_amount} meets appeal threshold of $${policy.min_amount}. ${classification.description}`
          priority =
            classification.category === 'AUTHORIZATION' ? 'high' : 'medium'
          days_to_action = policy.days_to_action || 30
          auto_process = policy.auto_appeal
          policy_applied = policy.policy_name

          // Estimate recovery chance based on denial type
          estimated_recovery_chance = estimateRecoveryChance(
            classification.category
          )

          next_steps.push('Gather supporting documentation')
          next_steps.push(classification.common_resolution)
          next_steps.push('Submit appeal within timely filing limits')
          next_steps.push('Track appeal status')
          break
        }
      } else if (policy.policy_type === 'rebill_threshold') {
        if (classification.category === 'CODING_ERROR') {
          recommended_action = 'rebill'
          reason = 'Coding error can be corrected and resubmitted'
          priority = 'high'
          days_to_action = policy.days_to_action || 7
          auto_process = false
          policy_applied = policy.policy_name

          next_steps.push('Review and correct coding error')
          next_steps.push('Void original claim if required')
          next_steps.push('Resubmit corrected claim')
          next_steps.push('Monitor for acceptance')
          break
        }
      }
    }

    // If no policy matched, use default logic
    if (recommended_action === 'investigate') {
      if (
        classification.category === 'CODING_ERROR' ||
        classification.category === 'MISSING_INFO'
      ) {
        recommended_action = 'rebill'
        reason = 'Issue can be corrected and claim resubmitted'
        priority = 'high'
        days_to_action = 7
        estimated_recovery_chance = 85
        next_steps.push(classification.common_resolution)
        next_steps.push('Resubmit corrected claim')
      } else if (denial_amount >= 100) {
        recommended_action = 'appeal'
        reason = 'Amount warrants appeal effort. ' + classification.description
        priority =
          classification.category === 'AUTHORIZATION' ? 'high' : 'medium'
        days_to_action = 30
        estimated_recovery_chance = estimateRecoveryChance(
          classification.category
        )
        next_steps.push('Gather supporting documentation')
        next_steps.push(classification.common_resolution)
        next_steps.push('Submit appeal')
      } else {
        recommended_action = 'write_off'
        reason = 'Amount below typical appeal threshold'
        priority = 'low'
        days_to_action = 90
        next_steps.push('Consider write-off')
      }
    }
  }

  return {
    recommended_action,
    reason,
    priority,
    days_to_action,
    auto_process,
    policy_applied,
    estimated_recovery_chance,
    next_steps,
  }
}

function estimateRecoveryChance(category: string): number {
  // Estimated recovery percentages based on denial category
  const recoveryRates: Record<string, number> = {
    CODING_ERROR: 85,
    MISSING_INFO: 80,
    AUTHORIZATION: 60,
    BUNDLING: 40,
    TIMELY_FILING: 25,
    NON_COVERED: 20,
    DUPLICATE: 75,
    ELIGIBILITY: 30,
    COORDINATION_BENEFITS: 50,
  }

  return recoveryRates[category] || 50
}
