import { query } from '../db.js'
import { AuditCodingInput, CodingAuditResult, CodingRule } from '../types.js'

export async function auditCoding(
  input: AuditCodingInput
): Promise<CodingAuditResult> {
  const { claim_data, include_warnings = true } = input
  const { cpt_codes, diagnosis_codes, payer_id, place_of_service } = claim_data

  const errors: CodingAuditResult['errors'] = []

  // Get applicable coding rules
  const rules = await query<CodingRule>(
    `SELECT * FROM coding_rules
     WHERE is_active = true
     AND (payer_specific IS NULL OR payer_specific = $1)
     ORDER BY severity DESC`,
    [payer_id || null]
  )

  // Check each rule
  for (const rule of rules) {
    // Skip info-level rules if warnings are not included
    if (!include_warnings && rule.severity === 'info') {
      continue
    }

    if (rule.rule_type === 'modifier_required') {
      checkModifierRequired(rule, cpt_codes, errors)
    } else if (rule.rule_type === 'diagnosis_support') {
      checkDiagnosisSupport(rule, cpt_codes, diagnosis_codes, errors)
    } else if (rule.rule_type === 'diagnosis_validation') {
      checkDiagnosisValidation(rule, diagnosis_codes, errors)
    } else if (rule.rule_type === 'bundling') {
      checkBundling(rule, cpt_codes, errors)
    } else if (rule.rule_type === 'incompatible_codes') {
      checkIncompatibleCodes(rule, cpt_codes, errors)
    }
  }

  // Additional built-in validations
  performBuiltInValidations(
    cpt_codes,
    diagnosis_codes,
    errors,
    include_warnings
  )

  // Calculate summary
  const summary = {
    total_issues: errors.length,
    errors: errors.filter((e) => e.severity === 'error').length,
    warnings: errors.filter((e) => e.severity === 'warning').length,
    info: errors.filter((e) => e.severity === 'info').length,
  }

  // Determine risk level
  let risk_level: CodingAuditResult['risk_level'] = 'low'
  if (summary.errors > 0) {
    risk_level = 'high'
  } else if (summary.warnings >= 3) {
    risk_level = 'medium'
  } else if (summary.warnings > 0) {
    risk_level = 'medium'
  }

  return {
    passed: summary.errors === 0,
    errors,
    summary,
    risk_level,
  }
}

function checkModifierRequired(
  rule: CodingRule,
  cpt_codes: any[],
  errors: any[]
): void {
  for (const cpt of cpt_codes) {
    const cptCode = typeof cpt === 'string' ? cpt : cpt.code
    const modifiers = typeof cpt === 'object' ? cpt.modifiers || [] : []

    // Check if this CPT matches the rule
    let matches = false
    if (rule.cpt_code && cptCode === rule.cpt_code) {
      matches = true
    } else if (rule.cpt_pattern && new RegExp(rule.cpt_pattern).test(cptCode)) {
      matches = true
    }

    if (matches) {
      // Check if required modifier is present
      if (
        rule.required_modifier &&
        !modifiers.includes(rule.required_modifier)
      ) {
        errors.push({
          rule_name: rule.rule_name,
          severity: rule.severity,
          message: rule.error_message,
          cpt_code: cptCode,
          suggestion: `Add modifier ${rule.required_modifier}`,
        })
      }
    }
  }
}

function checkDiagnosisSupport(
  rule: CodingRule,
  cpt_codes: any[],
  diagnosis_codes: any[],
  errors: any[]
): void {
  for (const cpt of cpt_codes) {
    const cptCode = typeof cpt === 'string' ? cpt : cpt.code

    // Check if this CPT matches the rule
    let matches = false
    if (rule.cpt_code && cptCode === rule.cpt_code) {
      matches = true
    } else if (rule.cpt_pattern && new RegExp(rule.cpt_pattern).test(cptCode)) {
      matches = true
    }

    if (matches && rule.required_diagnosis_pattern) {
      // Check if any diagnosis code matches the required pattern
      const pattern = new RegExp(rule.required_diagnosis_pattern)
      const hasMatchingDx = diagnosis_codes.some((dx) => {
        const dxCode = typeof dx === 'string' ? dx : dx.code
        return pattern.test(dxCode)
      })

      if (!hasMatchingDx) {
        errors.push({
          rule_name: rule.rule_name,
          severity: rule.severity,
          message: rule.error_message,
          cpt_code: cptCode,
          suggestion: `Add diagnosis code matching pattern: ${rule.required_diagnosis_pattern}`,
        })
      }
    }
  }
}

