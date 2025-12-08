// Re-export types from shared-types package
export type {
  // Entity types
  Payer,
  Claim,
  Denial,
  DenialCodeLibrary,
  OrgPolicy,
  Appeal,
  WriteOff,
  Rebill,
  PaymentVariance,
  // Input types
  NormalizeClaimInput,
  ClassifyDenialInput,
  SuggestNextActionInput,
  BatchClassifyDenialsInput,
  CreateAppealInput,
  UpdateAppealInput,
  ListAppealsInput,
  CreateWriteOffInput,
  ListWriteOffsInput,
  CreateRebillInput,
  UpdateRebillInput,
  ListRebillsInput,
  CreatePaymentVarianceInput,
  UpdatePaymentVarianceInput,
  ListPaymentVariancesInput,
  // Output types
  NormalizedClaim,
  DenialClassification,
  NextActionSuggestion,
  DenialAnalytics,
  AppealAnalytics,
  WriteOffAnalytics,
  RebillAnalytics,
  PaymentVarianceAnalytics,
  // Supporting types
  CPTCode,
  DiagnosisCode,
} from '@rcm/shared-types'

// Import CPTCode and DiagnosisCode for use in local types
import type { CPTCode, DiagnosisCode } from '@rcm/shared-types'

// Local types specific to mcp-server

// CodingRule is not in shared-types yet - keep local definition
export interface CodingRule {
  id: string
  rule_name: string
  rule_type: string
  cpt_code?: string
  cpt_pattern?: string
  required_modifier?: string
  incompatible_codes?: string[]
  required_diagnosis_pattern?: string
  payer_specific?: string
  error_message: string
  severity: 'error' | 'warning' | 'info'
  is_active: boolean
  created_at: Date
}

// AuditCodingInput is specific to mcp-server (uses local CPTCode reference)
export interface AuditCodingInput {
  claim_data: {
    cpt_codes: CPTCode[]
    diagnosis_codes: DiagnosisCode[]
    payer_id?: string
    place_of_service?: string
  }
  include_warnings?: boolean
}

// CodingAuditResult is specific to mcp-server
export interface CodingAuditResult {
  passed: boolean
  errors: Array<{
    rule_name: string
    severity: 'error' | 'warning' | 'info'
    message: string
    cpt_code?: string
    suggestion?: string
  }>
  summary: {
    total_issues: number
    errors: number
    warnings: number
    info: number
  }
  risk_level: 'high' | 'medium' | 'low'
}
