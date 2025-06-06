// ===== BASE API TYPES =====

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  meta?: {
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

export interface ApiError {
  error: string;
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
}

// ===== CONTRACT TYPES (UNIFIED) =====

export type ContractStatus = 'active' | 'expired' | 'cancelled' | 'draft' | 'file_missing';
export type ContractType = 'pro' | 'perso';
export type ContractCategory = 'assurance' | 'telecom' | 'energie' | 'banque' | 'autre';
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AiStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ProcessingMode = 'basic' | 'enhanced';

export interface Contract {
  id: number;
  org_id: number;
  user_id: number;
  title: string;
  type: ContractType;
  category: ContractCategory | null;
  file_path: string;
  file_original_name: string;
  amount_cents: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  notice_period_days: number | null;
  is_tacit_renewal: boolean;
  next_renewal_date: string | null;
  status: ContractStatus;
  ocr_status: OcrStatus;
  ai_status: AiStatus;
  ocr_raw_text: string | null;
  ai_analysis: AiAnalysis | null;
  ai_analysis_cached: AiAnalysis | null;
  ai_analysis_cached_at: string | null;
  processing_mode: ProcessingMode;
  pattern_analysis_result: PatternAnalysisResult | null;
  tacit_renewal_detected_by_pattern: boolean;
  pattern_confidence_score: number | null;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  alerts?: Alert[];
  clauses?: ContractClause[];
}

export interface AiAnalysis {
  analysis_method: 'ai' | 'pattern_fallback';
  is_tacit_renewal: boolean;
  end_date: string | null;
  notice_period_days: number | null;
  next_renewal_date: string | null;
  confidence: number;
  detected_clauses: string[];
  important_dates: Array<{
    date: string;
    type: string;
    description: string;
  }>;
  warnings: string[];
  fallback_reason?: string;
}

export interface PatternAnalysisResult {
  is_tacit_renewal: boolean;
  confidence_score: number;
  detected_patterns: string[];
  extracted_dates: Array<{
    date: string;
    type: string;
    context: string;
  }>;
  warnings: string[];
}

// ===== USER TYPES =====

export interface User {
  id: number;
  org_id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  ai_credits: number;
  created_at: string;
  updated_at: string;
  // Relations
  org?: Organization;
}

export interface Organization {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Relations
  users?: User[];
  contracts?: Contract[];
}

// ===== ALERT TYPES =====

export type AlertType = 'renewal_90_days' | 'renewal_30_days' | 'renewal_7_days' | 'renewal_1_day' | 'custom';
export type AlertStatus = 'pending' | 'sent' | 'failed' | 'dismissed';

export interface Alert {
  id: number;
  org_id: number;
  contract_id: number;
  type: AlertType;
  status: AlertStatus;
  scheduled_for: string;
  is_sent: boolean;
  sent_at: string | null;
  discord_webhook_sent: boolean;
  discord_webhook_url: string | null;
  snooze_until: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  contract?: Contract;
}

// ===== BILLING TYPES =====

export interface CreditUsage {
  id: number;
  user_id: number;
  org_id: number;
  credits_used: number;
  operation_type: 'ai_analysis' | 'ocr_processing';
  contract_id: number | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  items: Array<{
    id: string;
    price: {
      id: string;
      nickname: string | null;
      unit_amount: number;
      currency: string;
      recurring: {
        interval: 'month' | 'year';
        interval_count: number;
      };
    };
    quantity: number;
  }>;
}

// ===== CONTRACT CLAUSE TYPES =====

export interface ContractClause {
  id: number;
  org_id: number;
  contract_id: number;
  type: string;
  content: string;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

// ===== FORM TYPES =====

export interface CreateContractRequest {
  contract_file: File;
  title?: string;
  type: ContractType;
  category?: ContractCategory;
  amount?: number;
  start_date?: string;
  end_date?: string;
  next_renewal_date?: string;
  notice_period_days?: number;
  is_tacit_renewal?: boolean;
}

export interface UpdateContractRequest {
  title?: string;
  type?: ContractType;
  category?: ContractCategory;
  amount?: number;
  start_date?: string;
  end_date?: string;
  next_renewal_date?: string;
  notice_period_days?: number;
  is_tacit_renewal?: boolean;
}

// ===== DASHBOARD TYPES =====

export interface DashboardStats {
  total_contracts: number;
  active_contracts: number;
  upcoming_renewals: number;
  pending_alerts: number;
  ai_credits_remaining: number;
  contracts_processed_this_month: number;
}

export interface UpcomingRenewal {
  contract_id: number;
  contract_title: string;
  renewal_date: string;
  days_until_renewal: number;
  is_tacit_renewal: boolean;
  notice_period_days: number | null;
}

// ===== SEARCH & FILTER TYPES =====

export interface ContractFilters extends FilterParams {
  type?: ContractType;
  category?: ContractCategory;
  status?: ContractStatus;
  ocr_status?: OcrStatus;
  ai_status?: AiStatus;
  is_tacit_renewal?: boolean;
  renewal_date_from?: string;
  renewal_date_to?: string;
}

export interface AlertFilters extends FilterParams {
  type?: AlertType;
  status?: AlertStatus;
  contract_id?: number;
  scheduled_from?: string;
  scheduled_to?: string;
}

// ===== PROCESSING TYPES =====

export interface ProcessingStatus {
  contract_id: number;
  ocr_status: OcrStatus;
  ai_status: AiStatus;
  progress_percentage: number;
  current_step: string;
  estimated_completion: string | null;
  error_message: string | null;
}

export interface OcrResult {
  text: string;
  confidence: number;
  processing_time: number;
  method: 'tesseract' | 'enhanced' | 'native_pdf';
  metadata: {
    page_count: number;
    language_detected: string;
    text_regions: number;
  };
}

// ===== FILE VALIDATION TYPES =====

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  file_info: {
    original_name: string;
    size: number;
    mime_type: string;
    extension: string;
    hash_md5: string;
    hash_sha256: string;
  };
  security_score: number;
  threats?: string[];
}

// ===== COMPONENT PROP TYPES =====

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  className?: string;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea' | 'file' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: SelectOption[];
}