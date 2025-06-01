import React, { useEffect } from 'react';
import { FileText, Brain, Clock, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useContractStatus } from '@/hooks/useContractStatus';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ContractStatusCellProps {
  contractId: number;
  initialOcrStatus: string;
  initialAiStatus?: string;
  hasOcrText: boolean;
  hasAiAnalysis: boolean;
}

const getStatusIcon = (status: string, isPolling?: boolean) => {
  if (isPolling && status === 'processing') {
    return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
  }
  
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'processing':
      return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
    case 'completed':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'failed':
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return <Clock className="h-3 w-3 text-gray-400" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'processing':
      return 'En cours...';
    case 'completed':
      return 'Terminé';
    case 'failed':
      return 'Échec';
    default:
      return 'Inconnu';
  }
};

export function ContractStatusCell({
  contractId,
  initialOcrStatus,
  initialAiStatus,
  hasOcrText,
  hasAiAnalysis
}: ContractStatusCellProps) {
  const { status, isPolling, startPolling, stopPolling } = useContractStatus({
    contractId,
    initialStatus: {
      id: contractId,
      ocr_status: initialOcrStatus,
      ai_status: initialAiStatus,
      has_ocr_text: hasOcrText,
      has_ai_analysis: hasAiAnalysis,
      updated_at: new Date().toISOString(),
    },
    pollInterval: 3000, // 3 secondes pour la liste (plus fréquent que l'original)
    stopPollingWhen: (status) => {
      const ocrDone = ['completed', 'failed'].includes(status.ocr_status);
      const aiDone = !status.ai_status || ['completed', 'failed'].includes(status.ai_status);
      
      // Arrêter le polling si OCR échoue ou si tout est terminé
      const hasFailure = status.ocr_status === 'failed' || status.ai_status === 'failed';
      return hasFailure || (ocrDone && aiDone);
    }
  });

  // Utiliser le statut en temps réel s'il est disponible
  const currentOcrStatus = status?.ocr_status || initialOcrStatus;
  const currentAiStatus = status?.ai_status || initialAiStatus;

  // Démarrer le polling automatiquement si nécessaire
  useEffect(() => {
    const shouldPoll = currentOcrStatus === 'processing' || 
                      currentOcrStatus === 'pending' ||
                      currentAiStatus === 'processing' ||
                      currentAiStatus === 'pending';
    
    if (shouldPoll && !isPolling) {
      startPolling();
    } else if (!shouldPoll && isPolling) {
      stopPolling();
    }
  }, [currentOcrStatus, currentAiStatus, isPolling, startPolling, stopPolling]);

  // Calculer l'état global du traitement
  const isProcessing = currentOcrStatus === 'processing' || currentAiStatus === 'processing';
  const isPending = currentOcrStatus === 'pending' || currentAiStatus === 'pending';
  const hasError = currentOcrStatus === 'failed' || currentAiStatus === 'failed';
  const isCompleted = currentOcrStatus === 'completed' && (!currentAiStatus || currentAiStatus === 'completed');

  return (
    <div className="space-y-2">
      {/* État global */}
      <div className="flex items-center space-x-2">
        {isProcessing && (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Traitement...
          </Badge>
        )}
        {isPending && !isProcessing && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        )}
        {isCompleted && (
          <Badge variant="default" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Terminé
          </Badge>
        )}
        {hasError && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Erreur
          </Badge>
        )}
      </div>

      {/* Détails par étape */}
      <div className="space-y-1">
        {/* OCR Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-600">OCR</span>
          </div>
          <div className="flex items-center space-x-1">
            {getStatusIcon(currentOcrStatus, isPolling && currentOcrStatus === 'processing')}
            <span className={cn(
              "text-xs",
              currentOcrStatus === 'completed' && "text-green-600",
              currentOcrStatus === 'failed' && "text-red-600",
              currentOcrStatus === 'processing' && "text-blue-600",
              currentOcrStatus === 'pending' && "text-yellow-600"
            )}>
              {getStatusText(currentOcrStatus)}
            </span>
          </div>
        </div>
        
        {/* AI Status */}
        {currentAiStatus && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-600">IA</span>
            </div>
            <div className="flex items-center space-x-1">
              {getStatusIcon(currentAiStatus, isPolling && currentAiStatus === 'processing')}
              <span className={cn(
                "text-xs",
                currentAiStatus === 'completed' && "text-green-600",
                currentAiStatus === 'failed' && "text-red-600",
                currentAiStatus === 'processing' && "text-blue-600",
                currentAiStatus === 'pending' && "text-yellow-600"
              )}>
                {getStatusText(currentAiStatus)}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Indicateur de polling */}
      {isPolling && (
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-1">
            <div className="h-1 w-1 bg-blue-500 rounded-full animate-pulse" />
            <div className="h-1 w-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="h-1 w-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
          </div>
        </div>
      )}
    </div>
  );
} 