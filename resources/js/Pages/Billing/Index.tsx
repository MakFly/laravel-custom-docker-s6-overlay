import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    CreditCard, 
    Crown, 
    Download, 
    Check, 
    Zap,
    Calendar,
    Euro,
    ArrowRight,
    AlertTriangle,
    ShieldCheck,
    Users,
    BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

interface User {
    id: number;
    name: string;
    email: string;
    org_id: number;
    role: string;
}

interface Organization {
    id: number;
    name: string;
    subscription_plan: 'basic' | 'premium' | 'enterprise';
    credits_remaining: number;
    credits_used_this_month: number;
    monthly_credits_included: number;
    subscription_ends_at?: string;
    created_at: string;
}

interface CreditPack {
    id: string;
    name: string;
    credits: number;
    price: number;
    price_per_credit: number;
    popular?: boolean;
}

interface Plan {
    id: string;
    name: string;
    price: number;
    credits: number;
    features: string[];
    popular?: boolean;
    current?: boolean;
}

interface Invoice {
    id: string;
    number: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    created_at: string;
    download_url: string;
}

interface PageProps {
    user: User;
    organization: Organization;
    credit_packs: CreditPack[];
    plans: Plan[];
    invoices: Invoice[];
}

const CreditProgressBar = ({ used, total }: { used: number; total: number }) => {
    const percentage = total > 0 ? (used / total) * 100 : 0;
    const remaining = Math.max(0, total - used);
    
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">Crédits utilisés ce mois</span>
                <span className="font-medium">{used} / {total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                        percentage > 90 ? 'bg-red-500' : 
                        percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                <span>{remaining} restants</span>
                <span>{percentage.toFixed(0)}% utilisés</span>
            </div>
        </div>
    );
};