function checkDiagnosisValidation(
  rule: CodingRule,
  diagnosis_codes: any[],
  errors: any[]
): void {
  // Check for overly general or invalid diagnosis codes
  for (const dx of diagnosis_codes) {
    const dxCode = typeof dx === 'string' ? dx : dx.code

    // Check for Z00.00 (too general)
    if (dxCode === 'Z00.00' || dxCode.endsWith('.00')) {
      errors.push({
        rule_name: rule.rule_name,
        severity: rule.severity,
        message: rule.error_message,
        suggestion: 'Use more specific diagnosis code',
      })
    }
  }
}

function checkBundling(
  rule: CodingRule,
  cpt_codes: any[],
  errors: any[]
): void {
  // Check for codes that shouldn't be billed together
  if (rule.incompatible_codes && cpt_codes.length > 1) {
    const codes = cpt_codes.map((c) => (typeof c === 'string' ? c : c.code))

    for (const incompatible of rule.incompatible_codes) {
      if (codes.includes(incompatible)) {
        errors.push({
          rule_name: rule.rule_name,
          severity: rule.severity,
          message: rule.error_message,
          suggestion:
            'Review bundling edits or use modifier 59 if services were distinct',
        })
      }
    }
  }
}

function checkIncompatibleCodes(
  rule: CodingRule,
  cpt_codes: any[],
  errors: any[]
): void {
  if (rule.incompatible_codes && cpt_codes.length > 1) {
    const codes = cpt_codes.map((c) => (typeof c === 'string' ? c : c.code))

    for (const incompatible of rule.incompatible_codes) {
      const incompatibleList = Array.isArray(incompatible)
        ? incompatible
        : [incompatible]

      const foundCodes = codes.filter((c) => incompatibleList.includes(c))
      if (foundCodes.length > 1) {
        errors.push({
          rule_name: rule.rule_name,
          severity: rule.severity,
          message: `${rule.error_message}: ${foundCodes.join(', ')}`,
          suggestion:
            'Remove one of the incompatible codes or use appropriate modifier',
        })
      }
    }
  }
}

function performBuiltInValidations(
  cpt_codes: any[],
  diagnosis_codes: any[],
  errors: any[],
  include_warnings: boolean
): void {
  // Validate CPT code format
  for (const cpt of cpt_codes) {
    const cptCode = typeof cpt === 'string' ? cpt : cpt.code
    if (!cptCode || !/^\d{5}$/.test(cptCode)) {
      errors.push({
        rule_name: 'CPT Format Validation',
        severity: 'error',
        message: `Invalid CPT code format: ${cptCode}`,
        cpt_code: cptCode,
        suggestion: 'CPT codes must be exactly 5 digits',
      })
    }
  }

  // Validate diagnosis code format
  for (const dx of diagnosis_codes) {
    const dxCode = typeof dx === 'string' ? dx : dx.code
    if (!dxCode || !/^[A-Z]\d{2}/.test(dxCode)) {
      errors.push({
        rule_name: 'ICD-10 Format Validation',
        severity: 'error',
        message: `Invalid ICD-10 code format: ${dxCode}`,
        suggestion:
          'ICD-10 codes must start with a letter followed by at least 2 digits',
      })
    }
  }

  // Check for E/M code with procedure on same day (modifier 25 warning)
  if (include_warnings && cpt_codes.length > 1) {
    const hasProcedure = cpt_codes.some((c) => {
      const code = typeof c === 'string' ? c : c.code
      return /^(1|2|3|4|5|6|7|8|9)/.test(code) // Surgical codes typically start with 1-9
    })

    const hasEM = cpt_codes.some((c) => {
      const code = typeof c === 'string' ? c : c.code
      return /^99[2-4]/.test(code) // E/M codes
    })

    if (hasProcedure && hasEM) {
      const emCodes = cpt_codes.filter((c) => {
        const code = typeof c === 'string' ? c : c.code
        return /^99[2-4]/.test(code)
      })

      for (const em of emCodes) {
        const modifiers = typeof em === 'object' ? em.modifiers || [] : []
        if (!modifiers.includes('25')) {
          errors.push({
            rule_name: 'E/M with Procedure Same Day',
            severity: 'warning',
            message:
              'E/M code billed on same day as procedure typically requires modifier 25',
            cpt_code: typeof em === 'string' ? em : em.code,
            suggestion:
              'Add modifier 25 to E/M code if separately identifiable service',
          })
        }
      }
    }
  }

  // Check for missing diagnosis codes
  if (diagnosis_codes.length === 0) {
    errors.push({
      rule_name: 'Diagnosis Required',
      severity: 'error',
      message: 'At least one diagnosis code is required',
      suggestion: 'Add appropriate ICD-10 diagnosis code(s)',
    })
  }
}
