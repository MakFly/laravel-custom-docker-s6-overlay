import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Contract, OcrStatus, AiStatus } from '@/types/api';
import { useProcessingStatus } from '@/providers/AppProviders';

interface ContractProcessingStatusProps {
  contract: Contract;
  onRetry?: (type: 'ocr' | 'ai') => void;
  onViewOcrText?: () => void;
  onForceReanalyze?: () => void;
}

export const ContractProcessingStatus = React.memo(({
  contract,
  onRetry,
  onViewOcrText,
  onForceReanalyze
}: ContractProcessingStatusProps) => {
  const { getStatus } = useProcessingStatus();
  const realTimeStatus = getStatus(`contract-${contract.id}`);

  const getStatusIcon = (status: OcrStatus | AiStatus) => {
    switch (status) {
      case 'pending':
        return { name: 'clock', color: 'text-yellow-500' };
      case 'processing':
        return { name: 'loader', color: 'text-blue-500 animate-spin' };
      case 'completed':
        return { name: 'check-circle', color: 'text-green-500' };
      case 'failed':
        return { name: 'x-circle', color: 'text-red-500' };
      default:
        return { name: 'circle', color: 'text-gray-400' };
    }
  };

  const getStatusLabel = (status: OcrStatus | AiStatus) => {
    const labels = {
      pending: 'En attente',
      processing: 'En cours',
      completed: 'Terminé',
      failed: 'Échec'
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: OcrStatus | AiStatus) => {
    switch (status) {
      case 'pending':
        return 'secondary' as const;
      case 'processing':
        return 'default' as const;
      case 'completed':
        return 'success' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const getOverallProgress = () => {
    let progress = 0;
    
    if (contract.ocr_status === 'completed') progress += 50;
    else if (contract.ocr_status === 'processing') progress += 25;
    
    if (contract.ai_status === 'completed') progress += 50;
    else if (contract.ai_status === 'processing') progress += 25;
    
    return progress;
  };

  const shouldShowRetry = (status: OcrStatus | AiStatus) => {
    return status === 'failed' && onRetry;
  };

  const ocrIcon = getStatusIcon(contract.ocr_status);
  const aiIcon = getStatusIcon(contract.ai_status);
  const overallProgress = getOverallProgress();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="activity" className="h-5 w-5" />
          État du traitement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progression globale</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="w-full" />
        </div>

        {/* OCR Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon 
                name={ocrIcon.name} 
                className={`h-5 w-5 ${ocrIcon.color}`} 
              />
              <div>
                <p className="font-medium">Reconnaissance de texte (OCR)</p>
                <p className="text-sm text-muted-foreground">
                  Mode: {contract.processing_mode === 'enhanced' ? 'Avancé' : 'Basique'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(contract.ocr_status)}>
                {getStatusLabel(contract.ocr_status)}
              </Badge>
            </div>
          </div>

          {/* OCR Actions */}
          <div className="flex gap-2">
            {contract.ocr_status === 'completed' && onViewOcrText && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewOcrText}
                className="gap-2"
              >
                <Icon name="eye" className="h-4 w-4" />
                Voir le texte
              </Button>
            )}
            
            {shouldShowRetry(contract.ocr_status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry?.('ocr')}
                className="gap-2"
              >
                <Icon name="refresh-cw" className="h-4 w-4" />
                Réessayer
              </Button>
            )}
          </div>

          {/* OCR Error Message */}
          {contract.ocr_status === 'failed' && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              <Icon name="alert-triangle" className="h-4 w-4 inline mr-2" />
              La reconnaissance de texte a échoué. Vérifiez la qualité du fichier.
            </div>
          )}
        </div>

        {/* AI Analysis Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon 
                name={aiIcon.name} 
                className={`h-5 w-5 ${aiIcon.color}`} 
              />
              <div>
                <p className="font-medium">Analyse IA</p>
                <p className="text-sm text-muted-foreground">
                  Détection automatique des clauses
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(contract.ai_status)}>
                {getStatusLabel(contract.ai_status)}
              </Badge>
            </div>
          </div>

          {/* AI Actions */}
          <div className="flex gap-2">
            {contract.ai_status === 'completed' && onForceReanalyze && (
              <Button
                variant="outline"
                size="sm"
                onClick={onForceReanalyze}
                className="gap-2"
              >
                <Icon name="brain" className="h-4 w-4" />
                Relancer l'analyse
              </Button>
            )}
            
            {shouldShowRetry(contract.ai_status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry?.('ai')}
                className="gap-2"
              >
                <Icon name="refresh-cw" className="h-4 w-4" />
                Réessayer
              </Button>
            )}
          </div>

          {/* AI Error Message */}
          {contract.ai_status === 'failed' && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              <Icon name="alert-triangle" className="h-4 w-4 inline mr-2" />
              L'analyse IA a échoué. Le service pourrait être temporairement indisponible.
            </div>
          )}

          {/* AI Analysis Method */}
          {contract.ai_analysis?.analysis_method && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="flex items-center gap-2">
                <Icon name="info" className="h-4 w-4" />
                <span>
                  Méthode d'analyse: {' '}
                  {contract.ai_analysis.analysis_method === 'ai' 
                    ? 'Intelligence Artificielle' 
                    : 'Analyse par motifs'
                  }
                </span>
              </div>
              {contract.ai_analysis.fallback_reason && (
                <p className="mt-1 text-muted-foreground">
                  {contract.ai_analysis.fallback_reason}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Real-time Status Override */}
        {realTimeStatus !== 'idle' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-700">
              <Icon name="loader" className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                Traitement en cours... ({realTimeStatus})
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ContractProcessingStatus.displayName = 'ContractProcessingStatus';

// Export as default for easier lazy loading
export default ContractProcessingStatus;