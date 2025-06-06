import React, { useState, useEffect, Suspense } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useContract, useReanalyzeWithAi, useForceReanalyzeWithAi } from '@/hooks/useContracts';
import { useContractStatus } from '@/hooks/useContractStatus';
import { useContractActions } from '@/hooks/useContractActions';
import AppLayout from '@/layouts/app-layout';
import { Contract } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import AlertsDropdown from '@/components/AlertsDropdown';

// Lazy load the decomposed components
import { ContractHeader } from '@/components/contracts/ContractHeader';
import { ContractProcessingStatus } from '@/components/contracts/ContractProcessingStatus';
import { ContractActions } from '@/components/contracts/ContractActions';
import { ContractAnalysisCard } from '@/components/contracts/ContractAnalysisCard';
import { ContractCreditsInfo } from '@/components/contracts/ContractCreditsInfo';

// Use React.lazy for dynamic imports where beneficial
const LazyPdfViewer = React.lazy(() => import('@/components/ui/pdf-viewer'));

// Transform API data to unified Contract type
interface ApiContractResponse {
  data: {
    id: number;
    title: string;
    type: 'pro' | 'perso';
    category: string;
    status: string;
    ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
    ai_status: 'pending' | 'processing' | 'completed' | 'failed';
    file_original_name: string;
    amount: number;
    currency: string;
    start_date?: string | null;
    end_date?: string | null;
    next_renewal_date?: string | null;
    notice_period_days: number;
    is_tacit_renewal: boolean;
    has_ocr_text: boolean;
    has_ai_analysis: boolean;
    ocr_text_length?: number;
    ai_analysis?: any;
    alerts_count: number;
    created_at: string;
    updated_at: string;
    user?: {
      id: number;
      name: string;
      email: string;
    };
    alerts?: any[];
    links?: {
      download?: string;
      reprocess?: string;
      ocr_text?: string;
    };
  };
}

interface ShowProps {
  contract: ApiContractResponse;
}

const transformApiContract = (apiData: ApiContractResponse['data']): Contract => {
  return {
    id: apiData.id,
    org_id: 1, // TODO: Get from auth context
    user_id: apiData.user?.id || 1,
    title: apiData.title,
    type: apiData.type as 'pro' | 'perso',
    category: apiData.category as any,
    file_path: '',
    file_original_name: apiData.file_original_name,
    amount_cents: apiData.amount * 100,
    currency: apiData.currency,
    start_date: apiData.start_date,
    end_date: apiData.end_date,
    notice_period_days: apiData.notice_period_days,
    is_tacit_renewal: apiData.is_tacit_renewal,
    next_renewal_date: apiData.next_renewal_date,
    status: apiData.status as any,
    ocr_status: apiData.ocr_status,
    ai_status: apiData.ai_status,
    ocr_raw_text: apiData.has_ocr_text ? 'text exists' : null,
    ai_analysis: apiData.ai_analysis,
    ai_analysis_cached: null,
    ai_analysis_cached_at: null,
    processing_mode: 'enhanced',
    pattern_analysis_result: null,
    tacit_renewal_detected_by_pattern: false,
    pattern_confidence_score: null,
    created_at: apiData.created_at,
    updated_at: apiData.updated_at,
    user: apiData.user,
    alerts: apiData.alerts,
  };
};