const CurrentSubscription = ({ organization }: { organization: Organization }) => {
    const getPlanName = (plan: string) => {
        switch (plan) {
            case 'basic': return 'Plan Gratuit';
            case 'premium': return 'Plan Premium';
            case 'enterprise': return 'Plan Enterprise';
            default: return plan;
        }
    };

    const getPlanIcon = (plan: string) => {
        switch (plan) {
            case 'premium': return <Crown className="h-5 w-5" />;
            case 'enterprise': return <ShieldCheck className="h-5 w-5" />;
            default: return <Zap className="h-5 w-5" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Abonnement actuel
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {getPlanIcon(organization.subscription_plan)}
                        <div>
                            <h3 className="font-semibold text-lg">
                                {getPlanName(organization.subscription_plan)}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {organization.monthly_credits_included} crédits/mois
                            </p>
                        </div>
                    </div>
                    <Badge variant={organization.subscription_plan === 'premium' ? 'default' : 'secondary'}>
                        {organization.subscription_plan === 'premium' && <Crown className="h-3 w-3 mr-1" />}
                        Actuel
                    </Badge>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Crédits disponibles</span>
                        <span className="text-2xl font-bold text-blue-600">
                            {organization.credits_remaining}
                        </span>
                    </div>
                    <CreditProgressBar 
                        used={organization.credits_used_this_month} 
                        total={organization.monthly_credits_included} 
                    />
                </div>

                {organization.subscription_ends_at && (
                    <div className="text-sm text-gray-600 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Renouvellement le {new Date(organization.subscription_ends_at).toLocaleDateString('fr-FR')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const CreditPacksSection = ({ packs }: { packs: CreditPack[] }) => {
    const { post, processing } = useForm();

    const handlePurchase = (packId: string) => {
        post(`/billing/purchase-credits/${packId}`, {
            onSuccess: () => {
                toast.success('Achat de crédits initié avec succès');
            },
            onError: () => {
                toast.error('Erreur lors de l\'achat de crédits');
            },
        });
    };

    if (!packs || packs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Packs de crédits</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">Aucun pack de crédits disponible pour le moment.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Packs de crédits
                </CardTitle>
                <p className="text-gray-600 text-sm">
                    Achetez des crédits supplémentaires pour vos analyses IA
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {packs.map((pack) => (
                        <div 
                            key={pack.id}
                            className={`border-2 rounded-lg p-4 relative ${
                                pack.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                        >
                            {pack.popular && (
                                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                    Populaire
                                </Badge>
                            )}
                            <div className="text-center space-y-3">
                                <h3 className="font-semibold text-lg">{pack.name}</h3>
                                <div className="text-3xl font-bold text-blue-600">
                                    {pack.credits}
                                    <span className="text-sm text-gray-600 ml-1">crédits</span>
                                </div>
                                <div className="text-gray-600">
                                    <span className="text-xl font-semibold">{pack.price}€</span>
                                    <div className="text-xs">
                                        {pack.price_per_credit.toFixed(2)}€ par crédit
                                    </div>
                                </div>
                                <Button 
                                    className="w-full"
                                    onClick={() => handlePurchase(pack.id)}
                                    disabled={processing}
                                >
                                    <Euro className="h-4 w-4 mr-2" />
                                    {processing ? 'Traitement...' : 'Acheter'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

const PlansSection = ({ plans, currentPlan }: { plans: Plan[]; currentPlan: string }) => {
    const { post, processing } = useForm();

    const handlePlanChange = (planId: string) => {
        post(`/billing/change-plan/${planId}`, {
            onSuccess: () => {
                toast.success('Changement de plan initié avec succès');
            },
            onError: () => {
                toast.error('Erreur lors du changement de plan');
            },
        });
    };

    if (!plans || plans.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Plans d'abonnement</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">Aucun plan d'abonnement disponible pour le moment.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Plans d'abonnement
                </CardTitle>
                <p className="text-gray-600 text-sm">
                    Choisissez le plan qui correspond le mieux à vos besoins
                </p>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div 
                            key={plan.id}
                            className={`border-2 rounded-lg p-6 relative ${
                                plan.popular ? 'border-blue-500 bg-blue-50' :
                                plan.current ? 'border-green-500 bg-green-50' : 'border-gray-200'
                            }`}
                        >
                            {plan.popular && (
                                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                    Recommandé
                                </Badge>
                            )}
                            {plan.current && (
                                <Badge variant="secondary" className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                    Plan actuel
                                </Badge>
                            )}
                            
                            <div className="text-center space-y-4">
                                <h3 className="font-semibold text-xl">{plan.name}</h3>
                                <div className="text-3xl font-bold">
                                    {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                                    {plan.price > 0 && <span className="text-sm text-gray-600">/mois</span>}
                                </div>
                                <div className="text-gray-600">
                                    {plan.credits === -1 ? 'Crédits illimités' : `${plan.credits} crédits/mois`}
                                </div>
                                
                                <ul className="space-y-2 text-sm text-left">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-center">
                                            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                
                                {!plan.current && (
                                    <Button 
                                        className="w-full"
                                        variant={plan.popular ? 'default' : 'outline'}
                                        onClick={() => handlePlanChange(plan.id)}
                                        disabled={processing}
                                    >
                                        {processing ? 'Traitement...' : 
                                         plan.id === 'basic' ? 'Rétrograder' :
                                         plan.price > (plans.find(p => p.current)?.price || 0) ? 'Mettre à niveau' : 'Changer'}
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

const InvoicesSection = ({ invoices }: { invoices: Invoice[] }) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <Badge variant="secondary" className="text-green-700 bg-green-100">Payée</Badge>;
            case 'pending':
                return <Badge variant="outline">En attente</Badge>;
            case 'failed':
                return <Badge variant="destructive">Échec</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (!invoices || invoices.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Download className="h-5 w-5 mr-2" />
                        Historique des factures
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600">Aucune facture disponible.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Download className="h-5 w-5 mr-2" />
                    Historique des factures
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {invoices.slice(0, 5).map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <span className="font-medium">{invoice.number}</span>
                                    {getStatusBadge(invoice.status)}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                    {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold">{invoice.amount}€</span>
                                {invoice.status === 'paid' && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={invoice.download_url} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {invoices.length > 5 && (
                        <Button variant="outline" className="w-full" asChild>
                            <a href="/billing/invoices">
                                Voir toutes les factures
                            </a>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const SubscriptionManagement = ({ organization }: { organization: Organization }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Gestion de l'abonnement
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/billing/payment-methods">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Moyens de paiement
                    </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/billing/invoices">
                        <Download className="h-4 w-4 mr-2" />
                        Toutes les factures
                    </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/billing/usage">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Utilisation détaillée
                    </a>
                </Button>
            </div>
            
            <Separator />
            
            {organization.subscription_plan !== 'basic' && (
                <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">Besoin d'aide ?</p>
                    <Button variant="outline" size="sm" asChild>
                        <a href="/billing/cancel">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Annuler l'abonnement
                        </a>
                    </Button>
                </div>
            )}
        </CardContent>
    </Card>
);

export default function Billing() {
    const { props } = usePage<PageProps>();
    
    // Protection contre les props manquantes avec des valeurs par défaut et vérification des types
    const user = props.user || {} as User;
    const organization = props.organization || {} as Organization;
    const creditPacks = Array.isArray(props.credit_packs) ? props.credit_packs : [];
    const plans = Array.isArray(props.plans) ? props.plans : [];
    const invoices = Array.isArray(props.invoices) ? props.invoices : [];

    // Vérification de sécurité supplémentaire
    if (props.credit_packs && !Array.isArray(props.credit_packs)) {
        console.error('Props credit_packs is not an array:', props.credit_packs);
    }
    if (props.plans && !Array.isArray(props.plans)) {
        console.error('Props plans is not an array:', props.plans);
    }
    if (props.invoices && !Array.isArray(props.invoices)) {
        console.error('Props invoices is not an array:', props.invoices);
    }

    // Vérification des données critiques
    if (!user.id || !organization.id) {
        throw new Error('Données utilisateur ou organisation manquantes');
    }

    // Sécurité pour les plans - marquer le plan actuel avec vérification
    const plansWithCurrent = plans.length > 0 ? plans.map(plan => ({
        ...plan,
        current: plan.id === organization.subscription_plan
    })) : [];

    return (
        <ErrorBoundary>
            <AppLayout>
                <Head title="Facturation" />
                
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Facturation et abonnements</h1>
                        <p className="text-gray-600 mt-2">
                            Gérez votre abonnement, achetez des crédits et consultez vos factures
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Contenu principal */}
                        <div className="lg:col-span-2 space-y-6">
                            <CurrentSubscription organization={organization} />
                            <CreditPacksSection packs={creditPacks} />
                            <PlansSection plans={plansWithCurrent} currentPlan={organization.subscription_plan} />
                            <InvoicesSection invoices={invoices} />
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <SubscriptionManagement organization={organization} />
                        </div>
                    </div>
                </div>
            </AppLayout>
        </ErrorBoundary>
    );
} 