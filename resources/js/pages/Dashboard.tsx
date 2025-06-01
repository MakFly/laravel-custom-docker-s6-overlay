import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Bell, FileText, AlertTriangle, Calendar, TrendingUp, Users } from 'lucide-react';

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
    contract: Contract;
}

interface DashboardStats {
    total_contracts: number;
    active_contracts: number;
    expiring_this_month: number;
    active_alerts: number;
    total_value: number;
    contracts_processed_today: number;
}

interface DashboardProps {
    auth: Auth;
    stats: DashboardStats;
    recent_alerts: Alert[];
    expiring_contracts: Contract[];
}

export default function Dashboard({ auth, stats, recent_alerts = [], expiring_contracts = [] }: DashboardProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const getDaysUntilExpiry = (dateString: string) => {
        const expiryDate = new Date(dateString);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="text-xl leading-tight font-semibold text-gray-800">Tableau de bord</h2>}>
            <Head title="Tableau de bord" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Welcome Card */}
                    <div className="mb-6 overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h3 className="mb-2 text-lg font-semibold">Bienvenue, {auth.user.name} !</h3>
                            {stats?.total_contracts > 0 ? (
                                <p className="mb-4 text-gray-600">
                                    Vous surveillez actuellement <strong>{stats.total_contracts}</strong> contrat(s). 
                                    {stats.expiring_this_month > 0 && (
                                        <span className="text-orange-600 font-medium"> {stats.expiring_this_month} expire(nt) ce mois !</span>
                                    )}
                                </p>
                            ) : (
                                <p className="mb-4 text-gray-600">
                                    Commencez par ajouter votre premier contrat pour bénéficier des alertes automatiques.
                                </p>
                            )}
                            <div className="flex gap-3">
                                <Link href="/contracts/create" className="rounded-md bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700">
                                    <FileText className="w-4 h-4 inline mr-2" />
                                    Ajouter un contrat
                                </Link>
                                {stats?.total_contracts > 0 && (
                                    <Link href="/alerts" className="rounded-md bg-green-600 px-4 py-2 text-white transition hover:bg-green-700">
                                        <Bell className="w-4 h-4 inline mr-2" />
                                        Gérer les alertes
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{stats?.total_contracts || 0}</div>
                                    <div className="text-gray-600">Contrats surveillés</div>
                                </div>
                                <FileText className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                        
                        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{stats?.active_alerts || 0}</div>
                                    <div className="text-gray-600">Alertes actives</div>
                                </div>
                                <Bell className="w-8 h-8 text-green-500" />
                            </div>
                        </div>
                        
                        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-orange-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-orange-600">{stats?.expiring_this_month || 0}</div>
                                    <div className="text-gray-600">Échéances ce mois</div>
                                </div>
                                <Calendar className="w-8 h-8 text-orange-500" />
                            </div>
                        </div>
                        
                        <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-purple-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats?.total_value || 0)}</div>
                                    <div className="text-gray-600">Valeur totale</div>
                                </div>
                                <TrendingUp className="w-8 h-8 text-purple-500" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Recent Alerts */}
                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                                    Alertes récentes
                                </h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {recent_alerts.length > 0 ? (
                                    <div className="divide-y divide-gray-200">
                                        {recent_alerts.map((alert) => (
                                            <div key={alert.id} className="p-4 hover:bg-gray-50">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">{alert.contract.title}</p>
                                                        <p className="text-sm text-gray-600">
                                                            Type: {alert.type} • Statut: 
                                                            <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                                                                alert.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {alert.status === 'active' ? 'Actif' : 'Inactif'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <Link 
                                                        href={`/contracts/${alert.contract.id}`}
                                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                    >
                                                        Voir
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>Aucune alerte récente</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Expiring Contracts */}
                        <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-red-500" />
                                    Contrats expirant bientôt
                                </h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {expiring_contracts.length > 0 ? (
                                    <div className="divide-y divide-gray-200">
                                        {expiring_contracts.map((contract) => {
                                            const daysLeft = getDaysUntilExpiry(contract.next_renewal_date);
                                            return (
                                                <div key={contract.id} className="p-4 hover:bg-gray-50">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">{contract.title}</p>
                                                            <p className="text-sm text-gray-600">
                                                                Expire le {formatDate(contract.next_renewal_date)}
                                                            </p>
                                                            <p className={`text-sm font-medium mt-1 ${
                                                                daysLeft <= 7 ? 'text-red-600' : 
                                                                daysLeft <= 30 ? 'text-orange-600' : 'text-green-600'
                                                            }`}>
                                                                {daysLeft <= 0 ? 'Expiré !' : `Dans ${daysLeft} jour(s)`}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium text-gray-900">{formatCurrency(contract.amount)}</p>
                                                            <Link 
                                                                href={`/contracts/${contract.id}`}
                                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                            >
                                                                Voir
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>Aucun contrat expirant bientôt</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h3 className="mb-4 text-lg font-semibold">Actions rapides</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Link
                                    href="/contracts/create"
                                    className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50 hover:border-blue-300"
                                >
                                    <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                    <div className="font-medium">Ajouter contrat</div>
                                </Link>
                                <Link href="/contracts" className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50 hover:border-green-300">
                                    <FileText className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                    <div className="font-medium">Voir tous les contrats</div>
                                </Link>
                                <Link href="/alerts" className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50 hover:border-orange-300">
                                    <Bell className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                                    <div className="font-medium">Gérer les alertes</div>
                                </Link>
                                <Link href="/profile" className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50 hover:border-purple-300">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                                    <div className="font-medium">Mon compte</div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
} 