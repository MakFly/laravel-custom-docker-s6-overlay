import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, useRef } from 'react';
import { 
    Plus,
    FileText,
    AlertTriangle,
    BarChart3,
    Clock,
    Folder,
    X,
    Upload,
    Loader2,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { useUploadContract, useDashboardStats } from '@/hooks/useContracts';
import { toast } from 'react-hot-toast';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface UploadedContract {
    id: number;
    title: string;
    type: string;
    category: string;
    status: string;
    ocr_status: string;
    ai_status?: string;
}

interface DashboardProps {
    csrfToken: string;
}

export default function Dashboard({ csrfToken }: DashboardProps) {
    const [showUpload, setShowUpload] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedContract, setUploadedContract] = useState<UploadedContract | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hooks React Query
    const uploadMutation = useUploadContract();
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Vérifier la taille du fichier (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setUploadError('Le fichier ne doit pas dépasser 10MB');
                toast.error('Le fichier ne doit pas dépasser 10MB');
                return;
            }
            
            // Vérifier le type de fichier
            const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                setUploadError('Format non supporté. Utilisez PDF, PNG ou JPG');
                toast.error('Format non supporté. Utilisez PDF, PNG ou JPG');
                return;
            }
            
            setSelectedFile(file);
            setUploadError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        
        setUploadError(null);
        
        try {
            // Préparer les données du formulaire
            const formData = new FormData();
            formData.append('contract_file', selectedFile);
            formData.append('title', selectedFile.name.replace(/\.[^/.]+$/, '')); // Nom sans extension
            formData.append('type', 'perso'); // Valeur par défaut
            formData.append('category', 'autre'); // Valeur par défaut
            
            const result = await uploadMutation.mutateAsync(formData);
            
            setUploadedContract(result.data);
            
            // Toast de succès
            toast.success(`Contrat "${result.data.title}" créé avec succès !`, {
                duration: 3000,
            });

            // Actualiser les stats
            refetchStats();
            
            // Fermer la modal et rediriger après un délai plus court
            setTimeout(() => {
                closeModal();
                
                // Rediriger vers la page de détail du contrat pour suivre le traitement
                router.visit(`/contracts/${result.data.id}`);
                
                // Toast d'information sur le traitement
                setTimeout(() => {
                    toast('Le traitement OCR va commencer automatiquement. Vous pouvez suivre le progrès en temps réel.', {
                        duration: 5000,
                        icon: '🔄',
                    });
                }, 1000);
                
            }, 1500);
            
        } catch (error: any) {
            console.error('Upload failed:', error);
            
            let errorMessage = 'Erreur lors de l\'upload';
            
            if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error?.response?.data?.errors) {
                // Gestion des erreurs de validation
                const validationErrors = Object.values(error.response.data.errors).flat();
                errorMessage = validationErrors.join(', ');
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            setUploadError(errorMessage);
            toast.error(errorMessage);
        }
    };

    const closeModal = () => {
        if (!uploadMutation.isPending) {
            setShowUpload(false);
            setSelectedFile(null);
            setUploadError(null);
            setUploadedContract(null);
        }
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setUploadError(null);
        setUploadedContract(null);
    };

    // Utiliser les stats de React Query avec fallback
    const dashboardStats = stats || {
        total_contracts: 0,
        active_contracts: 0,
        expiring_soon: 0,
        processed_contracts: 0,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Quick Upload Section */}
                <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="mb-2 text-xl font-semibold">Ajoutez un nouveau contrat</h2>
                            <p className="text-blue-100">Uploadez votre document pour une analyse automatique OCR + IA</p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center space-x-2 rounded-md bg-white px-4 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-50"
                            >
                                <Plus className="h-5 w-5" />
                                <span>Upload</span>
                            </button>
                            <a
                                href="/contracts"
                                className="flex items-center space-x-2 rounded-md border border-white px-4 py-2 text-white transition-colors hover:bg-white hover:text-blue-600"
                            >
                                <Folder className="h-5 w-5" />
                                <span>Voir tous</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    {/* Total Contrats */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <FileText className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total contrats</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? (
                                        <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                                    ) : (
                                        dashboardStats.total_contracts
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contrats Actifs */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <BarChart3 className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Contrats actifs</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? (
                                        <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                                    ) : (
                                        dashboardStats.active_contracts
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Alertes Actives */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-8 w-8 text-orange-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Expirent bientôt</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? (
                                        <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                                    ) : (
                                        dashboardStats.expiring_soon
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* OCR Traités */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border bg-white p-6 shadow">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Clock className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">OCR traités</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? (
                                        <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                                    ) : (
                                        dashboardStats.processed_contracts
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Échéances Importantes */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border bg-white shadow md:col-span-2">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Échéances importantes</h3>
                                <a href="/contracts" className="text-sm text-blue-600 hover:text-blue-800">
                                    Voir tout
                                </a>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="py-8 text-center">
                                <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                <h4 className="mb-2 text-lg font-medium text-gray-900">Aucune échéance proche</h4>
                                <p className="text-gray-600">Commencez par ajouter vos premiers contrats !</p>
                                <button
                                    onClick={() => setShowUpload(true)}
                                    className="mx-auto mt-4 flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Ajouter un contrat</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Actions Rapides */}
                    <div className="space-y-4">
                        {/* Actions */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border rounded-xl border bg-white p-6 shadow">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Actions rapides</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowUpload(true)}
                                    className="flex w-full items-center space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                                >
                                    <Plus className="h-5 w-5 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-900">Analyser un nouveau contrat</span>
                                </button>
                                
                                <a
                                    href="/contracts?type=pro"
                                    className="flex w-full items-center space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                                >
                                    <FileText className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-900">Contrats professionnels</span>
                                </a>
                                
                                <a
                                    href="/contracts?type=perso"
                                    className="flex w-full items-center space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                                >
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    <span className="text-sm font-medium text-gray-900">Contrats personnels</span>
                                </a>
                                
                                <a
                                    href="/contracts?is_tacit_renewal=true"
                                    className="flex w-full items-center space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                                >
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                    <span className="text-sm font-medium text-gray-900">Reconductions tacites</span>
                                </a>
                            </div>
                        </div>

                        {/* Aide */}
                        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-blue-50 p-6">
                            <h3 className="mb-2 text-lg font-semibold text-gray-900">Besoin d'aide ?</h3>
                            <p className="mb-4 text-sm text-gray-600">
                                Découvrez comment tirer le meilleur parti de Contract-Tacit avec notre guide d'utilisation.
                            </p>
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-800">Voir le guide →</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
                        <div className="p-6">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">Nouveau Contrat</h2>
                                <button 
                                    onClick={closeModal}
                                    disabled={uploadMutation.isPending}
                                    className={`${uploadMutation.isPending ? 'cursor-not-allowed text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            
                            {/* Input file caché */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploadMutation.isPending}
                            />
                            
                            {/* Message d'erreur */}
                            {uploadError && (
                                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4">
                                    <div className="flex items-center">
                                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                        <p className="text-sm text-red-700">{uploadError}</p>
                                    </div>
                                    <button
                                        onClick={resetUpload}
                                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                                    >
                                        Réessayer
                                    </button>
                                </div>
                            )}
                            
                            {uploadMutation.isPending ? (
                                <div className="rounded-lg border border-gray-300 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="h-8 w-8 text-blue-500" />
                                            <div>
                                                <p className="font-medium text-gray-900">{selectedFile?.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {(selectedFile?.size / 1024 / 1024).toFixed(1)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    
                                    <div className="mt-6 flex space-x-3">
                                        <button
                                            onClick={handleFileSelect}
                                            disabled={uploadMutation.isPending}
                                            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Changer de fichier
                                        </button>
                                        <button
                                            onClick={handleUpload}
                                            disabled={uploadMutation.isPending}
                                            className="flex-1 flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {uploadMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Upload en cours...
                                                </>
                                            ) : (
                                                'Analyser le contrat'
                                            )}
                                        </button>
                                    </div>
                                    
                                    {uploadMutation.isPending && (
                                        <div className="mt-4">
                                            <div className="bg-gray-200 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 text-center">
                                                Upload vers Laravel et déclenchement des jobs OCR + OpenAI...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : !selectedFile ? (
                                <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Upload de contrat</h3>
                                    <p className="mt-1 text-sm text-gray-500">Glissez-déposez votre fichier PDF ou image ici</p>
                                    <div className="mt-6">
                                        <button
                                            type="button"
                                            onClick={handleFileSelect}
                                            disabled={uploadMutation.isPending}
                                            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            <Plus className="mr-2 h-5 w-5" />
                                            Sélectionner un fichier
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-gray-300 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <FileText className="h-8 w-8 text-blue-500" />
                                            <div>
                                                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                                                </p>
                                            </div>
                                        </div>
                                        {!uploadMutation.isPending && (
                                            <button
                                                onClick={() => setSelectedFile(null)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6 flex space-x-3">
                                        <button
                                            onClick={handleFileSelect}
                                            disabled={uploadMutation.isPending}
                                            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Changer de fichier
                                        </button>
                                        <button
                                            onClick={handleUpload}
                                            disabled={uploadMutation.isPending}
                                            className="flex-1 flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {uploadMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Upload en cours...
                                                </>
                                            ) : (
                                                'Analyser le contrat'
                                            )}
                                        </button>
                                    </div>
                                    
                                    {uploadMutation.isPending && (
                                        <div className="mt-4">
                                            <div className="bg-gray-200 rounded-full h-2">
                                                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 text-center">
                                                Upload vers Laravel et déclenchement des jobs OCR + OpenAI...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-6 text-center">
                                <p className="text-xs text-gray-500">Formats supportés: PDF, PNG, JPG (max 10MB)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
