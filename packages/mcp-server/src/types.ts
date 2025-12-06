// Database types
export interface Payer {
  id: string;
  payer_id: string;
  name: string;
  type?: string;
  contact_info?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CPTCode {
  code: string;
  modifiers?: string[];
  units?: number;
}

export interface DiagnosisCode {
  code: string;
  pointer?: number;
}

export interface Claim {
  id: string;
  claim_id: string;
  patient_id: string;
  payer_id?: string;
  status: 'pending' | 'submitted' | 'paid' | 'denied' | 'appealed' | 'written_off';
  amount: number;
  paid_amount?: number;
  service_date?: Date;
  submitted_date?: Date;
  cpt_codes?: CPTCode[];
  diagnosis_codes?: DiagnosisCode[];
  place_of_service?: string;
  claim_type?: string;
  raw_data?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Denial {
  id: string;
  claim_id: string;
  denial_code: string;
  denial_category?: string;
  denial_reason?: string;
  denial_amount: number;
  denial_date: Date;
  is_preventable?: boolean;
  root_cause?: string;
  action_taken?: string;
  action_date?: Date;
  resolution_status?: string;
  recovered_amount?: number;
  raw_data?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface DenialCodeLibrary {
  id: string;
  code: string;
  category: string;
  description: string;
  is_appealable: boolean;
  common_resolution?: string;
  prevention_tips?: string;
  created_at: Date;
}

export interface OrgPolicy {
  id: string;
  policy_name: string;
  policy_type: string;
  payer_id?: string;
  denial_category?: string;
  min_amount?: number;
  max_amount?: number;
  days_to_action?: number;
  auto_appeal: boolean;
  auto_write_off: boolean;
  config?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CodingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  cpt_code?: string;
  cpt_pattern?: string;
  required_modifier?: string;
  incompatible_codes?: string[];
  required_diagnosis_pattern?: string;
  payer_specific?: string;
  error_message: string;
  severity: 'error' | 'warning' | 'info';
  is_active: boolean;
  created_at: Date;
}

// Tool input types
export interface NormalizeClaimInput {
  claim_data: Record<string, any>;
  format?: '837' | '835' | 'json';
}

export interface ClassifyDenialInput {
  denial_code: string;
  denial_text?: string;
  claim_data?: Record<string, any>;
}

export interface SuggestNextActionInput {
  claim_id: string;
  denial_code: string;
  denial_amount: number;
  payer_id?: string;
}

export interface BatchClassifyDenialsInput {
  denials: Array<{
    claim_id?: string;
    denial_code: string;
    denial_amount: number;
    payer_id?: string;
  }>;
  group_by?: 'category' | 'payer' | 'code';
}

export interface AuditCodingInput {
  claim_data: {
    cpt_codes: CPTCode[];
    diagnosis_codes: DiagnosisCode[];
    payer_id?: string;
    place_of_service?: string;
  };
  include_warnings?: boolean;
}

// Tool output types
export interface NormalizedClaim extends Claim {
  validation_warnings?: string[];
}

export interface DenialClassification {
  code: string;
  category: string;
  description: string;
  is_appealable: boolean;
  common_resolution: string;
  prevention_tips: string;
}

export interface NextActionSuggestion {
  recommended_action: 'appeal' | 'write_off' | 'rebill' | 'transfer_to_patient' | 'investigate';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  days_to_action: number;
  auto_process: boolean;
  policy_applied?: string;
  estimated_recovery_chance?: number;
  next_steps: string[];
}

export interface DenialAnalytics {
  total_denials: number;
  total_amount: number;
  groups: Array<{
    group_key: string;
    count: number;
    total_amount: number;
    percentage: number;
    top_codes?: string[];
    avg_amount?: number;
  }>;
  insights: string[];
}

export interface CodingAuditResult {
  passed: boolean;
  errors: Array<{
    rule_name: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    cpt_code?: string;
    suggestion?: string;
  }>;
  summary: {
    total_issues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  risk_level: 'high' | 'medium' | 'low';
}
