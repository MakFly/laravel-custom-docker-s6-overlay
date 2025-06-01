import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Bell, AlertTriangle, CheckCircle, X, Play, Pause, Trash2, MessageSquare, Calendar } from 'lucide-react';
import { useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Auth {
    user: User;
}

interface Contract {
    id: number;
    title: string;
    next_renewal_date: string;
    amount: number;
    status: string;
}

interface Alert {
    id: number;
    type: string;
    status: string;
    trigger_days: number;
    last_sent_at: string | null;
    notification_channels: string[];
    discord_webhook_url: string | null;
    is_discord_enabled: boolean;
    contract: Contract;
    created_at: string;
}

interface AlertStats {
    total_alerts: number;
    active_alerts: number;
    sent_today: number;
}

interface AlertsProps {
    auth: Auth;
    alerts: {
        data: Alert[];
        links: any[];
        meta: any;
    };
    stats: AlertStats;
}

export default function AlertsIndex({ auth, alerts, stats }: AlertsProps) {
    const [testingAlert, setTestingAlert] = useState<number | null>(null);
    const [sendingReport, setSendingReport] = useState(false);

    const { data, setData, post, processing } = useForm({
        contract_id: '',
        type: 'renewal',
        trigger_days: 30,
        notification_channels: ['email'],
        is_discord_enabled: false,
        discord_webhook_url: '',
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
        switch (status) {
            case 'pending':
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            case 'sent':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'failed':
                return `${baseClasses} bg-red-100 text-red-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'renewal_warning':
                return 'Avertissement renouvellement';
            case 'notice_deadline':
                return 'Échéance préavis';
            case 'contract_expired':
                return 'Contrat expiré';
            default:
                return type;
        }
    };

    const testDiscordAlert = async (alertId: number) => {
        setTestingAlert(alertId);
        try {
            const response = await fetch(`/alerts/${alertId}/test-discord`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Test Discord envoyé avec succès !');
            } else {
                alert('Erreur lors de l\'envoi du test Discord');
            }
        } catch (error) {
            alert('Erreur lors de l\'envoi du test Discord');
        } finally {
            setTestingAlert(null);
        }
    };

    const toggleAlertStatus = async (alertId: number) => {
        try {
            const response = await fetch(`/alerts/${alertId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            if (response.ok) {
                router.reload();
            }
        } catch (error) {
            alert('Erreur lors de la mise à jour du statut');
        }
    };

    const sendMonthlyReport = async () => {
        setSendingReport(true);
        try {
            const response = await fetch('/alerts/monthly-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Rapport mensuel envoyé avec succès !');
            } else {
                alert('Erreur lors de l\'envoi du rapport mensuel');
            }
        } catch (error) {
            alert('Erreur lors de l\'envoi du rapport mensuel');
        } finally {
            setSendingReport(false);
        }
    };

    const deleteAlert = (alertId: number) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
            router.delete(`/alerts/${alertId}`);
        }
    };

    return (
        <AuthenticatedLayout 
            user={auth.user} 
            header={<h2 className="text-xl leading-tight font-semibold text-gray-800">Gestion des Alertes</h2>}
        >
            <Head title="Alertes" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Stats Cards */}
                    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{stats.total_alerts}</div>
                                    <div className="text-gray-600">Total alertes</div>
                                </div>
                                <Bell className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                        
                        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{stats.active_alerts}</div>
                                    <div className="text-gray-600">Alertes actives</div>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </div>
                        
                        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-orange-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-orange-600">{stats.sent_today}</div>
                                    <div className="text-gray-600">Envoyées aujourd'hui</div>
                                </div>
                                <Calendar className="w-8 h-8 text-orange-500" />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mb-6 flex gap-4">
                        <button
                            onClick={sendMonthlyReport}
                            disabled={sendingReport}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <MessageSquare className="w-4 h-4 inline mr-2" />
                            {sendingReport ? 'Envoi...' : 'Envoyer rapport mensuel Discord'}
                        </button>
                    </div>

                    {/* Alerts List */}
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                                Alertes configurées
                            </h3>
                        </div>
                        
                        {alerts.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Contrat
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Statut
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Déclenchement
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Dernière notification
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {alerts.data.map((alert) => (
                                            <tr key={alert.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{alert.contract.title}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {formatCurrency(alert.contract.amount)} • 
                                                            Expire le {formatDate(alert.contract.next_renewal_date)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-900">
                                                        {getTypeLabel(alert.type)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={getStatusBadge(alert.status)}>
                                                        {alert.status === 'pending' ? 'En attente' : 
                                                         alert.status === 'sent' ? 'Envoyé' : 'Échec'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {alert.trigger_days} jour(s) avant
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {alert.last_sent_at ? formatDate(alert.last_sent_at) : 'Jamais'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        {alert.is_discord_enabled && (
                                                            <button
                                                                onClick={() => testDiscordAlert(alert.id)}
                                                                disabled={testingAlert === alert.id}
                                                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                                                title="Tester Discord"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => toggleAlertStatus(alert.id)}
                                                            className={`${alert.status === 'pending' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                                            title={alert.status === 'pending' ? 'Désactiver' : 'Activer'}
                                                        >
                                                            {alert.status === 'pending' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteAlert(alert.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>Aucune alerte configurée</p>
                                <p className="text-sm mt-2">Les alertes sont créées automatiquement lors de l'ajout de contrats.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
} 