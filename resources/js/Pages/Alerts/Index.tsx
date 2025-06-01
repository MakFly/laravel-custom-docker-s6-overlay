import React, { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
    AlertTriangle, 
    Clock, 
    Search, 
    Filter,
    MoreHorizontal,
    Trash2,
    X,
    Calendar,
    FileText,
    Bell,
    CheckCircle,
    ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDismissAlert, useSnoozeAlert, useDeleteAlert } from '@/hooks/useAlerts';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Alert {
    id: number;
    type: string;
    type_label: string;
    status: 'pending' | 'sent' | 'dismissed' | 'snoozed';
    message: string;
    scheduled_for: string;
    snoozed_until?: string;
    created_at: string;
    contract?: {
        id: number;
        title: string;
    };
}

interface PageProps {
    alerts: Alert[];
    filters: {
        search?: string;
        type?: string;
        status?: string;
    };
    stats: {
        total: number;
        pending: number;
        sent: number;
        dismissed: number;
    };
}

const AlertTypeFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type d'alerte" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="expiration">Expiration</SelectItem>
            <SelectItem value="renewal">Renouvellement</SelectItem>
            <SelectItem value="tacit_renewal">Reconduction tacite</SelectItem>
            <SelectItem value="payment">Paiement</SelectItem>
        </SelectContent>
    </Select>
);

const AlertStatusFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="sent">Envoyées</SelectItem>
            <SelectItem value="dismissed">Marquées comme lues</SelectItem>
            <SelectItem value="snoozed">Reportées</SelectItem>
        </SelectContent>
    </Select>
);

const AlertActionDropdown = ({ alert, onSuccess }: { alert: Alert; onSuccess: () => void }) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [snoozeDate, setSnoozeDate] = useState('');
    
    const dismissMutation = useDismissAlert();
    const snoozeMutation = useSnoozeAlert();
    const deleteMutation = useDeleteAlert();

    const handleDismiss = async () => {
        try {
            await dismissMutation.mutateAsync({ id: alert.id });
            toast.success('Alerte marquée comme lue');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la suppression');
        }
    };

    const handleSnooze = async (snoozeUntil: string) => {
        try {
            await snoozeMutation.mutateAsync({ id: alert.id, until: snoozeUntil });
            toast.success('Alerte reportée');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors du report');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync({ id: alert.id });
            toast.success('Alerte supprimée');
            setShowDeleteDialog(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la suppression');
        }
    };

    const getSnoozeOptions = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        return [
            { label: 'Demain', value: tomorrow.toISOString().split('T')[0] },
            { label: 'Dans 1 semaine', value: nextWeek.toISOString().split('T')[0] },
            { label: 'Dans 1 mois', value: nextMonth.toISOString().split('T')[0] },
        ];
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {alert.status === 'pending' && (
                        <>
                            <DropdownMenuItem 
                                onClick={handleDismiss}
                                disabled={dismissMutation.isPending}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marquer comme lu
                            </DropdownMenuItem>
                            
                            {getSnoozeOptions().map((option) => (
                                <DropdownMenuItem 
                                    key={option.value}
                                    onClick={() => handleSnooze(option.value)}
                                    disabled={snoozeMutation.isPending}
                                >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Reporter à {option.label}
                                </DropdownMenuItem>
                            ))}
                            
                            <DropdownMenuSeparator />
                        </>
                    )}
                    
                    <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer l'alerte</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette alerte ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const AlertCard = ({ alert, onSuccess }: { alert: Alert; onSuccess: () => void }) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="destructive">En attente</Badge>;
            case 'sent':
                return <Badge variant="secondary">Envoyée</Badge>;
            case 'dismissed':
                return <Badge variant="outline">Lue</Badge>;
            case 'snoozed':
                return <Badge variant="outline" className="text-orange-600">Reportée</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'expiration':
                return <AlertTriangle className="h-4 w-4" />;
            case 'renewal':
                return <Calendar className="h-4 w-4" />;
            case 'tacit_renewal':
                return <Clock className="h-4 w-4" />;
            case 'payment':
                return <FileText className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    const isOverdue = alert.status === 'pending' && new Date(alert.scheduled_for) < new Date();

    return (
        <Card className={`${isOverdue ? 'border-red-300 bg-red-50/30' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(alert.type)}
                            <Badge variant="outline" className="text-xs">
                                {alert.type_label}
                            </Badge>
                            {getStatusBadge(alert.status)}
                            {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                    En retard
                                </Badge>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <p className="font-medium text-gray-900">
                                {alert.message}
                            </p>
                            
                            {alert.contract && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FileText className="h-3 w-3" />
                                    <a 
                                        href={`/contracts/${alert.contract.id}`}
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        {alert.contract.title}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Programmé pour : {new Date(alert.scheduled_for).toLocaleDateString('fr-FR')}
                                </div>
                                {alert.snoozed_until && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Reporté jusqu'au : {new Date(alert.snoozed_until).toLocaleDateString('fr-FR')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <AlertActionDropdown alert={alert} onSuccess={onSuccess} />
                </div>
            </CardContent>
        </Card>
    );
};

const AlertsStats = ({ stats }: { stats: PageProps['stats'] }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center">
                    <div className="rounded-full p-2 bg-blue-100">
                        <Bell className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center">
                    <div className="rounded-full p-2 bg-red-100">
                        <Clock className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">En attente</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center">
                    <div className="rounded-full p-2 bg-green-100">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Envoyées</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center">
                    <div className="rounded-full p-2 bg-gray-100">
                        <X className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Traitées</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.dismissed}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
);

export default function AlertsIndex() {
    const { props } = usePage<PageProps>();
    
    // Protection contre les props manquantes avec vérification du type
    const alerts = Array.isArray(props.alerts) ? props.alerts : [];
    const filters = props.filters || {};
    const stats = props.stats || { total: 0, pending: 0, sent: 0, dismissed: 0 };

    // Vérification de sécurité supplémentaire
    if (props.alerts && !Array.isArray(props.alerts)) {
        console.error('Props alerts is not an array:', props.alerts);
    }

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    const handleSuccess = () => {
        // Les mutations React Query invalident automatiquement le cache
        // Ici on pourrait forcer un reload de la page si nécessaire
        window.location.reload();
    };

    // Filtrage côté client pour l'instant
    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch = !searchTerm || 
            alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alert.type_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (alert.contract?.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = typeFilter === 'all' || alert.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });

    return (
        <ErrorBoundary>
            <AppLayout>
                <Head title="Alertes" />
                
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Alertes</h1>
                        <p className="text-gray-600 mt-2">
                            Gérez vos alertes de contrats et notifications importantes
                        </p>
                    </div>

                    <AlertsStats stats={stats} />

                    {/* Filtres */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Filter className="h-5 w-5 mr-2" />
                                Filtres
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            placeholder="Rechercher dans les alertes..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <AlertTypeFilter value={typeFilter} onChange={setTypeFilter} />
                                <AlertStatusFilter value={statusFilter} onChange={setStatusFilter} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Liste des alertes */}
                    <div className="space-y-4">
                        {filteredAlerts.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Aucune alerte trouvée
                                    </h3>
                                    <p className="text-gray-600">
                                        {alerts.length === 0 
                                            ? "Vous n'avez aucune alerte pour le moment."
                                            : "Aucune alerte ne correspond aux filtres sélectionnés."
                                        }
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {filteredAlerts.map((alert) => (
                                    <AlertCard key={alert.id} alert={alert} onSuccess={handleSuccess} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </AppLayout>
        </ErrorBoundary>
    );
} 