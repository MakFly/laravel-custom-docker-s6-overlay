import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from "@/components/ui/alert-dialog";
import { 
    Edit, 
    Download, 
    RotateCcw, 
    FileText,
    Brain,
    AlertTriangle,
    RefreshCw,
    Calendar,
    DollarSign,
    Settings,
    User,
    ArrowLeft,
    Sparkles,
    Zap,
    CreditCard,
    Search,
    Shield,
    Clock,
    TrendingUp,
    CheckCircle
} from 'lucide-react';
import { useContract, useReanalyzeWithAi, useForceReanalyzeWithAi } from '@/hooks/useContracts';
import { useContractStatus } from '@/hooks/useContractStatus';
import { useContractActions } from '@/hooks/useContractActions';
import { ProcessingStatus } from '@/components/contracts/ProcessingStatus';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { ContractUnified, normalizeToContractUnified } from '@/types/contract-unified';
import AlertsDropdown from '@/components/AlertsDropdown';
import { 
    AlertsSkeleton, 
    CreditsSkeleton, 
    OcrMetadataSkeleton, 
    ContractInfoSkeleton,
    AiActionsSkeleton 
} from '@/components/LoadingSkeletons';

// Interface temporaire pour matcher l'API actuelle
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
        ai_analysis?: {
            type_contrat?: string;
            reconduction_tacite?: boolean;
            duree_engagement?: string;
            preavis_resiliation_jours?: number;
            date_debut?: string;
            date_fin?: string;
            montant?: number;
            frequence_paiement?: string;
            conditions_resiliation?: string[];
            clauses_importantes?: string[];
            confidence_score?: number;
        };
        alerts_count: number;
        alert_type?: string;
        needs_alert?: boolean;
        status_color?: string;
        is_expiring: boolean;
        days_until_renewal?: number | null;
        created_at: string;
        updated_at: string;
        user?: {
            id: number;
            name: string;
            email: string;
        };
        alerts?: {
            id: number;
            type: string;
            type_label: string;
            status: string;
            message: string;
            scheduled_for: string;
        }[];
        clauses?: {
            id: number;
            title: string;
            content: string;
        }[];
        links?: {
            self?: string;
            download?: string;
            reprocess?: string;
            analysis?: string;
            ocr_text?: string;
        };
    };
    meta?: {
        version: string;
        timestamp: string;
    };
}

interface ShowProps {
    contract: ApiContractResponse;
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
    return new Date(dateString).toLocaleDateString('fr-FR');
};

// Fonction pour transformer les données API vers ContractUnified
const transformApiToUnified = (apiData: ApiContractResponse['data']): ContractUnified => {
    return normalizeToContractUnified({
        ...apiData,
        // Transformer les links vers urls
        urls: {
            show: `/contracts/${apiData.id}`,
            edit: `/contracts/${apiData.id}/edit`,
            download: apiData.links?.download || `/api/contracts/${apiData.id}/download`,
            reprocess_ocr: apiData.links?.reprocess || `/api/contracts/${apiData.id}/reprocess`,
            reprocess_ai: `/api/contracts/${apiData.id}/reanalyze`,
            alerts_list: `/contracts/${apiData.id}/alerts`, // si cette route existe
        },
        // Ajouter les permissions basées sur l'état du contrat
        permissions: {
            can_view_details: true,
            can_edit: true, // Ou basé sur le rôle utilisateur
            can_delete: true, // Ou basé sur le rôle utilisateur
            can_download_file: !!apiData.links?.download,
            can_reprocess_ocr: apiData.ocr_status === 'failed' || apiData.ocr_status === 'completed',
            can_reprocess_ai: apiData.ai_status === 'failed' || apiData.ai_status === 'completed',
            can_manage_alerts: true,
        },
        // Mapper status_color vers status_visual_indicator
        status_visual_indicator: (apiData.status_color as 'green' | 'yellow' | 'red' | 'gray' | 'blue') || 'gray',
        // Assurer les champs requis pour les alertes
        alerts: apiData.alerts || [],
        alerts_count: apiData.alerts_count || (apiData.alerts ? apiData.alerts.length : 0),
        active_alerts_count: apiData.alerts?.filter(alert => alert.status === 'pending').length || 0,
    });
};

