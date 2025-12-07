import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Seed common denial codes
  const denialCodes = [
    {
      code: 'CO-197',
      category: 'AUTHORIZATION',
      description: 'Precertification/authorization/notification absent',
      is_appealable: true,
      common_resolution:
        'Obtain retroactive authorization or appeal with medical necessity documentation',
      prevention_tips:
        'Implement pre-service authorization checks for all procedures requiring prior auth',
    },
    {
      code: 'CO-16',
      category: 'MISSING_INFO',
      description:
        'Claim/service lacks information which is needed for adjudication',
      is_appealable: true,
      common_resolution: 'Resubmit claim with complete information',
      prevention_tips: 'Validate all required fields before submission',
    },
    {
      code: 'CO-4',
      category: 'CODING_ERROR',
      description:
        'The procedure code is inconsistent with the modifier used or a required modifier is missing',
      is_appealable: true,
      common_resolution: 'Correct the modifier and resubmit',
      prevention_tips:
        'Implement coding validation rules for modifier requirements',
    },
    {
      code: 'CO-50',
      category: 'NON_COVERED',
      description:
        'These are non-covered services because this is not deemed a medical necessity',
      is_appealable: true,
      common_resolution:
        'Appeal with medical necessity documentation or obtain ABN for patient responsibility',
      prevention_tips:
        'Review medical necessity criteria before service delivery',
    },
    {
      code: 'CO-22',
      category: 'COORDINATION_BENEFITS',
      description:
        'This care may be covered by another payer per coordination of benefits',
      is_appealable: true,
      common_resolution:
        'Bill primary insurance first or provide COB documentation',
      prevention_tips: 'Verify insurance eligibility and COB before service',
    },
    {
      code: 'CO-97',
      category: 'BUNDLING',
      description:
        'The benefit for this service is included in the payment/allowance for another service/procedure',
      is_appealable: true,
      common_resolution:
        'Review bundling rules; appeal if services were truly distinct',
      prevention_tips: 'Check NCCI edits before billing multiple procedures',
    },
    {
      code: 'PR-1',
      category: 'PATIENT_RESPONSIBILITY',
      description: 'Deductible amount',
      is_appealable: false,
      common_resolution: 'Bill patient for deductible amount',
      prevention_tips: 'Collect deductible at time of service when possible',
    },
    {
      code: 'PR-2',
      category: 'PATIENT_RESPONSIBILITY',
      description: 'Coinsurance amount',
      is_appealable: false,
      common_resolution: 'Bill patient for coinsurance',
      prevention_tips:
        'Verify patient cost-sharing requirements before service',
    },
    {
      code: 'CO-29',
      category: 'TIMELY_FILING',
      description: 'The time limit for filing has expired',
      is_appealable: true,
      common_resolution:
        'Appeal with documentation of timely filing or extenuating circumstances',
      prevention_tips:
        'Monitor claim submission timelines and payer-specific filing deadlines',
    },
    {
      code: 'CO-18',
      category: 'DUPLICATE',
      description: 'Exact duplicate claim/service',
      is_appealable: true,
      common_resolution:
        'Review claims history; if not duplicate, appeal with clarification',
      prevention_tips: 'Implement duplicate claim checking before submission',
    },
    {
      code: 'CO-27',
      category: 'ELIGIBILITY',
      description: 'Expenses incurred after coverage terminated',
      is_appealable: true,
      common_resolution:
        'Verify coverage dates; appeal if service was within coverage period',
      prevention_tips: 'Real-time eligibility verification at point of service',
    },
    {
      code: 'CO-96',
      category: 'NON_COVERED',
      description: 'Non-covered charge(s)',
      is_appealable: true,
      common_resolution:
        'Review policy coverage; appeal if service should be covered',
      prevention_tips: 'Verify coverage for all services before delivery',
    },
  ]

  for (const code of denialCodes) {
    const description = code.description.replace(/'/g, "''")
    const resolution = code.common_resolution.replace(/'/g, "''")
    const prevention = code.prevention_tips.replace(/'/g, "''")

    pgm.sql(`
      INSERT INTO denial_code_library (code, category, description, is_appealable, common_resolution, prevention_tips)
      VALUES ('${code.code}', '${code.category}', '${description}', ${code.is_appealable},
              '${resolution}', '${prevention}')
    `)
  }

  // Seed default organization policies
  const policies = [
    {
      policy_name: 'Default Appeal Threshold',
      policy_type: 'appeal_threshold',
      min_amount: 100.0,
      days_to_action: 30,
      auto_appeal: false,
    },
    {
      policy_name: 'Authorization Denials - Auto Appeal',
      policy_type: 'appeal_threshold',
      denial_category: 'AUTHORIZATION',
      min_amount: 250.0,
      days_to_action: 15,
      auto_appeal: true,
    },
    {
      policy_name: 'Small Balance Write-Off',
      policy_type: 'write_off_threshold',
      max_amount: 25.0,
      days_to_action: 90,
      auto_write_off: true,
    },
    {
      policy_name: 'Coding Error - Quick Fix',
      policy_type: 'rebill_threshold',
      denial_category: 'CODING_ERROR',
      min_amount: 50.0,
      days_to_action: 7,
      auto_appeal: false,
    },
    {
      policy_name: 'Patient Responsibility - No Appeal',
      policy_type: 'transfer_to_patient',
      denial_category: 'PATIENT_RESPONSIBILITY',
      min_amount: 0.0,
      days_to_action: 5,
      auto_appeal: false,
    },
  ]

  for (const policy of policies) {
    const payerId = policy['denial_category'] ? 'NULL' : 'NULL'
    const category = policy['denial_category']
      ? `'${policy['denial_category']}'`
      : 'NULL'

    pgm.sql(`
      INSERT INTO org_policies (policy_name, policy_type, payer_id, denial_category, min_amount, max_amount, days_to_action, auto_appeal, auto_write_off)
      VALUES ('${policy.policy_name}', '${policy.policy_type}', ${payerId}, ${category},
              ${policy['min_amount'] ?? 'NULL'}, ${policy['max_amount'] ?? 'NULL'},
              ${policy.days_to_action}, ${policy['auto_appeal'] ?? false}, ${policy['auto_write_off'] ?? false})
    `)
  }

  // Seed common coding rules
  const codingRules = [
    {
      rule_name: 'Modifier 25 Required with E/M and Procedure',
      rule_type: 'modifier_required',
      cpt_pattern: '99[2-4][0-9]{2}', // E/M codes
      required_modifier: '25',
      error_message:
        'Modifier 25 is required when billing E/M service on same day as procedure',
      severity: 'warning',
    },
    {
      rule_name: 'Bilateral Procedure Modifier 50',
      rule_type: 'modifier_required',
      required_modifier: '50',
      error_message:
        'Use modifier 50 for bilateral procedures or bill with RT/LT modifiers',
      severity: 'warning',
    },
    {
      rule_name: 'Screening vs Diagnostic Colonoscopy',
      rule_type: 'diagnosis_support',
      cpt_code: '45378',
      required_diagnosis_pattern: 'Z12',
      error_message:
        'Screening colonoscopy (45378) requires Z12.11 diagnosis code',
      severity: 'error',
    },
    {
      rule_name: 'Modifier 59 for Distinct Procedural Service',
      rule_type: 'modifier_required',
      required_modifier: '59',
      error_message:
        'Modifier 59 may be needed to bypass NCCI edits for distinct services',
      severity: 'info',
    },
    {
      rule_name: 'Invalid Diagnosis Z00.00',
      rule_type: 'diagnosis_validation',
      error_message:
        'Z00.00 is too general and may not support medical necessity for most services',
      severity: 'warning',
    },
  ]

  for (const rule of codingRules) {
    const cptCode = rule.cpt_code ? `'${rule.cpt_code}'` : 'NULL'
    const cptPattern = rule.cpt_pattern ? `'${rule.cpt_pattern}'` : 'NULL'
    const requiredModifier = rule.required_modifier
      ? `'${rule.required_modifier}'`
      : 'NULL'
    const diagnosisPattern = rule.required_diagnosis_pattern
      ? `'${rule.required_diagnosis_pattern}'`
      : 'NULL'
    const errorMessage = rule.error_message.replace(/'/g, "''")

    pgm.sql(`
      INSERT INTO coding_rules (rule_name, rule_type, cpt_code, cpt_pattern, required_modifier, required_diagnosis_pattern, error_message, severity)
      VALUES ('${rule.rule_name}', '${rule.rule_type}', ${cptCode}, ${cptPattern},
              ${requiredModifier}, ${diagnosisPattern}, '${errorMessage}', '${rule.severity}')
    `)
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DELETE FROM coding_rules')
  pgm.sql('DELETE FROM org_policies')
  pgm.sql('DELETE FROM denial_code_library')
}
