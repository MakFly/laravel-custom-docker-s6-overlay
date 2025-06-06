import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Zap, RefreshCw, Brain } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Contract } from '@/types/api';

interface UserCredits {
  remaining: number;
  monthly_limit: number;
  used_this_month: number;
  total_used: number;
  subscription_plan: 'basic' | 'premium';
}

interface ContractCreditsInfoProps {
  contract: Contract;
  userCredits?: UserCredits;
  analysis?: any; // TODO: Define proper analysis type
  onAiAnalysis?: () => void;
  onForceReanalyze?: () => void;
  showForceConfirm?: boolean;
  onShowForceConfirm?: (show: boolean) => void;
  isAnalyzing?: boolean;
  isForcingReanalyze?: boolean;
  canUseAi?: boolean;
}

export const ContractCreditsInfo = React.memo(({
  contract,
  userCredits,
  analysis,
  onAiAnalysis,
  onForceReanalyze,
  showForceConfirm = false,
  onShowForceConfirm,
  isAnalyzing = false,
  isForcingReanalyze = false,
  canUseAi = true
}: ContractCreditsInfoProps) => {
  return (
    <div className="space-y-6">
      {/* Credits Status */}
      {userCredits && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Crédits IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {userCredits.remaining}
                </div>
                <p className="text-sm text-gray-600">
                  sur {userCredits.monthly_limit} ce mois
                </p>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ 
                    width: `${(userCredits.remaining / userCredits.monthly_limit) * 100}%` 
                  }}
                />
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <div>Plan : {userCredits.subscription_plan === 'premium' ? 'Premium' : 'Basic'}</div>
                <div>Utilisés ce mois : {userCredits.used_this_month}</div>
                <div>Total utilisés : {userCredits.total_used}</div>
              </div>
              
              {userCredits.remaining === 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/settings/credits">
                    <Zap className="h-4 w-4 mr-2" />
                    Acheter des crédits
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Actions */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analyse IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!analysis.has_ai_analysis ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Obtenez une analyse approfondie avec l'IA pour détecter tous les détails importants.
                </p>
                
                <Button
                  onClick={onAiAnalysis}
                  disabled={isAnalyzing || !canUseAi}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Lancer l'IA (1 crédit)
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <AlertDialog open={showForceConfirm} onOpenChange={onShowForceConfirm}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={!canUseAi}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nouvelle analyse IA
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Nouvelle analyse IA</AlertDialogTitle>
                    <AlertDialogDescription>
                      Une analyse IA récente existe déjà pour ce contrat. 
                      Êtes-vous sûr de vouloir en créer une nouvelle ? 
                      Cela consommera 1 crédit IA.
                      <br /><br />
                      <strong>Crédits restants : {userCredits?.remaining || 0}</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onForceReanalyze}
                      disabled={isForcingReanalyze}
                    >
                      {isForcingReanalyze ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Analyse...
                        </>
                      ) : (
                        'Confirmer (1 crédit)'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      )}

      {/* OCR Quality Info */}
      {analysis?.ocr_metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Qualité OCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Confiance</span>
                <Badge variant={analysis.ocr_metadata.confidence >= 70 ? 'default' : 'secondary'}>
                  {analysis.ocr_metadata.confidence}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Méthode</span>
                <span className="text-sm font-medium">{analysis.ocr_metadata.method_used}</span>
              </div>
              {analysis.ocr_metadata.processing_time && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Temps</span>
                  <span className="text-sm font-medium">{analysis.ocr_metadata.processing_time}s</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

ContractCreditsInfo.displayName = 'ContractCreditsInfo';

// Alternative: Also export as default for easier lazy loading
export default ContractCreditsInfo;