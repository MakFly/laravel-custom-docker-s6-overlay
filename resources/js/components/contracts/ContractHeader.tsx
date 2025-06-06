import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { Contract } from '@/types/api';

// Format date utility
const formatDate = (dateString?: string | null) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('fr-FR');
};

// Format currency utility
const formatCurrency = (amount?: number, currency: string = 'EUR') => {
  if (!amount || amount <= 0) return null;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

interface ContractHeaderProps {
  contract: Contract;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onReprocess?: () => void;
  isOwner?: boolean;
}

export const ContractHeader = React.memo(({
  contract,
  onEdit,
  onDelete,
  onDownload,
  onReprocess,
  isOwner = false
}: ContractHeaderProps) => {
  const getStatusColor = (status: Contract['status']) => {
    const colors = {
      active: 'default',
      expired: 'destructive',
      cancelled: 'secondary',
      draft: 'outline',
      file_missing: 'destructive'
    } as const;
    return colors[status] || 'outline';
  };

  const getTypeLabel = (type: Contract['type']) => {
    return type === 'pro' ? 'Professionnel' : 'Personnel';
  };

  const getCategoryLabel = (category: Contract['category']) => {
    const labels = {
      assurance: 'Assurance',
      telecom: 'Télécom',
      energie: 'Énergie',
      banque: 'Banque',
      autre: 'Autre'
    };
    return category ? labels[category] : 'Non catégorisé';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title and Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {contract.title || contract.file_original_name}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusColor(contract.status)}>
              {contract.status}
            </Badge>
            <Badge variant="outline">
              {getTypeLabel(contract.type)}
            </Badge>
            {contract.category && (
              <Badge variant="secondary">
                {getCategoryLabel(contract.category)}
              </Badge>
            )}
            {contract.is_tacit_renewal && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Reconduction tacite
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          )}
          
          {onReprocess && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReprocess}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retraiter
            </Button>
          )}

          {isOwner && (
            <>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Contract Details Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* File Info */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Fichier</p>
          <p className="font-medium">{contract.file_original_name}</p>
        </div>

        {/* Amount */}
        {contract.amount_cents && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Montant</p>
            <p className="font-medium">
              {formatCurrency(contract.amount_cents / 100, contract.currency)}
            </p>
          </div>
        )}

        {/* Start Date */}
        {contract.start_date && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Date de début</p>
            <p className="font-medium">{formatDate(contract.start_date)}</p>
          </div>
        )}

        {/* End Date */}
        {contract.end_date && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Date de fin</p>
            <p className="font-medium">{formatDate(contract.end_date)}</p>
          </div>
        )}

        {/* Next Renewal */}
        {contract.next_renewal_date && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Prochain renouvellement</p>
            <div className="flex items-center gap-2">
              <p className="font-medium">{formatDate(contract.next_renewal_date)}</p>
              {contract.is_tacit_renewal && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
        )}

        {/* Notice Period */}
        {contract.notice_period_days && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Préavis</p>
            <p className="font-medium">
              {contract.notice_period_days} jour{contract.notice_period_days > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Created Date */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Créé le</p>
          <p className="font-medium">{formatDate(contract.created_at)}</p>
        </div>

        {/* Updated Date */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Modifié le</p>
          <p className="font-medium">{formatDate(contract.updated_at)}</p>
        </div>
      </div>
    </div>
  );
});

ContractHeader.displayName = 'ContractHeader';

// Export as default for easier lazy loading
export default ContractHeader;