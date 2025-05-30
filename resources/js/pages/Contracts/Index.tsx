import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { DataTable } from '@/components/contracts/data-table';
import { columns, Contract } from '@/components/contracts/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useContracts, useDashboardStats } from '@/hooks/useContracts';
import { Link } from '@inertiajs/react';
import { toast } from 'react-hot-toast';

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

    const handleRefresh = async () => {
        try {
            await Promise.all([refetchContracts(), refetchStats()]);
            toast.success('Données actualisées');
        } catch (error) {
            toast.error('Erreur lors de l\'actualisation');
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
                            <Link href={route('contracts.create')}>
                                <Button>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Nouveau contrat
                                </Button>
                            </Link>
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
                                <DataTable columns={columns} data={contracts.data} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
} 