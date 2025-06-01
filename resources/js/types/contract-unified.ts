// Interface unifiée pour résoudre tous les problèmes de cohérence
export interface ContractUser {
  id: number;
  name: string;
  email: string;
}

export interface ContractAlert {
  id: number;
  type: string;
  type_label: string;
  message: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface ContractClause {
  id: number;
  title: string;
  content: string;
  // ... autres champs si nécessaire
}

export type ContractStatusType = 'active' | 'expired' | 'cancelled' | 'pending_activation' | 'archived';
export type ProcessingStatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable' | 'awaiting_ocr';

export interface ContractUnified {
  // === Identifiants & Core ===
  id: number;
  title: string;
  file_original_name: string;
  description?: string;

  // === Classification & Statut Contrat ===
  type: 'pro' | 'perso';
  category: string; // Pourrait être un enum/union type si les catégories sont fixes
  status: ContractStatusType;

  // === Statuts de Traitement (Toujours présents, fournis par le backend) ===
  ocr_status: ProcessingStatusType;
  ai_status: ProcessingStatusType;

  // === Indicateurs de Données Traitées (Calculés par le backend) ===
  has_ocr_text: boolean;
  has_ai_analysis: boolean;

  // === Financier ===
  amount: number; // En unité monétaire (ex: euros), pas en centimes.
  currency: string; // ex: 'EUR'

  // === Dates & Préavis ===
  start_date?: string | null; // ISO 8601 Date string (YYYY-MM-DD)
  end_date?: string | null;   // ISO 8601 Date string (YYYY-MM-DD)
  next_renewal_date?: string | null; // ISO 8601 Date string (YYYY-MM-DD)
  notice_period_days: number; // Nombre de jours
  is_tacit_renewal: boolean;

  // === Métadonnées Calculées (Fournies par le backend) ===
  is_expiring: boolean; // True si le contrat arrive à échéance bientôt
  days_until_renewal?: number | null; // Nombre de jours avant le prochain renouvellement ou échéance. Null si non applicable.
  
  // Pourrait être une chaîne plus descriptive comme 'text-green-500 bg-green-100' etc. ou un type enum.
  // Simplifié pour l'exemple. Le backend pourrait envoyer directement les classes Tailwind ou une clé pour les mapper.
  status_visual_indicator: 'green' | 'yellow' | 'red' | 'gray' | 'blue';


  // === Contenu OCR/IA (Résumé pour affichage rapide, complet peut être chargé à la demande) ===
  ocr_summary?: string; // Ex: Les premières lignes ou un résumé si applicable
  ai_analysis_summary?: {
    confidence_score?: number; // 0.0 to 1.0
    key_points?: string[];
    detected_renewal_type?: 'tacit' | 'explicit' | 'none' | 'unknown';
    detected_notice_days?: number;
    // ... autres champs de résumé pertinents
  };
  // ocr_raw_text et ai_full_analysis seraient chargés via des endpoints dédiés si trop volumineux.

  // === Relations ===
  user?: ContractUser; // L'utilisateur qui a ajouté/gère le contrat
  other_party?: string; // Nom de la contrepartie

  // === Alertes & Clauses ===
  alerts_count: number; // Nombre total d'alertes associées
  active_alerts_count: number; // Nombre d'alertes actives/non résolues
  alerts?: ContractAlert[]; // Liste des alertes

  clauses_count?: number;
  // clauses?: ContractClause[]; // Pourrait être chargé séparément

  // === Horodatage ===
  created_at: string; // ISO 8601 DateTime string
  updated_at: string; // ISO 8601 DateTime string

