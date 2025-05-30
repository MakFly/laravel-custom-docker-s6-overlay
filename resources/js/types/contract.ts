export interface Contract {
  id: number;
  title: string;
  type: 'pro' | 'perso';
  category: string;
  file_original_name: string;
  amount: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  notice_period_days: number;
  is_tacit_renewal: boolean;
  next_renewal_date?: string;
  status: 'active' | 'expired' | 'cancelled';
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
  is_expiring: boolean;
  ai_analysis?: ContractAnalysis;
  alerts_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContractAnalysis {
  type_contrat: string;
  reconduction_tacite: boolean;
  duree_engagement: string;
  preavis_resiliation_jours: number;
  date_debut?: string;
  date_fin?: string;
  montant: number;
  frequence_paiement: string;
  conditions_resiliation: string[];
  clauses_importantes: string[];
  confidence_score: number;
}

export interface Alert {
  id: number;
  contract_id: number;
  type: 'renewal_warning' | 'notice_deadline' | 'contract_expired';
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  notification_method: 'email' | 'sms' | 'push';
  message: string;
  contract: Contract;
}

export interface ContractFilters {
  type?: 'pro' | 'perso';
  category?: string;
  status?: string;
  is_tacit_renewal?: boolean;
  search?: string;
} 