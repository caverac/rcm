// Database types
export interface Payer {
  id: string
  payer_id: string
  name: string
  type?: string
  contact_info?: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface CPTCode {
  code: string
  modifiers?: string[]
  units?: number
}

export interface DiagnosisCode {
  code: string
  pointer?: number
}

export interface Claim {
  id: string
  claim_id: string
  patient_id: string
  payer_id?: string
  status:
    | 'pending'
    | 'submitted'
    | 'paid'
    | 'denied'
    | 'appealed'
    | 'written_off'
  amount: number
  paid_amount?: number
  service_date?: Date
  submitted_date?: Date
  cpt_codes?: CPTCode[]
  diagnosis_codes?: DiagnosisCode[]
  place_of_service?: string
  claim_type?: string
  raw_data?: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface Denial {
  id: string
  claim_id: string
  denial_code: string
  denial_category?: string
  denial_reason?: string
  denial_amount: number
  denial_date: Date
  is_preventable?: boolean
  root_cause?: string
  action_taken?: string
  action_date?: Date
  resolution_status?: string
  recovered_amount?: number
  raw_data?: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface DenialCodeLibrary {
  id: string
  code: string
  category: string
  description: string
  is_appealable: boolean
  common_resolution?: string
  prevention_tips?: string
  created_at: Date
}

export interface OrgPolicy {
  id: string
  policy_name: string
  policy_type: string
  payer_id?: string
  denial_category?: string
  min_amount?: number
  max_amount?: number
  days_to_action?: number
  auto_appeal: boolean
  auto_write_off: boolean
  config?: Record<string, any>
  is_active: boolean
  created_at: Date
  updated_at: Date
}

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

export interface Appeal {
  id: string
  denial_id: string
  claim_id: string
  appeal_type:
    | 'first_level'
    | 'second_level'
    | 'third_level'
    | 'external_review'
  status:
    | 'pending'
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'denied'
    | 'partially_approved'
    | 'withdrawn'
  priority: 'high' | 'medium' | 'low'
  appeal_amount: number
  filed_date?: Date
  due_date?: Date
  decision_date?: Date
  approved_amount?: number
  appeal_reason?: string
  supporting_documents?: string[]
  notes?: string
  assigned_to?: string
  payer_response?: string
  created_at: Date
  updated_at: Date
}

export interface WriteOff {
  id: string
  denial_id: string
  claim_id: string
  write_off_amount: number
  write_off_reason:
    | 'below_threshold'
    | 'timely_filing_expired'
    | 'non_covered_service'
    | 'patient_responsibility'
    | 'contract_adjustment'
    | 'uncollectible'
    | 'other'
  reason_notes?: string
  approved_by?: string
  approval_date?: Date
  category?: string
  is_preventable: boolean
  created_at: Date
  updated_at: Date
}

export interface Rebill {
  id: string
  original_claim_id: string
  new_claim_id?: string
  denial_id: string
  rebill_reason:
    | 'corrected_coding'
    | 'added_modifier'
    | 'updated_diagnosis'
    | 'corrected_info'
    | 'resubmit_timely'
    | 'provider_change'
    | 'other'
  changes_made?: Record<string, any>
  reason_notes?: string
  rebill_amount: number
  status:
    | 'pending'
    | 'submitted'
    | 'accepted'
    | 'paid'
    | 'denied_again'
    | 'partially_paid'
  submitted_date?: Date
  resolution_date?: Date
  recovered_amount?: number
  created_by?: string
  created_at: Date
  updated_at: Date
}

export interface PaymentVariance {
  id: string
  claim_id: string
  payer_id: string
  expected_amount: number
  actual_amount: number
  variance_amount: number
  variance_percentage: number
  variance_type: 'underpayment' | 'overpayment' | 'expected'
  variance_reason?:
    | 'contract_adjustment'
    | 'bundling'
    | 'non_covered_service'
    | 'missing_authorization'
    | 'credentialing_issue'
    | 'coordination_of_benefits'
    | 'incorrect_coding'
    | 'timely_filing'
    | 'duplicate_claim'
    | 'other'
  payment_date: Date
  reason_notes?: string
  requires_appeal: boolean
  appeal_id?: string
  resolved: boolean
  resolution_date?: Date
  resolution_notes?: string
  created_by?: string
  created_at: Date
  updated_at: Date
}

// Tool input types
export interface NormalizeClaimInput {
  claim_data: Record<string, any>
  format?: '837' | '835' | 'json'
}

export interface ClassifyDenialInput {
  denial_code: string
  denial_text?: string
  claim_data?: Record<string, any>
}

export interface SuggestNextActionInput {
  claim_id: string
  denial_code: string
  denial_amount: number
  payer_id?: string
}

export interface BatchClassifyDenialsInput {
  denials: Array<{
    claim_id?: string
    denial_code: string
    denial_amount: number
    payer_id?: string
  }>
  group_by?: 'category' | 'payer' | 'code'
}

export interface AuditCodingInput {
  claim_data: {
    cpt_codes: CPTCode[]
    diagnosis_codes: DiagnosisCode[]
    payer_id?: string
    place_of_service?: string
  }
  include_warnings?: boolean
}

export interface CreateAppealInput {
  denial_id: string
  claim_id: string
  appeal_type?:
    | 'first_level'
    | 'second_level'
    | 'third_level'
    | 'external_review'
  priority?: 'high' | 'medium' | 'low'
  appeal_amount: number
  due_date?: string
  appeal_reason: string
  supporting_documents?: string[]
  assigned_to?: string
}

export interface UpdateAppealInput {
  appeal_id: string
  status?:
    | 'pending'
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'denied'
    | 'partially_approved'
    | 'withdrawn'
  filed_date?: string
  decision_date?: string
  approved_amount?: number
  payer_response?: string
  notes?: string
}

export interface ListAppealsInput {
  status?:
    | 'pending'
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'denied'
    | 'partially_approved'
    | 'withdrawn'
  priority?: 'high' | 'medium' | 'low'
  claim_id?: string
  assigned_to?: string
  overdue_only?: boolean
  limit?: number
  offset?: number
}

export interface CreateWriteOffInput {
  denial_id: string
  claim_id: string
  write_off_amount: number
  write_off_reason:
    | 'below_threshold'
    | 'timely_filing_expired'
    | 'non_covered_service'
    | 'patient_responsibility'
    | 'contract_adjustment'
    | 'uncollectible'
    | 'other'
  reason_notes?: string
  approved_by?: string
  category?: string
  is_preventable?: boolean
}

export interface ListWriteOffsInput {
  write_off_reason?: string
  category?: string
  is_preventable?: boolean
  claim_id?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export interface CreateRebillInput {
  original_claim_id: string
  denial_id: string
  rebill_reason:
    | 'corrected_coding'
    | 'added_modifier'
    | 'updated_diagnosis'
    | 'corrected_info'
    | 'resubmit_timely'
    | 'provider_change'
    | 'other'
  changes_made?: Record<string, any>
  reason_notes?: string
  rebill_amount: number
  new_claim_id?: string
  created_by?: string
}

export interface UpdateRebillInput {
  rebill_id: string
  status?:
    | 'pending'
    | 'submitted'
    | 'accepted'
    | 'paid'
    | 'denied_again'
    | 'partially_paid'
  submitted_date?: string
  resolution_date?: string
  recovered_amount?: number
  new_claim_id?: string
}

export interface ListRebillsInput {
  status?: string
  rebill_reason?: string
  original_claim_id?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export interface CreatePaymentVarianceInput {
  claim_id: string
  payer_id: string
  expected_amount: number
  actual_amount: number
  variance_reason?:
    | 'contract_adjustment'
    | 'bundling'
    | 'non_covered_service'
    | 'missing_authorization'
    | 'credentialing_issue'
    | 'coordination_of_benefits'
    | 'incorrect_coding'
    | 'timely_filing'
    | 'duplicate_claim'
    | 'other'
  payment_date: string
  reason_notes?: string
  requires_appeal?: boolean
  created_by?: string
}

export interface UpdatePaymentVarianceInput {
  variance_id: string
  variance_reason?:
    | 'contract_adjustment'
    | 'bundling'
    | 'non_covered_service'
    | 'missing_authorization'
    | 'credentialing_issue'
    | 'coordination_of_benefits'
    | 'incorrect_coding'
    | 'timely_filing'
    | 'duplicate_claim'
    | 'other'
  resolved?: boolean
  resolution_date?: string
  resolution_notes?: string
  appeal_id?: string
  requires_appeal?: boolean
}

export interface ListPaymentVariancesInput {
  variance_type?: 'underpayment' | 'overpayment' | 'expected'
  variance_reason?: string
  payer_id?: string
  claim_id?: string
  resolved?: boolean
  requires_appeal?: boolean
  min_variance_percentage?: number
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

// Tool output types
export interface NormalizedClaim extends Claim {
  validation_warnings?: string[]
}

export interface DenialClassification {
  code: string
  category: string
  description: string
  is_appealable: boolean
  common_resolution: string
  prevention_tips: string
}

export interface NextActionSuggestion {
  recommended_action:
    | 'appeal'
    | 'write_off'
    | 'rebill'
    | 'transfer_to_patient'
    | 'investigate'
  reason: string
  priority: 'high' | 'medium' | 'low'
  days_to_action: number
  auto_process: boolean
  policy_applied?: string
  estimated_recovery_chance?: number
  next_steps: string[]
}

export interface DenialAnalytics {
  total_denials: number
  total_amount: number
  groups: Array<{
    group_key: string
    count: number
    total_amount: number
    percentage: number
    top_codes?: string[]
    avg_amount?: number
  }>
  insights: string[]
}

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

export interface AppealAnalytics {
  total_appeals: number
  total_amount: number
  total_approved_amount: number
  success_rate: number
  average_days_to_decision?: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  overdue_count: number
  insights: string[]
}

export interface WriteOffAnalytics {
  total_write_offs: number
  total_amount: number
  preventable_amount: number
  preventable_percentage: number
  by_reason: Record<string, { count: number; amount: number }>
  by_category: Record<string, { count: number; amount: number }>
  top_preventable_categories: Array<{
    category: string
    count: number
    amount: number
  }>
  insights: string[]
}

export interface RebillAnalytics {
  total_rebills: number
  total_amount: number
  total_recovered: number
  success_rate: number
  average_days_to_resolution?: number
  by_status: Record<string, number>
  by_reason: Record<string, { count: number; success_rate: number }>
  insights: string[]
}

export interface PaymentVarianceAnalytics {
  total_variances: number
  total_variance_amount: number
  total_underpayment: number
  total_overpayment: number
  average_variance_percentage: number
  unresolved_count: number
  unresolved_amount: number
  appeals_required_count: number
  by_variance_type: Record<string, { count: number; amount: number }>
  by_reason: Record<
    string,
    { count: number; amount: number; avg_variance_pct: number }
  >
  by_payer: Record<
    string,
    { count: number; total_variance: number; avg_variance_pct: number }
  >
  insights: string[]
}