  // === Permissions & URLs (Fournis par le backend, basés sur l'utilisateur connecté et l'état du contrat) ===
  permissions: {
    can_view_details: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_download_file: boolean;
    can_reprocess_ocr: boolean;
    can_reprocess_ai: boolean;
    can_manage_alerts: boolean;
    // ... autres permissions
  };
  urls: {
    show: string;
    edit?: string;
    download?: string;
    reprocess_ocr?: string;
    reprocess_ai?: string;
    alerts_list?: string;
    // ... autres URLs d'action pertinentes
  };
}

// Helper pour les labels des statuts, etc. (déjà présent dans ContractStatusBadge.tsx, à consolider)
export const CONTRACT_STATUS_LABELS: Record<string, Record<string, { label: string; color: string; icon: any /* LucideIcon */ }>> = {
  contract: {
    active: { label: 'Actif', color: 'green', icon: 'CheckCircle' },
    expired: { label: 'Expiré', color: 'red', icon: 'XCircle' },
    cancelled: { label: 'Annulé', color: 'gray', icon: 'Ban' },
    pending_activation: { label: 'En attente d\'activation', color: 'blue', icon: 'Clock' },
    archived: { label: 'Archivé', color: 'gray', icon: 'Archive' },
  },
  ocr: {
    pending: { label: 'OCR en attente', color: 'yellow', icon: 'Clock' },
    processing: { label: 'OCR en cours', color: 'blue', icon: 'Loader2' },
    completed: { label: 'OCR Terminé', color: 'green', icon: 'CheckCircle' },
    failed: { label: 'OCR Échec', color: 'red', icon: 'XCircle' },
    not_applicable: { label: 'OCR N/A', color: 'gray', icon: 'FileText' },
  },
  ai: {
    pending: { label: 'IA en attente', color: 'yellow', icon: 'Clock' },
    processing: { label: 'IA en cours', color: 'blue', icon: 'Loader2' },
    completed: { label: 'IA Terminé', color: 'green', icon: 'CheckCircle' },
    failed: { label: 'IA Échec', color: 'red', icon: 'XCircle' },
    awaiting_ocr: { label: 'IA - Attente OCR', color: 'gray', icon: 'Brain' },
    not_applicable: { label: 'IA N/A', color: 'gray', icon: 'Brain' },
  },
};

// Cette fonction de normalisation est cruciale si l'API ne retourne pas EXACTEMENT ContractUnified.
// Idéalement, ContractResource.php s'en charge.
export function normalizeToContractUnified(apiData: any): ContractUnified {
  // Placeholder: L'implémentation dépendra de la structure réelle de apiData.
  // Objectif : mapper apiData vers ContractUnified, en calculant/dérivant les champs manquants si nécessaire
  // et en fournissant des valeurs par défaut.
  const defaults = {
    ocr_status: 'pending' as ProcessingStatusType,
    ai_status: 'pending' as ProcessingStatusType,
    has_ocr_text: false,
    has_ai_analysis: false,
    amount: 0,
    currency: 'EUR',
    notice_period_days: 0,
    is_tacit_renewal: false,
    is_expiring: false,
    alerts_count: 0,
    active_alerts_count: 0,
    status_visual_indicator: 'gray' as 'gray',
    permissions: {
        can_view_details: true,
        can_edit: true, // Défaut permissif, à ajuster selon la logique business
        can_delete: true,
        can_download_file: false,
        can_reprocess_ocr: false,
        can_reprocess_ai: false,
        can_manage_alerts: true,
    },
    urls: {
        show: `/contracts/${apiData.id || 0}`,
    },
  };

  let effectiveAiStatus = apiData.ai_status || defaults.ai_status;
  if (apiData.ocr_status !== 'completed' && effectiveAiStatus === 'pending') {
    effectiveAiStatus = 'awaiting_ocr';
  }


  return {
    ...defaults,
    ...apiData, // Spread apiData first
    id: apiData.id,
    title: apiData.title || 'Sans titre',
    file_original_name: apiData.file_original_name || 'Non spécifié',
    type: apiData.type || 'perso',
    category: apiData.category || 'autre',
    status: apiData.status || 'pending_activation',
    
    ocr_status: apiData.ocr_status || defaults.ocr_status,
    ai_status: effectiveAiStatus, // Utiliser le statut AI effectif calculé

    has_ocr_text: !!apiData.has_ocr_text, // Assurer un booléen
    has_ai_analysis: !!apiData.has_ai_analysis, // Assurer un booléen

    // Assurer que les dates sont null si vides ou invalides, sinon string YYYY-MM-DD
    start_date: apiData.start_date || null,
    end_date: apiData.end_date || null,
    next_renewal_date: apiData.next_renewal_date || null,
    
    is_expiring: apiData.is_expiring !== undefined ? apiData.is_expiring : (apiData.days_until_renewal !== undefined && apiData.days_until_renewal !== null && apiData.days_until_renewal <= 30),
    days_until_renewal: apiData.days_until_renewal !== undefined ? apiData.days_until_renewal : null,

    // Mapper les alertes et recalculer les comptes
    alerts: apiData.alerts || [],
    alerts_count: apiData.alerts_count || (apiData.alerts ? apiData.alerts.length : 0),
    active_alerts_count: apiData.active_alerts_count || (apiData.alerts ? apiData.alerts.filter((alert: any) => alert.status === 'pending').length : 0),

    // Assurer que les permissions et URLs sont toujours des objets
    permissions: {
        ...defaults.permissions,
        ...(apiData.permissions || {}),
        // Calculer les permissions basées sur l'état du contrat et les données API
        can_download_file: !!(apiData.links?.download || apiData.urls?.download),
        can_reprocess_ocr: ['failed', 'completed'].includes(apiData.ocr_status || ''),
        can_reprocess_ai: ['failed', 'completed'].includes(apiData.ai_status || '') && apiData.ocr_status === 'completed',
    },
    urls: {
        ...defaults.urls,
        ...(apiData.urls || {}),
        show: apiData.urls?.show || `/contracts/${apiData.id}`,
        edit: apiData.urls?.edit || `/contracts/${apiData.id}/edit`,
        download: apiData.links?.download || apiData.urls?.download,
    },
    created_at: apiData.created_at || new Date().toISOString(),
    updated_at: apiData.updated_at || new Date().toISOString(),
  };
} 