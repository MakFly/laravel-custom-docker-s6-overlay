import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    CreditCard, 
    Check, 
    X, 
    Download, 
    Calendar,
    Zap,
    Users,
    Shield,
    Star,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'react-hot-toast';

interface User {
    id: number;
    name: string;
    email: string;
    subscription_plan: string;
    ai_credits_remaining: number;
    ai_credits_monthly_limit: number;
    ai_credits_purchased: number;
    credits_reset_date: string;
    subscription_status: string;
    subscription_ends_at?: string;
}

interface Invoice {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    download_url: string;
    description: string;
}

interface BillingProps {
    user: User;
    invoices: Invoice[];
    payment_methods: any[];
    stripe_public_key: string;
}

const PLANS = [
    {
        id: 'basic',
        name: 'Basic',
        price: 0,
        credits: 10,
        features: [
            'Pattern matching gratuit',
            '10 crédits IA par mois',
            'Support par email',
            'Export PDF',
            '1 organisation'
        ],
        limitations: [
            'Alertes limitées',
            'Pas de support prioritaire'
        ]
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 19.99,
        credits: 30,
        popular: true,
        features: [
            'Tout du plan Basic',
            '30 crédits IA par mois',
            'Analyses IA avancées',
            'Alertes illimitées',
            'Support prioritaire',
            'Intégrations Discord/Slack',
            'API access'
        ],
        limitations: []
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Sur devis',
        credits: 'Illimité',
        features: [
            'Tout du plan Premium',
            'Crédits IA illimités',
            'Organisations multiples',
            'Support dédié 24/7',
            'SLA garanti',
            'Déploiement on-premise',
            'Formation personnalisée'
        ],
        limitations: []
    }
];

