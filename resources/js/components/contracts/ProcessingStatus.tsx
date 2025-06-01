import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock, FileText, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
  ocrStatus: string;
  aiStatus?: string;
  hasOcrText: boolean;
  hasAiAnalysis: boolean;
  isPolling?: boolean;
  className?: string;
}

export function ProcessingStatus({
  ocrStatus,
  aiStatus,
  hasOcrText,
  hasAiAnalysis,
  isPolling = false,
  className
}: ProcessingStatusProps) {
  const getStatusIcon = (status: string, isProcessing?: boolean) => {
    if (isProcessing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'failed':
        return 'Échoué';
      case 'processing':
        return 'En cours...';
      case 'pending':
        return 'En attente';
      default:
        return 'Non traité';
    }
  };

  // Déterminer le vrai statut AI en fonction du contexte
  const getEffectiveAiStatus = () => {
    // Maintenant aiStatus devrait toujours être défini grâce à ContractResource
    // Mais on garde la logique de fallback au cas oùma
    if (!aiStatus) {
      if (ocrStatus === 'failed') {
        return 'failed';
      } else if (ocrStatus === 'completed' && !hasAiAnalysis) {
        return 'pending';
      } else if (ocrStatus === 'processing' || ocrStatus === 'pending') {
        return 'pending'; // Afficher pending même si OCR en cours
      }
      return 'pending';
    }
    return aiStatus;
  };

  const effectiveAiStatus = getEffectiveAiStatus();

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">État du traitement</h3>
            {isPolling && (
              <Badge variant="outline" className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Actualisation...
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            {/* OCR Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Extraction de texte (OCR)</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(ocrStatus, ocrStatus === 'processing')}
                <Badge variant={getStatusVariant(ocrStatus)} className="text-xs">
                  {getStatusText(ocrStatus)}
                </Badge>
              </div>
            </div>

            {/* AI Analysis Status - Toujours afficher maintenant */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Analyse IA</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(effectiveAiStatus, effectiveAiStatus === 'processing')}
                <Badge variant={getStatusVariant(effectiveAiStatus)} className="text-xs">
                  {getStatusText(effectiveAiStatus)}
                </Badge>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Texte extrait: {hasOcrText ? 'Oui' : 'Non'}</span>
                <span>Analyse IA: {hasAiAnalysis ? 'Disponible' : (effectiveAiStatus ? 'En cours' : 'Non disponible')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 