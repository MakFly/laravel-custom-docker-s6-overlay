import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Brain, 
  FileText,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { CONTRACT_STATUS_LABELS } from '@/types/contract-unified';
import { cn } from '@/lib/utils';

interface ContractStatusBadgeProps {
  type: 'ocr' | 'ai' | 'contract';
  status: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

const ICON_COMPONENTS = {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Brain,
  FileText,
  AlertTriangle,
  Ban
} as const;

export function ContractStatusBadge({
  type,
  status,
  size = 'default',
  showIcon = true,
  showLabel = true,
  className
}: ContractStatusBadgeProps) {
  const statusConfig = CONTRACT_STATUS_LABELS[type]?.[status];
  
  if (!statusConfig) {
    return (
      <Badge variant="outline" className={cn("text-gray-500", className)}>
        {showIcon && <Clock className="w-3 h-3 mr-1" />}
        {showLabel && 'Inconnu'}
      </Badge>
    );
  }

  const { label, color, icon } = statusConfig;
  const IconComponent = ICON_COMPONENTS[icon as keyof typeof ICON_COMPONENTS];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-700 bg-green-50 border-green-200';
      case 'red': return 'text-red-700 bg-red-50 border-red-200';
      case 'yellow': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'blue': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm': return 'text-xs px-2 py-1';
      case 'lg': return 'text-sm px-3 py-2';
      default: return 'text-xs px-2.5 py-1.5';
    }
  };

  const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';

  return (
    <Badge
      variant="outline"
      className={cn(
        getColorClasses(color),
        getSizeClasses(size),
        'inline-flex items-center font-medium border',
        className
      )}
    >
      {showIcon && IconComponent && (
        <IconComponent 
          className={cn(
            iconSize,
            showLabel && 'mr-1',
            status === 'processing' && 'animate-spin'
          )} 
        />
      )}
      {showLabel && label}
    </Badge>
  );
}

// Composant spécialisé pour le traitement (OCR + AI)
interface ProcessingStatusBadgesProps {
  ocrStatus: string;
  aiStatus: string;
  size?: 'sm' | 'default' | 'lg';
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export function ProcessingStatusBadges({
  ocrStatus,
  aiStatus,
  size = 'default',
  layout = 'vertical',
  className
}: ProcessingStatusBadgesProps) {
  const containerClasses = layout === 'horizontal' 
    ? 'flex items-center space-x-2' 
    : 'flex flex-col space-y-1';

  return (
    <div className={cn(containerClasses, className)}>
      <ContractStatusBadge 
        type="ocr" 
        status={ocrStatus} 
        size={size}
        showIcon={true}
        showLabel={layout === 'vertical'}
      />
      <ContractStatusBadge 
        type="ai" 
        status={aiStatus} 
        size={size}
        showIcon={true}
        showLabel={layout === 'vertical'}
      />
    </div>
  );
}

// Composant pour afficher le statut global avec alertes
interface ContractStatusOverviewProps {
  contract: {
    type: 'pro' | 'perso';
    status: string;
    is_tacit_renewal: boolean;
    is_expiring: boolean;
    days_until_renewal?: number;
    ocr_status: string;
    ai_status: string;
  };
  showDetails?: boolean;
}

export function ContractStatusOverview({ 
  contract, 
  showDetails = true 
}: ContractStatusOverviewProps) {
  return (
    <div className="space-y-2">
      {/* Ligne principale : Type + Statut */}
      <div className="flex items-center space-x-2">
        <Badge variant={contract.type === 'pro' ? 'default' : 'secondary'}>
          {contract.type === 'pro' ? 'Professionnel' : 'Personnel'}
        </Badge>
        
        <ContractStatusBadge 
          type="contract" 
          status={contract.status}
        />
      </div>

      {/* Alertes importantes */}
      <div className="flex flex-wrap gap-1">
        {contract.is_tacit_renewal && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Reconduction tacite
          </Badge>
        )}
        
        {contract.is_expiring && contract.days_until_renewal !== undefined && (
          <Badge variant="secondary" className="text-xs text-orange-700 bg-orange-50 border-orange-200">
            <Clock className="w-3 h-3 mr-1" />
            Expire dans {contract.days_until_renewal} jour{contract.days_until_renewal > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Statuts de traitement si demandé */}
      {showDetails && (
        <ProcessingStatusBadges 
          ocrStatus={contract.ocr_status}
          aiStatus={contract.ai_status}
          size="sm"
          layout="horizontal"
        />
      )}
    </div>
  );
} 