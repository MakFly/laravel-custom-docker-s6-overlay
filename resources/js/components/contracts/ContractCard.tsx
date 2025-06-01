import React from 'react';
import { Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContractUnified } from '@/types/contract-unified';
import { ContractStatusBadge } from './ContractStatusBadge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContractCardProps {
  contract: ContractUnified;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
  showProcessing?: boolean;
}

const formatAmount = (amount: number, currency: string = 'EUR') => {
  if (amount <= 0) return null;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return null;
  try {
    const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T00:00:00');
    return format(date, 'dd MMM yyyy', { locale: fr });
  } catch {
    return dateString;
  }
};

export function ContractCard({ 
  contract, 
  variant = 'default',
  className,
  showProcessing = true
}: ContractCardProps) {
  
  if (variant === 'minimal') {
    return (
      <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}>
        <Link href={contract.urls.show} className="block">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {contract.title}
              </h3>
              <div className="flex items-center space-x-2">
                <Badge variant={contract.type === 'pro' ? 'default' : 'secondary'} className="text-xs">
                  {contract.type === 'pro' ? 'Pro' : 'Perso'}
                </Badge>
                {contract.is_tacit_renewal && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3" />
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn('hover:shadow-md transition-shadow', className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <Link 
                href={contract.urls.show}
                className="block text-base font-semibold text-gray-900 hover:text-blue-600 truncate"
              >
                {contract.title}
              </Link>
              <p className="text-sm text-gray-500 truncate">{contract.file_original_name}</p>
            </div>
            
            <div className="flex flex-col items-end space-y-1 ml-4">
              <Badge variant={contract.type === 'pro' ? 'default' : 'secondary'} className="text-xs">
                {contract.type === 'pro' ? 'Pro' : 'Perso'}
              </Badge>
              <ContractStatusBadge type="contract" status={contract.status} size="sm" />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-600">
              {contract.amount > 0 && (
                <span className="font-medium">
                  {formatAmount(contract.amount, contract.currency)}
                </span>
              )}
              {contract.next_renewal_date && (
                <span>
                  Échéance: {formatDate(contract.next_renewal_date)}
                </span>
              )}
            </div>
            
            {showProcessing && (
              <div className="flex items-center space-x-1">
                <ContractStatusBadge type="ocr" status={contract.ocr_status} size="sm" showLabel={false} />
                <ContractStatusBadge type="ai" status={contract.ai_status} size="sm" showLabel={false} />
              </div>
            )}
          </div>

          {/* Alertes importantes */}
          {(contract.is_tacit_renewal || contract.is_expiring || contract.active_alerts_count > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-1">
                {contract.is_tacit_renewal && (
                  <Badge variant="destructive" className="text-xs">
                    Reconduction tacite
                  </Badge>
                )}
                {contract.is_expiring && contract.days_until_renewal !== null && contract.days_until_renewal !== undefined && contract.days_until_renewal <= 30 && (
                  <Badge variant="secondary" className="text-xs text-orange-700 bg-orange-50 border-orange-200">
                    {contract.days_until_renewal > 0 
                      ? `Expire dans ${contract.days_until_renewal}j` 
                      : 'Expiré'
                    }
                  </Badge>
                )}
                {contract.active_alerts_count > 0 && (
                  <Badge variant="secondary" className="text-xs text-orange-700 bg-orange-50 border-orange-200">
                    {contract.active_alerts_count} alerte{contract.active_alerts_count > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Variant 'default' - plus détaillé
  return (
    <Card className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{contract.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{contract.file_original_name}</p>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge variant={contract.type === 'pro' ? 'default' : 'secondary'} className="text-xs">
              {contract.type === 'pro' ? 'Pro' : 'Perso'}
            </Badge>
            <ContractStatusBadge type="contract" status={contract.status} size="sm" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Métadonnées additionnelles */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Catégorie:</span>
            <span className="ml-2">{contract.category}</span>
          </div>
          <div>
            <span className="text-gray-500">Préavis:</span>
            <span className="ml-2">{contract.notice_period_days} jours</span>
          </div>
          {contract.start_date && (
            <div>
              <span className="text-gray-500">Début:</span>
              <span className="ml-2">{formatDate(contract.start_date)}</span>
            </div>
          )}
          {contract.end_date && (
            <div>
              <span className="text-gray-500">Fin:</span>
              <span className="ml-2">{formatDate(contract.end_date)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Modifié le {formatDate(contract.updated_at?.split('T')[0])}
          </div>
          
          <div className="flex items-center space-x-2">
            <Link 
              href={contract.urls.show}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Voir détails
            </Link>
            {contract.permissions.can_edit && (
              <Link 
                href={contract.urls.edit || `/contracts/${contract.id}/edit`}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Modifier
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 