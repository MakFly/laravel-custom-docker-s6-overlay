import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { DataTable } from '@/components/contracts/data-table';
import { columns, Contract } from '@/components/contracts/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Upload, Edit, Plus } from 'lucide-react';
import { useContracts, useDashboardStats, useDeleteContract, useUploadContract } from '@/hooks/useContracts';
import { Link, router } from '@inertiajs/react';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface ContractsPageData {
    data: Contract[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

interface Stats {
    total_contracts: number;
    active_contracts: number;
    expiring_soon: number;
    processed_contracts: number;
}

interface IndexProps {
    contracts?: ContractsPageData;
    stats?: Stats;
}

export default function Index({ contracts: initialContracts, stats: initialStats }: IndexProps) {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    // Utiliser React Query pour la gestion des données
    const { 
        data: contractsData, 
        isLoading: contractsLoading, 
        isError: contractsError,
        refetch: refetchContracts
    } = useContracts();
    
    const { 
        data: statsData, 
        isLoading: statsLoading,
        refetch: refetchStats
    } = useDashboardStats();

    // Hook pour la suppression
    const deleteContractMutation = useDeleteContract();
    
    // Hook pour l'upload rapide
    const uploadMutation = useUploadContract();

    // Utiliser les données React Query en priorité, sinon fallback sur les props initiales
    const contracts = contractsData || initialContracts || {
        data: [],
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
    };

    const stats = statsData || initialStats || {
        total_contracts: 0,
        active_contracts: 0,
        expiring_soon: 0,
        processed_contracts: 0,
    };

    // Afficher les erreurs via toast
    useEffect(() => {
        if (contractsError) {
            toast.error('Erreur lors du chargement des contrats');
        }
    }, [contractsError]);

    // Auto-refresh périodique pour détecter les changements de statut
    useEffect(() => {
        const interval = setInterval(() => {
            // Refetch silencieux toutes les 30 secondes
            queryClient.invalidateQueries({ 
                queryKey: ['contracts'], 
                refetchType: 'active' 
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [queryClient]);

    const handleRefresh = async () => {
        try {
            // Invalider toutes les queries de contrats pour forcer un refetch
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            
            await Promise.all([refetchContracts(), refetchStats()]);
            toast.success('Données actualisées');
        } catch (error) {
            toast.error('Erreur lors de l\'actualisation');
        }
    };

    const handleDeleteContract = (contractId: number) => {
        deleteContractMutation.mutate(contractId, {
            onSuccess: () => {
                toast.success('Contrat supprimé avec succès');
            },
            onError: (error) => {
                console.error('Erreur lors de la suppression:', error);
                toast.error('Erreur lors de la suppression du contrat');
            },
        });
    };

    const handleFastUpload = (file: File) => {
        const formData = new FormData();
        formData.append('contract_file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        formData.append('type', 'pro'); // Valeur par défaut
        formData.append('category', 'autre'); // Valeur par défaut
        
        uploadMutation.mutate(formData, {
            onSuccess: (result) => {
                toast.success('Contrat ajouté avec succès ! Traitement OCR en cours...');
                setIsCreateModalOpen(false);
                // Rediriger vers la page de détail
                router.visit(route('contracts.show', { contract: result.data.id }));
            },
            onError: (error) => {
                console.error('Erreur lors de l\'upload:', error);
                toast.error('Erreur lors de l\'ajout du contrat');
            },
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const files = Array.from(e.dataTransfer.files);
        const file = files[0];
        
        if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
            handleFastUpload(file);
        } else {
            toast.error('Seuls les fichiers PDF et images sont acceptés');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFastUpload(file);
        }
    };

    const statsCards = [
        {
            title: "Total contrats",
            value: stats.total_contracts,
            description: "Nombre total de contrats",
            icon: FileText,
            color: "text-blue-600",
        },
        {
            title: "Contrats actifs",
            value: stats.active_contracts,
            description: "Contrats en cours",
            icon: TrendingUp,
            color: "text-green-600",
        },
        {
            title: "Expirent bientôt",
            value: stats.expiring_soon,
            description: "Dans les 30 prochains jours",
            icon: AlertTriangle,
            color: "text-orange-600",
        },
        {
            title: "OCR traités",
            value: stats.processed_contracts,
            description: "Documents analysés",
            icon: CheckCircle,
            color: "text-purple-600",
        },
    ];

    return (
        <AppLayout>
            <Head title="Contrats" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestion des contrats</h1>
                            <p className="mt-2 text-gray-600">
                                Gérez et suivez tous vos contrats en un seul endroit
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <Button
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={contractsLoading || statsLoading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${(contractsLoading || statsLoading) ? 'animate-spin' : ''}`} />
                                Actualiser
                            </Button>
                            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nouveau contrat
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Ajouter un nouveau contrat</DialogTitle>
                                        <DialogDescription>
                                            Choisissez votre méthode d'ajout de contrat
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        {/* Option 1: Ajout classique */}
                                        <div className="grid gap-2">
                                            <Button
                                                variant="outline"
                                                className="h-auto p-4 justify-start"
                                                onClick={() => {
                                                    setIsCreateModalOpen(false);
                                                    router.visit(route('contracts.create'));
                                                }}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <Edit className="h-5 w-5 text-blue-600 mt-0.5" />
                                                    <div className="text-left">
                                                        <div className="font-medium">Ajout classique</div>
                                                        <div className="text-sm text-gray-500">
                                                            Saisie manuelle complète avec tous les détails
                                                        </div>
                                                    </div>
                                                </div>
                                            </Button>
                                        </div>

                                        {/* Option 2: Ajout rapide */}
                                        <div className="grid gap-2">
                                            <div
                                                className={`border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer hover:border-gray-400 ${
                                                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                                                } ${uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
                                                onDrop={handleDrop}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onClick={() => document.getElementById('fast-upload-input')?.click()}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <Upload className="h-5 w-5 text-green-600 mt-0.5" />
                                                    <div className="text-left">
                                                        <div className="font-medium">Ajout rapide</div>
                                                        <div className="text-sm text-gray-500 mb-2">
                                                            Déposez simplement votre PDF ici
                                                        </div>
                                                        {uploadMutation.isPending ? (
                                                            <div className="flex items-center text-sm text-blue-600">
                                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                                Upload en cours...
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-gray-400">
                                                                PDF, JPG, PNG • Max 10MB
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <input
                                                    id="fast-upload-input"
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={handleFileSelect}
                                                    disabled={uploadMutation.isPending}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {statsCards.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <Card key={stat.title}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {stat.title}
                                        </CardTitle>
                                        <Icon className={`h-4 w-4 ${stat.color}`} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {statsLoading ? (
                                                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                                            ) : (
                                                stat.value
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {stat.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Data Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Liste des contrats</CardTitle>
                                    <CardDescription>
                                        Visualisez et gérez tous vos contrats avec recherche et filtres avancés
                                    </CardDescription>
                                </div>
                                {(contractsLoading || statsLoading) && (
                                    <div className="flex items-center text-sm text-gray-500">
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Actualisation...
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {contractsLoading ? (
                                <div className="space-y-4">
                                    <div className="flex space-x-4 mb-4">
                                        <div className="animate-pulse bg-gray-200 h-10 w-64 rounded"></div>
                                        <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
                                        <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
                                    </div>
                                    <div className="space-y-3">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="animate-pulse bg-gray-200 h-16 w-full rounded"></div>
                                        ))}
                                    </div>
                                </div>
                            ) : contractsError ? (
                                <div className="text-center py-12">
                                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Erreur de chargement
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Impossible de charger les contrats
                                    </p>
                                    <Button onClick={handleRefresh}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Réessayer
                                    </Button>
                                </div>
                            ) : (
                                <DataTable 
                                    columns={columns({ onDelete: handleDeleteContract })} 
                                    data={contracts.data} 
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
} 