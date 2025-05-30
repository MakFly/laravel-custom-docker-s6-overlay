import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ProcessingStatus } from '@/components/contracts/ProcessingStatus';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Download,
  Edit,
  RefreshCw,
  Brain,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useContractStatus } from '@/hooks/useContractStatus';
import { useContract } from '@/hooks/useContracts';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Contract {
    id: number;
    title: string;
    type: 'pro' | 'perso';
    category: string;
    status: string;
    ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
    ai_status?: 'pending' | 'processing' | 'completed' | 'failed';
    file_original_name: string;
    amount_cents: number;
    currency: string;
    start_date?: string;
    end_date?: string;
    next_renewal_date?: string;
    notice_period_days: number;
    is_tacit_renewal: boolean;
    ocr_raw_text?: string;
    ai_analysis?: any;
    created_at: string;
    updated_at: string;
    alerts?: any[];
    clauses?: any[];
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

interface ShowProps {
    contract: Contract;
}

const formatAmount = (amountCents: number, currency: string = 'EUR') => {
    if (amountCents <= 0) return '-';
    const amount = amountCents / 100;
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
};

export default function Show({ contract: initialContract }: ShowProps) {
    // Utiliser directement la prop contract d'Inertia (plus rapide et fiable)
    const contract = initialContract;
    
    // Hook pour le polling des statuts de traitement
    const { status, isPolling, startPolling, stopPolling } = useContractStatus({
        contractId: contract.id,
        initialStatus: {
            id: contract.id,
            ocr_status: contract.ocr_status,
            ai_status: contract.ai_status,
            has_ocr_text: !!contract.ocr_raw_text,
            has_ai_analysis: !!contract.ai_analysis,
            updated_at: contract.updated_at,
        },
        pollInterval: 2000, // 2 secondes pour la page de détail
        stopPollingWhen: (status) => {
            const ocrDone = ['completed', 'failed'].includes(status.ocr_status);
            const aiDone = !status.ai_status || ['completed', 'failed'].includes(status.ai_status);
            return ocrDone && aiDone;
        }
    });

    // États locaux
    const [lastNotifiedStatus, setLastNotifiedStatus] = useState({
        ocr: contract.ocr_status,
        ai: contract.ai_status
    });

    // Utiliser les statuts en temps réel s'ils sont disponibles
    const currentOcrStatus = status?.ocr_status || contract.ocr_status;
    const currentAiStatus = status?.ai_status || contract.ai_status;

    // Gestion automatique du polling
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

    // Notifications des changements de statut
    useEffect(() => {
        if (currentOcrStatus !== lastNotifiedStatus.ocr) {
            if (currentOcrStatus === 'completed') {
                toast.success('Extraction de texte (OCR) terminée !');
                // Recharger la page pour obtenir les nouvelles données
                window.location.reload();
            } else if (currentOcrStatus === 'failed') {
                toast.error('Échec de l\'extraction de texte (OCR)');
            }
            setLastNotifiedStatus(prev => ({ ...prev, ocr: currentOcrStatus }));
        }

        if (currentAiStatus !== lastNotifiedStatus.ai) {
            if (currentAiStatus === 'completed') {
                toast.success('Analyse IA terminée !');
                // Recharger la page pour obtenir les nouvelles données
                window.location.reload();
            } else if (currentAiStatus === 'failed') {
                toast.error('Échec de l\'analyse IA');
            }
            setLastNotifiedStatus(prev => ({ ...prev, ai: currentAiStatus }));
        }
    }, [currentOcrStatus, currentAiStatus, lastNotifiedStatus]);

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <AppLayout>
            <Head title={contract.title} />

            <div className="py-12">
                <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/contracts"
                                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Retour aux contrats
                                </Link>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Actualiser
                                </Button>
                                <Link href={`/contracts/${contract.id}/edit`}>
                                    <Button variant="outline" size="sm">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Modifier
                                    </Button>
                                </Link>
                                <Link href={`/contracts/${contract.id}/ocr`}>
                                    <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4 mr-2" />
                                        Vue OCR
                                    </Button>
                                </Link>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={`/api/contracts/${contract.id}/download`}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Télécharger
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4">
                            <h1 className="text-3xl font-bold text-gray-900">{contract.title}</h1>
                            <div className="mt-2 flex items-center space-x-4">
                                <Badge variant={contract.type === 'pro' ? 'default' : 'secondary'}>
                                    {contract.type === 'pro' ? 'Professionnel' : 'Personnel'}
                                </Badge>
                                <Badge variant="outline">
                                    {contract.category}
                                </Badge>
                                {contract.is_tacit_renewal && (
                                    <Badge variant="destructive">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Reconduction tacite
                                    </Badge>
                                )}
                                {isPolling && (
                                    <Badge variant="secondary">
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Actualisation en cours...
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Contenu principal */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* État du traitement */}
                            <ProcessingStatus
                                ocrStatus={currentOcrStatus}
                                aiStatus={currentAiStatus}
                                hasOcrText={!!contract.ocr_raw_text}
                                hasAiAnalysis={!!contract.ai_analysis}
                                isPolling={isPolling}
                            />

                            {/* Informations du contrat */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <FileText className="w-5 h-5 mr-2" />
                                        Informations du contrat
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Fichier</label>
                                            <p className="text-sm">{contract.file_original_name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Statut</label>
                                            <p className="text-sm capitalize">{contract.status}</p>
                                        </div>
                                        {contract.amount_cents > 0 && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-500">Montant</label>
                                                <p className="text-sm font-semibold">
                                                    {formatAmount(contract.amount_cents, contract.currency)}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Préavis</label>
                                            <p className="text-sm">{contract.notice_period_days} jours</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Dates importantes */}
                            {(contract.start_date || contract.end_date || contract.next_renewal_date) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <Calendar className="w-5 h-5 mr-2" />
                                            Dates importantes
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {contract.start_date && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Date de début</label>
                                                    <p className="text-sm">{formatDate(contract.start_date)}</p>
                                                </div>
                                            )}
                                            {contract.end_date && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Date de fin</label>
                                                    <p className="text-sm">{formatDate(contract.end_date)}</p>
                                                </div>
                                            )}
                                            {contract.next_renewal_date && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Prochain renouvellement</label>
                                                    <p className="text-sm font-semibold text-orange-600">
                                                        {formatDate(contract.next_renewal_date)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Analyse IA */}
                            {contract.ai_analysis && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <Brain className="w-5 h-5 mr-2" />
                                            Analyse IA
                                        </CardTitle>
                                        <CardDescription>
                                            Analyse automatique du contrat par intelligence artificielle
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {contract.ai_analysis.confidence_score && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Score de confiance</label>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                            <div 
                                                                className="bg-blue-600 h-2 rounded-full" 
                                                                style={{ width: `${contract.ai_analysis.confidence_score * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium">
                                                            {Math.round(contract.ai_analysis.confidence_score * 100)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {contract.ai_analysis.clauses_importantes && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-500">Clauses importantes</label>
                                                    <ul className="mt-1 list-disc list-inside text-sm space-y-1">
                                                        {contract.ai_analysis.clauses_importantes.map((clause: string, index: number) => (
                                                            <li key={index}>{clause}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Texte OCR */}
                            {contract.ocr_raw_text && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Texte extrait (OCR)</CardTitle>
                                        <CardDescription>
                                            Texte extrait automatiquement du document
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                                            <pre className="text-sm whitespace-pre-wrap">{contract.ocr_raw_text}</pre>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Actions rapides */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Link href={`/contracts/${contract.id}/edit`}>
                                        <Button variant="outline" className="w-full justify-start">
                                            <Edit className="w-4 h-4 mr-2" />
                                            Modifier
                                        </Button>
                                    </Link>
                                    <Link href={`/contracts/${contract.id}/ocr`}>
                                        <Button variant="outline" className="w-full justify-start">
                                            <Eye className="w-4 h-4 mr-2" />
                                            Vue OCR
                                        </Button>
                                    </Link>
                                    <Button variant="outline" className="w-full justify-start" asChild>
                                        <a href={`/api/contracts/${contract.id}/download`}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Télécharger
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Métadonnées */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Métadonnées</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Créé le</label>
                                        <p className="text-sm">{formatDate(contract.created_at)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Modifié le</label>
                                        <p className="text-sm">{formatDate(contract.updated_at)}</p>
                                    </div>
                                    {contract.user && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Ajouté par</label>
                                            <p className="text-sm">{contract.user.name}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 