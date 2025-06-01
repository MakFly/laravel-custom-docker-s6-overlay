import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AlertTriangle, Clock, X, MoreHorizontal, Trash2, Bell } from 'lucide-react';
import { useDismissAlert, useSnoozeAlert, useDeleteAlert } from '@/hooks/useAlerts';
import { toast } from 'react-hot-toast';

interface Alert {
    id: number;
    type: string;
    type_label: string;
    status: string;
    message: string;
    scheduled_for: string;
}

interface AlertsDropdownProps {
    alerts: Alert[];
    alertsCount: number;
    onViewAll?: () => void;
}

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

    const handleSnooze = async () => {
        if (!snoozeDate) {
            toast.error('Veuillez sélectionner une date');
            return;
        }
        
        try {
            await snoozeMutation.mutateAsync({ id: alert.id, until: snoozeDate });
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
                    <DropdownMenuItem 
                        onClick={handleDismiss}
                        disabled={dismissMutation.isPending}
                    >
                        <X className="mr-2 h-4 w-4" />
                        Marquer comme lu
                    </DropdownMenuItem>
                    
                    {getSnoozeOptions().map((option) => (
                        <DropdownMenuItem 
                            key={option.value}
                            onClick={() => {
                                setSnoozeDate(option.value);
                                setTimeout(handleSnooze, 0);
                            }}
                            disabled={snoozeMutation.isPending}
                        >
                            <Clock className="mr-2 h-4 w-4" />
                            Reporter à {option.label}
                        </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuSeparator />
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

export default function AlertsDropdown({ alerts, alertsCount, onViewAll }: AlertsDropdownProps) {
    const handleSuccess = () => {
        // Les mutations React Query invalident automatiquement le cache
        // Le composant parent sera mis à jour automatiquement
    };

    if (alertsCount === 0) {
        return null;
    }

    return (
        <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center text-orange-800">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Alertes ({alertsCount})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="bg-white rounded-lg p-3 border border-orange-200">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-xs">
                                            {alert.type_label}
                                        </Badge>
                                        <Badge 
                                            variant={alert.status === 'pending' ? 'destructive' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {alert.status === 'pending' ? 'En attente' : 'Envoyé'}
                                        </Badge>
                                    </div>
                                    <div className="font-medium text-sm text-orange-900 mb-1">
                                        {alert.type_label}
                                    </div>
                                    <div className="text-xs text-orange-700">
                                        {alert.message}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Programmé pour : {new Date(alert.scheduled_for).toLocaleDateString('fr-FR')}
                                    </div>
                                </div>
                                {alert.status === 'pending' && (
                                    <AlertActionDropdown alert={alert} onSuccess={handleSuccess} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {alertsCount > 3 && (
                    <Button 
                        variant="outline" 
                        className="w-full mt-4 border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={onViewAll}
                    >
                        <Bell className="mr-2 h-4 w-4" />
                        Voir toutes les alertes ({alertsCount})
                    </Button>
                )}
            </CardContent>
        </Card>
    );
} 