export default function ShowRefactored({ contract: initialContractResponse }: ShowProps) {
  // Transform and memoize the initial contract
  const initialContract = React.useMemo(
    () => transformApiContract(initialContractResponse.data),
    [initialContractResponse.data]
  );
  
  // State management
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const queryClient = useQueryClient();
  
  // Contract status polling
  const { status: liveStatus, isPolling, forceStartPolling } = useContractStatus({
    contractId: initialContract.id,
    initialStatus: {
      id: initialContract.id,
      ocr_status: initialContract.ocr_status,
      ai_status: initialContract.ai_status,
      has_ocr_text: !!initialContract.ocr_raw_text,
      has_ai_analysis: !!initialContract.ai_analysis,
      updated_at: initialContract.updated_at,
    },
    pollInterval: 2000,
    stopPollingWhen: (status) => {
      const ocrDone = ['completed', 'failed', 'not_applicable'].includes(status.ocr_status);
      const aiDone = ['completed', 'failed', 'not_applicable', 'awaiting_ocr'].includes(status.ai_status);
      return ocrDone && aiDone;
    }
  });

  // Contract actions
  const { isProcessing, reprocessOCR, reprocessAI } = useContractActions({
    contractId: initialContract.id,
    onSuccess: handleRefresh,
    onStartPolling: forceStartPolling
  });

  // AI analysis mutations
  const reanalyzeMutation = useReanalyzeWithAi();
  const forceReanalyzeMutation = useForceReanalyzeWithAi();
  
  // React Query for contract data
  const { data: contract, refetch, isLoading } = useContract(initialContract.id, {
    initialData: initialContract,
    refetchInterval: false,
  });

  // Current contract with live status
  const currentContract = React.useMemo(() => {
    const base = contract || initialContract;
    return liveStatus ? {
      ...base,
      ocr_status: liveStatus.ocr_status as any,
      ai_status: liveStatus.ai_status as any,
      ocr_raw_text: liveStatus.has_ocr_text ? 'text exists' : null,
      ai_analysis: liveStatus.has_ai_analysis ? base.ai_analysis : null,
    } : base;
  }, [contract, initialContract, liveStatus]);

  // Effect to handle polling completion
  useEffect(() => {
    if (liveStatus && !isPolling) {
      const ocrDone = ['completed', 'failed', 'not_applicable'].includes(liveStatus.ocr_status);
      const aiDone = ['completed', 'failed', 'not_applicable', 'awaiting_ocr'].includes(liveStatus.ai_status);
      
      if (ocrDone && aiDone) {
        queryClient.invalidateQueries({ queryKey: ['contracts', initialContract.id] });
        refetch();
      }
    }
  }, [liveStatus, isPolling, queryClient, initialContract.id, refetch]);

  // Event handlers
  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['contracts', initialContract.id] });
      await refetch();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }

  const handleAiAnalysis = React.useCallback(async () => {
    try {
      const result = await reanalyzeMutation.mutateAsync({ id: initialContract.id });
      
      if (result.has_cached_analysis) {
        setShowForceConfirm(true);
        return;
      }
      
      if (result.credit_consumed) {
        toast.success('Analyse IA terminée ! 1 crédit consommé.');
        refetch();
      }
    } catch (error: any) {
      if (error.message.includes('402')) {
        toast.error('Crédits IA insuffisants. Veuillez upgrader votre plan.');
        router.visit('/settings/credits');
      } else {
        toast.error('Erreur lors de l\'analyse IA');
      }
    }
  }, [initialContract.id, reanalyzeMutation, refetch]);

  const handleForceReanalyze = React.useCallback(async () => {
    try {
      await forceReanalyzeMutation.mutateAsync({ id: initialContract.id });
      toast.success('Nouvelle analyse IA effectuée ! 1 crédit consommé.');
      setShowForceConfirm(false);
      refetch();
    } catch (error: any) {
      if (error.message.includes('402')) {
        toast.error('Crédits IA insuffisants.');
        router.visit('/settings/credits');
      } else {
        toast.error('Erreur lors de l\'analyse IA');
      }
    }
  }, [initialContract.id, forceReanalyzeMutation, refetch]);

  const handleViewOcrText = React.useCallback(() => {
    router.visit(`/contracts/${currentContract.id}/ocr`);
  }, [currentContract.id]);

  const handleEdit = React.useCallback(() => {
    router.visit(`/contracts/${currentContract.id}/edit`);
  }, [currentContract.id]);

  const handleDelete = React.useCallback(() => {
    // TODO: Implement delete functionality
    console.log('Delete contract:', currentContract.id);
  }, [currentContract.id]);

  const handleDownload = React.useCallback(() => {
    if (initialContractResponse.data.links?.download) {
      window.open(initialContractResponse.data.links.download, '_blank');
    }
  }, [initialContractResponse.data.links?.download]);

  const handleReprocess = React.useCallback(() => {
    // TODO: Implement reprocess functionality
    console.log('Reprocess contract:', currentContract.id);
  }, [currentContract.id]);

  const handleRetry = React.useCallback((type: 'ocr' | 'ai') => {
    if (type === 'ocr') {
      reprocessOCR();
    } else {
      reprocessAI();
    }
  }, [reprocessOCR, reprocessAI]);

  // Get analysis data (mock for now)
  const analysisData = React.useMemo(() => {
    return initialContractResponse.data.ai_analysis ? {
      ...initialContractResponse.data,
      has_ai_analysis: initialContractResponse.data.has_ai_analysis,
      ai_analysis: initialContractResponse.data.ai_analysis,
    } : undefined;
  }, [initialContractResponse.data]);

  // Get user credits (mock for now)
  const userCredits = React.useMemo(() => {
    // TODO: Get from actual user context
    return {
      remaining: 5,
      monthly_limit: 10,
      used_this_month: 5,
      total_used: 25,
      subscription_plan: 'premium' as const
    };
  }, []);

  return (
    <AppLayout>
      <Head title={`Contrat - ${currentContract.title}`} />
      
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              href="/contracts"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour aux contrats
            </Link>
          </div>

          {/* Contract Header */}
          <div className="mb-8">
            <ContractHeader
              contract={currentContract}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onReprocess={handleReprocess}
              isOwner={true}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main Column */}
            <div className="xl:col-span-2 space-y-8">
              {/* Processing Status */}
              <ContractProcessingStatus
                contract={currentContract}
                onRetry={handleRetry}
                onViewOcrText={handleViewOcrText}
                onForceReanalyze={handleForceReanalyze}
              />

              {/* Reprocessing Actions */}
              <ContractActions
                contract={currentContract}
                onReprocessOcr={reprocessOCR}
                onReprocessAi={reprocessAI}
                isProcessing={isProcessing}
                canReprocessOcr={currentContract.ocr_status === 'failed' || currentContract.ocr_status === 'completed'}
                canReprocessAi={currentContract.ai_status === 'failed' || currentContract.ai_status === 'completed'}
              />

              {/* Analysis Results */}
              {analysisData && (
                <ContractAnalysisCard
                  contract={currentContract}
                  analysis={analysisData}
                  onViewOcrText={handleViewOcrText}
                />
              )}

              {/* PDF Viewer (lazy loaded) */}
              {initialContractResponse.data.links?.download && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Aperçu du document
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-md" />}>
                      <LazyPdfViewer 
                        url={initialContractResponse.data.links.download} 
                        className="h-96"
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Credits and AI Actions */}
              <ContractCreditsInfo
                contract={currentContract}
                userCredits={userCredits}
                analysis={analysisData}
                onAiAnalysis={handleAiAnalysis}
                onForceReanalyze={handleForceReanalyze}
                showForceConfirm={showForceConfirm}
                onShowForceConfirm={setShowForceConfirm}
                isAnalyzing={reanalyzeMutation.isPending}
                isForcingReanalyze={forceReanalyzeMutation.isPending}
                canUseAi={userCredits.remaining > 0}
              />

              {/* Contract Information Summary */}
              <Card className="border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Informations clés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-500">Type</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {currentContract.type === 'pro' ? 'Professionnel' : 'Personnel'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-500">Catégorie</span>
                      <span className="text-sm font-semibold text-gray-900">{currentContract.category}</span>
                    </div>
                    {currentContract.amount_cents && currentContract.amount_cents > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">Montant</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: currentContract.currency,
                          }).format(currentContract.amount_cents / 100)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-500">Préavis</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {currentContract.notice_period_days} jours
                      </span>
                    </div>
                    {currentContract.next_renewal_date && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-500">Échéance</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDate(currentContract.next_renewal_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Alerts */}
              {currentContract.alerts && (
                <AlertsDropdown
                  alerts={currentContract.alerts}
                  alertsCount={currentContract.alerts.length}
                  onViewAll={() => router.visit('/alerts')}
                />
              )}

              {/* Metadata */}
              <Card className="border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Métadonnées</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-500 mb-1">Fichier original</div>
                    <div className="font-mono text-xs bg-gray-50 rounded px-2 py-1 break-all">
                      {currentContract.file_original_name}
                    </div>
                  </div>
                  {currentContract.user && (
                    <div>
                      <div className="font-medium text-gray-500 mb-1">Ajouté par</div>
                      <div className="text-gray-900">{currentContract.user.name}</div>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-500 mb-1">Créé le</div>
                    <div className="text-gray-900">{formatDate(currentContract.created_at)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500 mb-1">Dernière modification</div>
                    <div className="text-gray-900">{formatDate(currentContract.updated_at)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="mt-8 flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              <RefreshCw 
                className={`h-4 w-4 mr-2 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} 
              />
              Actualiser
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}