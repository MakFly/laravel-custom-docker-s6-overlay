import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import type { Contract } from '../types/contract';

interface ContractCardProps {
  contract: Contract;
  onClick: () => void;
}

export function ContractCard({ contract, onClick }: ContractCardProps) {
  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Contract['status']) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'expired': return 'Expiré';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getOcrStatusIcon = (status: Contract['ocr_status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getOcrStatusText = (status: Contract['ocr_status']) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'processing': return 'Traitement...';
      case 'completed': return 'Terminé';
      case 'failed': return 'Échec';
      default: return status;
    }
  };

  const getCategoryText = (category: string) => {
    const categories: Record<string, string> = {
      'assurance': 'Assurance',
      'telecom': 'Télécom',
      'energie': 'Énergie',
      'banque': 'Banque',
      'immobilier': 'Immobilier',
      'transport': 'Transport',
      'autre': 'Autre'
    };
    return categories[category] || category;
  };

  return (
    <div 
      className={`
        bg-white rounded-lg shadow-md p-6 cursor-pointer 
        transition-all hover:shadow-lg border-l-4
        ${contract.is_expiring ? 'border-l-red-500' : 'border-l-blue-500'}
      `}
      onClick={onClick}
    >
      {/* Header avec titre et statuts */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {contract.title}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{getCategoryText(contract.category)}</span>
            <span>•</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              contract.type === 'pro' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {contract.type === 'pro' ? 'Professionnel' : 'Personnel'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <div className="flex items-center space-x-1" title={`OCR: ${getOcrStatusText(contract.ocr_status)}`}>
            {getOcrStatusIcon(contract.ocr_status)}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
            {getStatusText(contract.status)}
          </span>
        </div>
      </div>

      {/* Montant */}
      {contract.amount > 0 && (
        <div className="mb-3">
          <p className="text-xl font-bold text-gray-900">
            {contract.amount.toLocaleString('fr-FR', { 
              style: 'currency', 
              currency: contract.currency 
            })}
          </p>
        </div>
      )}

      {/* Date de renouvellement */}
      {contract.next_renewal_date && (
        <div className={`flex items-center space-x-2 mb-3 ${
          contract.is_expiring ? 'text-red-600' : 'text-gray-600'
        }`}>
          {contract.is_expiring && <ExclamationTriangleIcon className="h-4 w-4" />}
          <span className="text-sm font-medium">
            Renouvellement: {format(new Date(contract.next_renewal_date), 'dd MMMM yyyy', { locale: fr })}
          </span>
        </div>
      )}

      {/* Alertes et informations importantes */}
      <div className="flex flex-wrap gap-2 mt-4">
        {contract.alerts_count > 0 && (
          <div className="flex items-center space-x-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs">
            <ExclamationTriangleIcon className="h-3 w-3" />
            <span className="font-medium">
              {contract.alerts_count} alerte{contract.alerts_count > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {contract.ai_analysis?.reconduction_tacite && (
          <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">
            Reconduction tacite
          </div>
        )}

        {contract.ai_analysis?.confidence_score && contract.ai_analysis.confidence_score > 0.8 && (
          <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">
            IA haute confiance
          </div>
        )}

        {contract.ocr_status === 'failed' && (
          <div className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-medium">
            Échec OCR
          </div>
        )}
      </div>

      {/* Footer avec date de création */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Ajouté le {format(new Date(contract.created_at), 'dd/MM/yyyy', { locale: fr })}
        </p>
      </div>
    </div>
  );
} 