export default function Billing({ user, invoices, payment_methods, stripe_public_key }: BillingProps) {
    const [isChangingPlan, setIsChangingPlan] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const handlePlanChange = async (planId: string) => {
        setIsChangingPlan(true);
        setSelectedPlan(planId);

        try {
            const response = await fetch('/billing/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ plan: planId }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    toast.success('Plan mis à jour avec succès !');
                    router.reload();
                }
            } else {
                throw new Error('Erreur lors du changement de plan');
            }
        } catch (error) {
            toast.error('Erreur lors du changement de plan');
        } finally {
            setIsChangingPlan(false);
            setSelectedPlan(null);
        }
    };

    const handleCancelSubscription = async () => {
        try {
            const response = await fetch('/billing/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                toast.success('Abonnement annulé. Il reste actif jusqu\'à la fin de la période de facturation.');
                router.reload();
            } else {
                throw new Error('Erreur lors de l\'annulation');
            }
        } catch (error) {
            toast.error('Erreur lors de l\'annulation de l\'abonnement');
        }
    };

    const handleBuyCredits = async (amount: number) => {
        try {
            const response = await fetch('/api/credits/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ amount }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    toast.success(`${amount} crédits ajoutés à votre compte !`);
                    router.reload();
                }
            } else {
                throw new Error('Erreur lors de l\'achat de crédits');
            }
        } catch (error) {
            toast.error('Erreur lors de l\'achat de crédits');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="default">Actif</Badge>;
            case 'canceled':
                return <Badge variant="destructive">Annulé</Badge>;
            case 'past_due':
                return <Badge variant="secondary">En retard</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const formatAmount = (amount: number, currency: string = 'EUR') => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100);
    };

    return (
        <AppLayout>
            <Head title="Facturation" />
            
            <div className="py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Navigation */}
                    <div className="mb-6">
                        <Link
                            href="/account"
                            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Retour au compte
                        </Link>
                    </div>

                    {/* En-tête */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Facturation et abonnements</h1>
                        <p className="text-gray-600">Gérez votre abonnement, vos crédits et vos factures</p>
                    </div>

                    {/* Abonnement actuel */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <CreditCard className="h-5 w-5 mr-2" />
                                Abonnement actuel
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Plan</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                                            {PLANS.find(p => p.id === user.subscription_plan)?.name || 'Basic'}
                                        </Badge>
                                        {getStatusBadge(user.subscription_status)}
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Crédits IA</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-blue-600">
                                            {user.ai_credits_remaining}
                                        </span>
                                        <span className="text-gray-500">/ {user.ai_credits_monthly_limit}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div 
                                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                            style={{ 
                                                width: `${(user.ai_credits_remaining / user.ai_credits_monthly_limit) * 100}%` 
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-medium text-gray-900 mb-2">Prochaine facturation</h3>
                                    <p className="text-gray-600">
                                        {user.subscription_ends_at ? 
                                            `Se termine le ${formatDate(user.subscription_ends_at)}` : 
                                            `Renouvellement le ${formatDate(user.credits_reset_date)}`
                                        }
                                    </p>
                                </div>
                            </div>

                            {user.subscription_status === 'canceled' && (
                                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                    <p className="text-orange-800">
                                        Votre abonnement a été annulé et se terminera le {formatDate(user.subscription_ends_at!)}.
                                        Vous pouvez le réactiver à tout moment.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Achat de crédits supplémentaires */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Zap className="h-5 w-5 mr-2" />
                                Crédits supplémentaires
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Besoin de plus de crédits IA ce mois ? Achetez des crédits supplémentaires à l'unité.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { amount: 10, price: 9.99, popular: false },
                                    { amount: 25, price: 19.99, popular: true },
                                    { amount: 50, price: 34.99, popular: false },
                                ].map((pack) => (
                                    <Card key={pack.amount} className={pack.popular ? 'border-blue-500 relative' : ''}>
                                        {pack.popular && (
                                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                                <Badge className="bg-blue-500 text-white">
                                                    <Star className="h-3 w-3 mr-1" />
                                                    Populaire
                                                </Badge>
                                            </div>
                                        )}
                                        <CardContent className="p-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-gray-900">{pack.amount}</div>
                                                <div className="text-sm text-gray-600 mb-2">crédits IA</div>
                                                <div className="text-lg font-semibold text-blue-600 mb-3">
                                                    {pack.price}€
                                                </div>
                                                <div className="text-xs text-gray-500 mb-3">
                                                    {(pack.price / pack.amount).toFixed(2)}€ par crédit
                                                </div>
                                                <Button 
                                                    className="w-full"
                                                    variant={pack.popular ? 'default' : 'outline'}
                                                    onClick={() => handleBuyCredits(pack.amount)}
                                                >
                                                    Acheter
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Plans disponibles */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Changer de plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {PLANS.map((plan) => (
                                    <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500' : ''} ${user.subscription_plan === plan.id ? 'bg-blue-50 border-blue-500' : ''}`}>
                                        {plan.popular && (
                                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                                <Badge className="bg-blue-500 text-white">
                                                    <Star className="h-3 w-3 mr-1" />
                                                    Populaire
                                                </Badge>
                                            </div>
                                        )}
                                        <CardContent className="p-6">
                                            <div className="text-center mb-4">
                                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                                <div className="text-3xl font-bold text-blue-600 mt-2">
                                                    {typeof plan.price === 'number' ? `${plan.price}€` : plan.price}
                                                </div>
                                                {typeof plan.price === 'number' && (
                                                    <div className="text-sm text-gray-600">par mois</div>
                                                )}
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {plan.credits} crédits IA{typeof plan.credits === 'number' ? '/mois' : ''}
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                {plan.features.map((feature, index) => (
                                                    <div key={index} className="flex items-center text-sm">
                                                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                                {plan.limitations.map((limitation, index) => (
                                                    <div key={index} className="flex items-center text-sm text-gray-500">
                                                        <X className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                                                        <span>{limitation}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {user.subscription_plan === plan.id ? (
                                                <Button disabled className="w-full">
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Plan actuel
                                                </Button>
                                            ) : plan.id === 'enterprise' ? (
                                                <Button variant="outline" className="w-full" asChild>
                                                    <Link href="/contact">
                                                        Nous contacter
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button 
                                                    className="w-full"
                                                    onClick={() => handlePlanChange(plan.id)}
                                                    disabled={isChangingPlan}
                                                >
                                                    {isChangingPlan && selectedPlan === plan.id ? (
                                                        <>
                                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                            Changement...
                                                        </>
                                                    ) : (
                                                        plan.price > (PLANS.find(p => p.id === user.subscription_plan)?.price || 0) ? 
                                                        'Upgrader' : 'Changer'
                                                    )}
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Factures */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Calendar className="h-5 w-5 mr-2" />
                                Historique des factures
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {invoices.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Montant</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((invoice) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell>{formatDate(invoice.created_at)}</TableCell>
                                                <TableCell>{invoice.description}</TableCell>
                                                <TableCell className="font-medium">
                                                    {formatAmount(invoice.amount, invoice.currency)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                                                        {invoice.status === 'paid' ? 'Payée' : 'Impayée'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={invoice.download_url} target="_blank" rel="noopener noreferrer">
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Télécharger
                                                        </a>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">Aucune facture disponible</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions d'abonnement */}
                    {user.subscription_plan !== 'basic' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center text-red-600">
                                    <Shield className="h-5 w-5 mr-2" />
                                    Zone dangereuse
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                                    <div>
                                        <h3 className="font-medium text-red-900">Annuler l'abonnement</h3>
                                        <p className="text-sm text-red-700">
                                            Vous conserverez l'accès jusqu'à la fin de votre période de facturation
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">
                                                Annuler l'abonnement
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Annuler l'abonnement</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Êtes-vous sûr de vouloir annuler votre abonnement ? 
                                                    Vous conserverez l'accès aux fonctionnalités premium jusqu'à la fin de votre période de facturation,
                                                    puis votre compte sera automatiquement rétrogradé au plan Basic.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Garder l'abonnement</AlertDialogCancel>
                                                <AlertDialogAction 
                                                    onClick={handleCancelSubscription}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Confirmer l'annulation
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
} 