import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Brain 
} from 'lucide-react';
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

interface ContractAnalysisCardProps {
  contract: Contract;
  analysis?: any; // TODO: Define proper AI analysis type
  onViewOcrText?: () => void;
}

export const ContractAnalysisCard = React.memo(({
  contract,
  analysis,
  onViewOcrText
}: ContractAnalysisCardProps) => {
  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* OCR Results */}
      {contract.ocr_raw_text && (
        <Card className="border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Texte extrait (OCR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600">
                <strong>{contract.ocr_raw_text.length}</strong> caractères extraits du document
              </div>
            </div>
            {onViewOcrText && (
              <Button variant="outline" onClick={onViewOcrText}>
                <FileText className="h-4 w-4 mr-2" />
                Voir le texte complet
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tacit Renewal Analysis */}
      {analysis.tacit_renewal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Tacite Reconduction
              <Badge 
                variant={analysis.tacit_renewal.detected ? 'destructive' : 'default'} 
                className="ml-2"
              >
                {analysis.tacit_renewal.detected ? 'DÉTECTÉE' : 'NON DÉTECTÉE'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {analysis.tacit_renewal.detected ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  )}
                  <span className={
                    analysis.tacit_renewal.detected 
                      ? 'text-red-700 font-medium' 
                      : 'text-green-700 font-medium'
                  }>
                    {analysis.tacit_renewal.detected 
                      ? 'Tacite reconduction activée' 
                      : 'Pas de tacite reconduction'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {analysis.tacit_renewal.source === 'ai_enhanced' ? 'IA' : 'Pattern'}
                  </Badge>
                  <Badge variant="secondary">
                    {Math.round(analysis.tacit_renewal.confidence * 100)}% confiance
                  </Badge>
                </div>
              </div>
              
              {analysis.tacit_renewal.detected && contract.notice_period_days && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-orange-800 font-medium">
                        Préavis requis : {contract.notice_period_days} jours
                      </p>
                      <p className="text-orange-700 text-sm mt-1">
                        Vous devez notifier votre résiliation au moins {contract.notice_period_days} jours avant l'échéance.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Matching Results */}
      {analysis.pattern_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2 text-green-600" />
              Analyse par Pattern Matching
              <Badge variant="outline" className="ml-2">GRATUIT</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Confiance du pattern matching</span>
                <Badge variant={analysis.pattern_analysis.is_reliable ? 'default' : 'secondary'}>
                  {Math.round(analysis.pattern_analysis.confidence_score * 100)}%
                </Badge>
              </div>
              
              {analysis.pattern_analysis.result && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Résultats détectés :</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    {analysis.pattern_analysis.detected_tacit_renewal && (
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                        Tacite reconduction détectée par analyse de patterns
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!analysis.pattern_analysis.is_reliable && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-yellow-800 font-medium">Confiance faible</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        L'analyse par pattern matching n'est pas très fiable pour ce document. 
                        Une analyse IA pourrait donner de meilleurs résultats.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Complete */}
      {analysis.has_ai_analysis && analysis.ai_analysis && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Analyse IA Complète
              <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                PREMIUM
              </Badge>
            </CardTitle>
            {analysis.has_cached_ai_analysis && analysis.ai_analysis_cached_at && (
              <p className="text-sm text-gray-600">
                Analyse mise en cache le {formatDate(analysis.ai_analysis_cached_at)}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {/* Executive Summary */}
            {analysis.ai_analysis.resume_executif && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Résumé exécutif :</h4>
                <p className="text-gray-700 leading-relaxed bg-white rounded-lg p-4 border">
                  {analysis.ai_analysis.resume_executif}
                </p>
              </div>
            )}

            {/* Contract Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Type de contrat</label>
                  <p className="text-gray-900 font-medium">
                    {analysis.ai_analysis.type_contrat || 'Non déterminé'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Durée d'engagement</label>
                  <p className="text-gray-900 font-medium">
                    {analysis.ai_analysis.duree_engagement || 'Non spécifiée'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Préavis de résiliation</label>
                  <p className="text-gray-900 font-medium">
                    {analysis.ai_analysis.preavis_resiliation_jours 
                      ? `${analysis.ai_analysis.preavis_resiliation_jours} jours` 
                      : 'Non spécifié'
                    }
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date de début</label>
                  <p className="text-gray-900 font-medium">
                    {formatDate(analysis.ai_analysis.date_debut)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date de fin</label>
                  <p className="text-gray-900 font-medium">
                    {formatDate(analysis.ai_analysis.date_fin)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Montant</label>
                  <p className="text-gray-900 font-medium">
                    {formatCurrency(analysis.ai_analysis.montant)}
                  </p>
                </div>
              </div>
            </div>

            {/* Important Clauses */}
            {analysis.ai_analysis.clauses_importantes && analysis.ai_analysis.clauses_importantes.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Clauses importantes :</h4>
                <div className="space-y-2">
                  {analysis.ai_analysis.clauses_importantes.map((clause: string, index: number) => (
                    <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-amber-800 text-sm">{clause}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attention Points */}
            {analysis.ai_analysis.points_attention && analysis.ai_analysis.points_attention.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Points d'attention :</h4>
                <div className="space-y-2">
                  {analysis.ai_analysis.points_attention.map((point: string, index: number) => (
                    <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-orange-800 text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.ai_analysis.recommandations && analysis.ai_analysis.recommandations.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Recommandations :</h4>
                <div className="space-y-2">
                  {analysis.ai_analysis.recommandations.map((recommandation: string, index: number) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">{recommandation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
});

ContractAnalysisCard.displayName = 'ContractAnalysisCard';

// Export as default for easier lazy loading
export default ContractAnalysisCard;