export default function Show({ contract: initialContractResponse }: ShowProps) {
    // Transformer les données API vers ContractUnified
    const initialContract = transformApiToUnified(initialContractResponse.data);
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showForceConfirm, setShowForceConfirm] = useState(false);
    const queryClient = useQueryClient();
    
    // Hook pour le polling des statuts OCR/AI si nécessaire
    const { status: liveStatus, isPolling, forceStartPolling } = useContractStatus({
        contractId: initialContract.id,
        initialStatus: {
            id: initialContract.id,
            ocr_status: initialContract.ocr_status,
            ai_status: initialContract.ai_status,
            has_ocr_text: initialContract.has_ocr_text,
            has_ai_analysis: initialContract.has_ai_analysis,
            updated_at: initialContract.updated_at,
        },
        pollInterval: 2000, // 2 secondes pour la page détail (plus réactif)
        stopPollingWhen: (status) => {
            const ocrDone = ['completed', 'failed', 'not_applicable'].includes(status.ocr_status);
            const aiDone = ['completed', 'failed', 'not_applicable', 'awaiting_ocr'].includes(status.ai_status);
            return ocrDone && aiDone;
        }
    });

    // Hook pour les actions de retraitement
    const { isProcessing, reprocessOCR, reprocessAI } = useContractActions({
        contractId: initialContract.id,
        onSuccess: () => {
            handleRefresh();
        },
        onStartPolling: () => {
            forceStartPolling(); // Forcer le démarrage du polling après retraitement
        }
    });

    // Hooks pour l'IA avec gestion des crédits
    const reanalyzeMutation = useReanalyzeWithAi();
    const forceReanalyzeMutation = useForceReanalyzeWithAi();
    
    // Utiliser React Query pour le contract (avec les données initiales)
    const { data: contract, refetch, isLoading } = useContract(initialContract.id, {
        initialData: initialContract,
        refetchInterval: false, // Pas d'auto-refetch, on gère manuellement
    });

    // Utiliser le contrat live ou celui de React Query
    const currentContract = contract || initialContract;
    
    // Mettre à jour les statuts avec les données live si disponibles
    const contractWithLiveStatus = liveStatus ? {
        ...currentContract,
        ocr_status: liveStatus.ocr_status as 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable' | 'awaiting_ocr',
        ai_status: liveStatus.ai_status as 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable' | 'awaiting_ocr',
        has_ocr_text: liveStatus.has_ocr_text,
        has_ai_analysis: liveStatus.has_ai_analysis,
    } : currentContract;



    // Invalider le cache React Query quand les jobs sont terminés pour forcer un refetch complet
    useEffect(() => {
        if (liveStatus) {
            const ocrDone = ['completed', 'failed', 'not_applicable'].includes(liveStatus.ocr_status);
            const aiDone = ['completed', 'failed', 'not_applicable', 'awaiting_ocr'].includes(liveStatus.ai_status);
            
            if (ocrDone && aiDone && !isPolling) {
                // Les jobs sont terminés et le polling s'est arrêté, invalider le cache et refetch
                queryClient.invalidateQueries({ queryKey: ['contracts', initialContract.id] });
                refetch();
            }
        }
    }, [liveStatus, isPolling, queryClient, initialContract.id, refetch]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Invalider le cache et forcer un refetch complet
            await queryClient.invalidateQueries({ queryKey: ['contracts', initialContract.id] });
            await refetch();
        } catch (error) {
            console.error('Erreur lors de l\'actualisation:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Fonctions pour l'analyse IA
    const handleAiAnalysis = async () => {
        try {
            const result = await reanalyzeMutation.mutateAsync({ id: initialContract.id });
            
            if (result.has_cached_analysis) {
                // L'utilisateur a déjà une analyse, proposer de la remplacer
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
    };

    const handleForceReanalyze = async () => {
        try {
            const result = await forceReanalyzeMutation.mutateAsync({ id: initialContract.id });
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
    };

    const getConfidenceColor = (score?: number) => {
        if (!score) return 'text-gray-500';
        if (score >= 0.8) return 'text-green-600';
        if (score >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getConfidenceLabel = (score?: number) => {
        if (!score) return 'Non disponible';
        if (score >= 0.8) return 'Élevée';
        if (score >= 0.6) return 'Moyenne';
        return 'Faible';
    };



    return (
        <AppLayout>
            <Head title={`Contrat - ${currentContract.title}`} />
            <Toaster 
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        style: {
                            background: '#10b981',
                        },
                    },
                    error: {
                        style: {
                            background: '#ef4444',
                        },
                    },
                    loading: {
                        style: {
                            background: '#3b82f6',
                        },
                    },
                }}
            />
            
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

                    {/* Header avec titre et actions */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
                        <div className="px-6 py-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                                {/* Titre et infos principales */}
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                                        {contractWithLiveStatus.title}
                                    </h1>
                                    
                                    {/* Meta info */}
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center">
                                            <FileText className="w-4 h-4 mr-1" />
                                            {contractWithLiveStatus.file_original_name}
                                        </div>
                                        {contractWithLiveStatus.user && (
                                            <div className="flex items-center">
                                                <User className="w-4 h-4 mr-1" />
                                                Ajouté par {contractWithLiveStatus.user.name}
                                            </div>
                                        )}
                                        <div className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            {formatDate(contractWithLiveStatus.created_at)}
                                        </div>
                                    </div>

                                    {/* Badges de statut */}
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <Badge variant={contractWithLiveStatus.type === 'pro' ? 'default' : 'secondary'}>
                                            {contractWithLiveStatus.type === 'pro' ? 'Professionnel' : 'Personnel'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {contractWithLiveStatus.category}
                                        </Badge>
                                        <Badge 
                                            variant={
                                                contractWithLiveStatus.status === 'active' ? 'default' : 
                                                contractWithLiveStatus.status === 'expired' ? 'destructive' : 'secondary'
                                            }
                                        >
                                            {contractWithLiveStatus.status === 'active' ? 'Actif' : 
                                             contractWithLiveStatus.status === 'expired' ? 'Expiré' : 
                                             contractWithLiveStatus.status === 'cancelled' ? 'Annulé' :
                                             contractWithLiveStatus.status === 'pending_activation' ? 'En attente' : 
                                             'Archivé'}
                                        </Badge>
                                        
                                        {/* Alertes critiques */}
                                        {contractWithLiveStatus.is_tacit_renewal && (
                                            <Badge variant="destructive">
                                                <AlertTriangle className="w-4 h-4 mr-1" />
                                                Reconduction tacite
                                            </Badge>
                                        )}
                                        
                                        {contractWithLiveStatus.days_until_renewal !== undefined && 
                                         contractWithLiveStatus.days_until_renewal !== null && 
                                         contractWithLiveStatus.days_until_renewal <= 30 && (
                                            <Badge variant="secondary" className="text-orange-700 bg-orange-50 border-orange-200">
                                                {contractWithLiveStatus.days_until_renewal > 0 
                                                    ? `Expire dans ${contractWithLiveStatus.days_until_renewal} jour${contractWithLiveStatus.days_until_renewal > 1 ? 's' : ''}` 
                                                    : 'Expiré'
                                                }
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Infos financières et échéances */}
                                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                                        {contractWithLiveStatus.amount > 0 && (
                                            <div className="flex items-center font-medium">
                                                <DollarSign className="w-4 h-4 mr-1" />
                                                {formatAmount(contractWithLiveStatus.amount, contractWithLiveStatus.currency)}
                                            </div>
                                        )}
                                        <div className="flex items-center">
                                            <Settings className="w-4 h-4 mr-1" />
                                            Préavis {contractWithLiveStatus.notice_period_days} jours
                                        </div>
                                        {contractWithLiveStatus.next_renewal_date && (
                                            <div className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-1" />
                                                Échéance {formatDate(contractWithLiveStatus.next_renewal_date)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-3 mt-6 lg:mt-0 lg:ml-6">
                                    <Button 
                                        variant="outline" 
                                        onClick={handleRefresh}
                                        disabled={isRefreshing || isLoading}
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
                                        Actualiser
                                    </Button>
                                    
                                    {contractWithLiveStatus.permissions.can_edit && (
                                        <Button variant="outline" asChild>
                                            <Link href={contractWithLiveStatus.urls.edit || `/contracts/${currentContract.id}/edit`}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Modifier
                                            </Link>
                                        </Button>
                                    )}
                                    
                                    {contractWithLiveStatus.permissions.can_download_file && (
                                        <Button asChild>
                                            <a href={contractWithLiveStatus.urls.download} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4 mr-2" />
                                                Télécharger
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contenu principal */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Colonne principale */}
                        <div className="xl:col-span-2 space-y-8">
                            
                            {/* État du traitement */}
                            <ProcessingStatus
                                ocrStatus={contractWithLiveStatus.ocr_status}
                                aiStatus={contractWithLiveStatus.ai_status}
                                hasOcrText={contractWithLiveStatus.has_ocr_text}
                                hasAiAnalysis={contractWithLiveStatus.has_ai_analysis}
                                isPolling={isPolling}
                            />

                            {/* Actions de retraitement */}
                            {(contractWithLiveStatus.permissions.can_reprocess_ocr || contractWithLiveStatus.permissions.can_reprocess_ai) && (
                                <Card className="border-gray-200">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Actions de retraitement</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap gap-3">
                                                {contractWithLiveStatus.permissions.can_reprocess_ocr && (
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={reprocessOCR}
                                                        disabled={contractWithLiveStatus.ocr_status === 'processing' || isProcessing.ocr}
                                                    >
                                                        <RotateCcw className={`h-4 w-4 mr-2 ${isProcessing.ocr ? 'animate-spin' : ''}`} />
                                                        {isProcessing.ocr ? 'Traitement...' : 'Retraiter OCR'}
                                                    </Button>
                                                )}
                                                
                                                {contractWithLiveStatus.permissions.can_reprocess_ai && contractWithLiveStatus.ocr_status === 'completed' && (
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={reprocessAI}
                                                        disabled={contractWithLiveStatus.ai_status === 'processing' || isProcessing.ai}
                                                    >
                                                        <Brain className={`h-4 w-4 mr-2 ${isProcessing.ai ? 'animate-spin' : ''}`} />
                                                        {isProcessing.ai ? 'Traitement...' : 'Retraiter IA'}
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            {/* Progress bars */}
                                            {(isProcessing.ocr || isProcessing.ai) && (
                                                <div className="space-y-2">
                                                    {isProcessing.ocr && (
                                                        <div className="space-y-1">
                                                            <div className="text-sm text-gray-600">Retraitement OCR en cours...</div>
                                                            <Progress value={undefined} className="w-full" />
                                                        </div>
                                                    )}
                                                    {isProcessing.ai && (
                                                        <div className="space-y-1">
                                                            <div className="text-sm text-gray-600">Retraitement IA en cours...</div>
                                                            <Progress value={undefined} className="w-full" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Résultats OCR */}
                            {contractWithLiveStatus.has_ocr_text && (
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
                                                <strong>{initialContractResponse.data.ocr_text_length}</strong> caractères extraits du document
                                            </div>
                                        </div>
                                        <Button variant="outline" asChild>
                                            <Link href={`/contracts/${currentContract.id}/ocr`}>
                                                <FileText className="h-4 w-4 mr-2" />
                                                Voir le texte complet
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Analyse complète - Pattern + IA */}
                            {(currentContract as any)?.analysis && (
                                <>
                                    {/* Analyse de Tacite Reconduction */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center">
                                                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                                                Tacite Reconduction
                                                <Badge variant={(currentContract as any).analysis.tacit_renewal.detected ? 'destructive' : 'default'} className="ml-2">
                                                    {(currentContract as any).analysis.tacit_renewal.detected ? 'DÉTECTÉE' : 'NON DÉTECTÉE'}
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        {(currentContract as any).analysis.tacit_renewal.detected ? (
                                                            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                                        )}
                                                        <span className={(currentContract as any).analysis.tacit_renewal.detected ? 'text-red-700 font-medium' : 'text-green-700 font-medium'}>
                                                            {(currentContract as any).analysis.tacit_renewal.detected ? 'Tacite reconduction activée' : 'Pas de tacite reconduction'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Badge variant="outline">
                                                            {(currentContract as any).analysis.tacit_renewal.source === 'ai_enhanced' ? 'IA' : 'Pattern'}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {Math.round((currentContract as any).analysis.tacit_renewal.confidence * 100)}% confiance
                                                        </Badge>
                                                    </div>
                                                </div>
                                                
                                                {(currentContract as any).analysis.tacit_renewal.detected && contractWithLiveStatus.notice_period_days && (
                                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                        <div className="flex items-start">
                                                            <Clock className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
                                                            <div>
                                                                <p className="text-orange-800 font-medium">
                                                                    Préavis requis : {contractWithLiveStatus.notice_period_days} jours
                                                                </p>
                                                                <p className="text-orange-700 text-sm mt-1">
                                                                    Vous devez notifier votre résiliation au moins {contractWithLiveStatus.notice_period_days} jours avant l'échéance.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Résultats Pattern Matching */}
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
                                                    <Badge variant={(currentContract as any).analysis.pattern_analysis.is_reliable ? 'default' : 'secondary'}>
                                                        {Math.round((currentContract as any).analysis.pattern_analysis.confidence_score * 100)}%
                                                    </Badge>
                                                </div>
                                                
                                                {(currentContract as any).analysis.pattern_analysis.result && (
                                                    <div className="bg-gray-50 rounded-lg p-4">
                                                        <h4 className="font-medium text-gray-900 mb-2">Résultats détectés :</h4>
                                                        <div className="space-y-2 text-sm text-gray-700">
                                                            {(currentContract as any).analysis.pattern_analysis.detected_tacit_renewal && (
                                                                <div className="flex items-center">
                                                                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                                                                    Tacite reconduction détectée par analyse de patterns
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {!(currentContract as any).analysis.pattern_analysis.is_reliable && (
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

                                    {/* Analyse IA complète */}
                                    {(currentContract as any).analysis.has_ai_analysis && (currentContract as any).analysis.ai_analysis && (
                                        <Card className="border-purple-200 bg-purple-50/30">
                                            <CardHeader>
                                                <CardTitle className="flex items-center">
                                                    <Brain className="h-5 w-5 mr-2 text-purple-600" />
                                                    Analyse IA Complète
                                                    <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                                                        PREMIUM
                                                    </Badge>
                                                </CardTitle>
                                                {(currentContract as any).analysis.has_cached_ai_analysis && (currentContract as any).analysis.ai_analysis_cached_at && (
                                                    <p className="text-sm text-gray-600">
                                                        Analyse mise en cache le {new Date((currentContract as any).analysis.ai_analysis_cached_at).toLocaleDateString('fr-FR')}
                                                    </p>
                                                )}
                                            </CardHeader>
                                            <CardContent>
                                                {(currentContract as any).analysis.ai_analysis.resume_executif && (
                                                    <div className="mb-6">
                                                        <h4 className="font-medium text-gray-900 mb-2">Résumé exécutif :</h4>
                                                        <p className="text-gray-700 leading-relaxed bg-white rounded-lg p-4 border">
                                                            {(currentContract as any).analysis.ai_analysis.resume_executif}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Type de contrat</label>
                                                            <p className="text-gray-900 font-medium">
                                                                {(currentContract as any).analysis.ai_analysis.type_contrat || 'Non déterminé'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Durée d'engagement</label>
                                                            <p className="text-gray-900 font-medium">
                                                                {(currentContract as any).analysis.ai_analysis.duree_engagement || 'Non spécifiée'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Préavis de résiliation</label>
                                                            <p className="text-gray-900 font-medium">
                                                                {(currentContract as any).analysis.ai_analysis.preavis_resiliation_jours ? 
                                                                    `${(currentContract as any).analysis.ai_analysis.preavis_resiliation_jours} jours` : 
                                                                    'Non spécifié'
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Date de début</label>
                                                            <p className="text-gray-900 font-medium">
                                                                {formatDate((currentContract as any).analysis.ai_analysis.date_debut)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Date de fin</label>
                                                            <p className="text-gray-900 font-medium">
                                                                {formatDate((currentContract as any).analysis.ai_analysis.date_fin)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Montant</label>
                                                            <p className="text-gray-900 font-medium">
                                                                {formatAmount((currentContract as any).analysis.ai_analysis.montant)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Clauses importantes */}
                                                {(currentContract as any).analysis.ai_analysis.clauses_importantes && (currentContract as any).analysis.ai_analysis.clauses_importantes.length > 0 && (
                                                    <div className="mt-6">
                                                        <h4 className="font-medium text-gray-900 mb-3">Clauses importantes :</h4>
                                                        <div className="space-y-2">
                                                            {(currentContract as any).analysis.ai_analysis.clauses_importantes.map((clause: string, index: number) => (
                                                                <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                                    <p className="text-amber-800 text-sm">{clause}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Points d'attention */}
                                                {(currentContract as any).analysis.ai_analysis.points_attention && (currentContract as any).analysis.ai_analysis.points_attention.length > 0 && (
                                                    <div className="mt-6">
                                                        <h4 className="font-medium text-gray-900 mb-3">Points d'attention :</h4>
                                                        <div className="space-y-2">
                                                            {(currentContract as any).analysis.ai_analysis.points_attention.map((point: string, index: number) => (
                                                                <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                                    <p className="text-orange-800 text-sm">{point}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Recommandations */}
                                                {(currentContract as any).analysis.ai_analysis.recommandations && (currentContract as any).analysis.ai_analysis.recommandations.length > 0 && (
                                                    <div className="mt-6">
                                                        <h4 className="font-medium text-gray-900 mb-3">Recommandations :</h4>
                                                        <div className="space-y-2">
                                                            {(currentContract as any).analysis.ai_analysis.recommandations.map((recommandation: string, index: number) => (
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
                                </>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* État des crédits */}
                            {isLoading ? (
                                <CreditsSkeleton />
                            ) : (currentContract as any)?.user_credits ? (
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
                                                    {(currentContract as any).user_credits.remaining}
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    sur {(currentContract as any).user_credits.monthly_limit} ce mois
                                                </p>
                                            </div>
                                            
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                                    style={{ 
                                                        width: `${((currentContract as any).user_credits.remaining / (currentContract as any).user_credits.monthly_limit) * 100}%` 
                                                    }}
                                                ></div>
                                            </div>
                                            
                                            <div className="text-xs text-gray-500 space-y-1">
                                                <div>Plan : {(currentContract as any).user_credits.subscription_plan === 'premium' ? 'Premium' : 'Basic'}</div>
                                                <div>Utilisés ce mois : {(currentContract as any).user_credits.used_this_month}</div>
                                                <div>Total utilisés : {(currentContract as any).user_credits.total_used}</div>
                                            </div>
                                            
                                            {(currentContract as any).user_credits.remaining === 0 && (
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
                            ) : null}

                            {/* Actions IA */}
                            {isLoading ? (
                                <AiActionsSkeleton />
                            ) : (currentContract as any)?.analysis ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Analyse IA</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {!(currentContract as any).analysis.has_ai_analysis ? (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-600">
                                                    Obtenez une analyse approfondie avec l'IA pour détecter tous les détails importants.
                                                </p>
                                                
                                                <Button
                                                    onClick={handleAiAnalysis}
                                                    disabled={reanalyzeMutation.isPending || !(currentContract as any).can_use_ai}
                                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                                >
                                                    {reanalyzeMutation.isPending ? (
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
                                            <AlertDialog open={showForceConfirm} onOpenChange={setShowForceConfirm}>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        className="w-full"
                                                        disabled={!(currentContract as any).can_use_ai}
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
                                                            <strong>Crédits restants : {(currentContract as any)?.user_credits?.remaining || 0}</strong>
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={handleForceReanalyze}
                                                            disabled={forceReanalyzeMutation.isPending}
                                                        >
                                                            {forceReanalyzeMutation.isPending ? (
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
                            ) : null}

                            {/* Informations OCR */}
                            {isLoading ? (
                                <OcrMetadataSkeleton />
                            ) : (currentContract as any)?.analysis?.ocr_metadata ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Qualité OCR</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Confiance</span>
                                                <Badge variant={(currentContract as any).analysis.ocr_metadata.confidence >= 70 ? 'default' : 'secondary'}>
                                                    {(currentContract as any).analysis.ocr_metadata.confidence}%
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Méthode</span>
                                                <span className="text-sm font-medium">{(currentContract as any).analysis.ocr_metadata.method_used}</span>
                                            </div>
                                            {(currentContract as any).analysis.ocr_metadata.processing_time && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Temps</span>
                                                    <span className="text-sm font-medium">{(currentContract as any).analysis.ocr_metadata.processing_time}s</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : null}

                            {/* Résumé des informations */}
                            {isLoading ? (
                                <ContractInfoSkeleton />
                            ) : (
                                <Card className="border-gray-200">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold">Informations clés</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-500">Type</span>
                                                <Badge variant={contractWithLiveStatus.type === 'pro' ? 'default' : 'secondary'}>
                                                    {contractWithLiveStatus.type === 'pro' ? 'Professionnel' : 'Personnel'}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-500">Catégorie</span>
                                                <span className="text-sm font-semibold text-gray-900">{contractWithLiveStatus.category}</span>
                                            </div>
                                            {contractWithLiveStatus.amount > 0 && (
                                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <span className="text-sm font-medium text-gray-500">Montant</span>
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {formatAmount(contractWithLiveStatus.amount, contractWithLiveStatus.currency)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-500">Préavis</span>
                                                <span className="text-sm font-semibold text-gray-900">{contractWithLiveStatus.notice_period_days} jours</span>
                                            </div>
                                            {contractWithLiveStatus.next_renewal_date && (
                                                <div className="flex justify-between items-center py-2">
                                                    <span className="text-sm font-medium text-gray-500">Échéance</span>
                                                    <span className="text-sm font-semibold text-gray-900">{formatDate(contractWithLiveStatus.next_renewal_date)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Alertes */}
                            {isLoading ? (
                                <AlertsSkeleton />
                            ) : (
                                <AlertsDropdown
                                    alerts={contractWithLiveStatus.alerts || []}
                                    alertsCount={contractWithLiveStatus.alerts_count}
                                    onViewAll={() => router.visit('/alerts')}
                                />
                            )}

                            {/* Métadonnées */}
                            <Card className="border-gray-200">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg font-semibold">Métadonnées</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <div className="font-medium text-gray-500 mb-1">Fichier original</div>
                                        <div className="font-mono text-xs bg-gray-50 rounded px-2 py-1 break-all">
                                            {contractWithLiveStatus.file_original_name}
                                        </div>
                                    </div>
                                    {contractWithLiveStatus.user && (
                                        <div>
                                            <div className="font-medium text-gray-500 mb-1">Ajouté par</div>
                                            <div className="text-gray-900">{contractWithLiveStatus.user.name}</div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium text-gray-500 mb-1">Créé le</div>
                                        <div className="text-gray-900">{formatDate(contractWithLiveStatus.created_at)}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-500 mb-1">Dernière modification</div>
                                        <div className="text-gray-900">{formatDate(contractWithLiveStatus.updated_at)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 