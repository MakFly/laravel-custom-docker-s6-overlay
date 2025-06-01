import React, { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
    User, 
    Building2, 
    Shield, 
    CreditCard, 
    Users, 
    FileText, 
    Settings,
    Edit2,
    Save,
    X,
    Key,
    Smartphone,
    Monitor,
    Crown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    org_id: number;
    role: 'admin' | 'member' | 'viewer';
    created_at: string;
    updated_at: string;
}

interface Organization {
    id: number;
    name: string;
    slug: string;
    subscription_plan: 'basic' | 'premium' | 'enterprise';
    credits_remaining: number;
    credits_used_this_month: number;
    monthly_credits_included: number;
    created_at: string;
}

interface PageProps {
    user: User;
    organization: Organization;
    stats: {
        total_contracts: number;
        pending_alerts: number;
        users_count: number;
    };
}

const CreditProgressBar = ({ used, total }: { used: number; total: number }) => {
    const percentage = total > 0 ? (used / total) * 100 : 0;
    const remaining = Math.max(0, total - used);
    
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">Crédits utilisés</span>
                <span className="font-medium">{used} / {total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
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

const ProfileSection = ({ user }: { user: User }) => {
    const [isEditing, setIsEditing] = useState(false);
    const { data, setData, put, processing, errors, reset } = useForm({
        name: user.name,
        email: user.email,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/account/profile', {
            onSuccess: () => {
                setIsEditing(false);
                toast.success('Profil mis à jour avec succès');
            },
            onError: () => {
                toast.error('Erreur lors de la mise à jour');
            },
        });
    };

    const handleCancel = () => {
        reset();
        setIsEditing(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Profil
                    </CardTitle>
                    {!isEditing && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit2 className="h-4 w-4 mr-1" />
                            Modifier
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Nom complet</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className={errors.name ? 'border-red-300' : ''}
                            />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className={errors.email ? 'border-red-300' : ''}
                            />
                            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={processing}>
                                <Save className="h-4 w-4 mr-1" />
                                {processing ? 'Sauvegarde...' : 'Sauvegarder'}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                <X className="h-4 w-4 mr-1" />
                                Annuler
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Nom</span>
                            <span className="font-medium">{user.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Email</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{user.email}</span>
                                {user.email_verified_at && (
                                    <Badge variant="secondary" className="text-xs">Vérifié</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Rôle</span>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? 'Administrateur' : 
                                 user.role === 'member' ? 'Membre' : 'Observateur'}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Membre depuis</span>
                            <span className="font-medium">
                                {new Date(user.created_at).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const OrganizationSection = ({ organization, user }: { organization: Organization; user: User }) => {
    const [isEditing, setIsEditing] = useState(false);
    const { data, setData, put, processing, errors, reset } = useForm({
        name: organization.name,
    });

    const canEdit = user.role === 'admin';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/account/organization', {
            onSuccess: () => {
                setIsEditing(false);
                toast.success('Organisation mise à jour avec succès');
            },
            onError: () => {
                toast.error('Erreur lors de la mise à jour');
            },
        });
    };

    const handleCancel = () => {
        reset();
        setIsEditing(false);
    };

    const getPlanLabel = (plan: string) => {
        switch (plan) {
            case 'basic': return 'Gratuit';
            case 'premium': return 'Premium';
            case 'enterprise': return 'Enterprise';
            default: return plan;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                        <Building2 className="h-5 w-5 mr-2" />
                        Organisation
                    </CardTitle>
                    {canEdit && !isEditing && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit2 className="h-4 w-4 mr-1" />
                            Modifier
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isEditing && canEdit ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="orgName">Nom de l'organisation</Label>
                            <Input
                                id="orgName"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className={errors.name ? 'border-red-300' : ''}
                            />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={processing}>
                                <Save className="h-4 w-4 mr-1" />
                                {processing ? 'Sauvegarde...' : 'Sauvegarder'}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                <X className="h-4 w-4 mr-1" />
                                Annuler
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Nom</span>
                            <span className="font-medium">{organization.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Plan</span>
                            <div className="flex items-center gap-2">
                                <Badge variant={organization.subscription_plan === 'premium' ? 'default' : 'secondary'}>
                                    {organization.subscription_plan === 'premium' && <Crown className="h-3 w-3 mr-1" />}
                                    {getPlanLabel(organization.subscription_plan)}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Créée le</span>
                            <span className="font-medium">
                                {new Date(organization.created_at).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const SecuritySection = () => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Sécurité
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/account/password">
                        <Key className="h-4 w-4 mr-2" />
                        Changer le mot de passe
                    </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/account/two-factor">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Authentification à deux facteurs
                    </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/account/sessions">
                        <Monitor className="h-4 w-4 mr-2" />
                        Sessions actives
                    </a>
                </Button>
            </div>
        </CardContent>
    </Card>
);

const QuickActionsSection = ({ stats }: { stats: PageProps['stats'] }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Actions rapides
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="justify-start" asChild>
                    <a href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Paramètres généraux
                    </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                    <a href="/settings/users">
                        <Users className="h-4 w-4 mr-2" />
                        Gestion des utilisateurs ({stats.users_count})
                    </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                    <a href="/billing/invoices">
                        <FileText className="h-4 w-4 mr-2" />
                        Factures
                    </a>
                </Button>
            </div>
        </CardContent>
    </Card>
);

const SubscriptionSidebar = ({ organization }: { organization: Organization }) => (
    <Card className="lg:sticky lg:top-6">
        <CardHeader>
            <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Abonnement
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="text-center">
                <Badge variant={organization.subscription_plan === 'premium' ? 'default' : 'secondary'} className="mb-3">
                    {organization.subscription_plan === 'premium' && <Crown className="h-3 w-3 mr-1" />}
                    Plan {organization.subscription_plan === 'basic' ? 'Gratuit' : 
                          organization.subscription_plan === 'premium' ? 'Premium' : 'Enterprise'}
                </Badge>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                    {organization.credits_remaining}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                    crédits restants
                </div>
            </div>

            <CreditProgressBar 
                used={organization.credits_used_this_month} 
                total={organization.monthly_credits_included} 
            />

            <Separator />

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Plan actuel</span>
                    <span className="font-medium capitalize">{organization.subscription_plan}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Crédits mensuels</span>
                    <span className="font-medium">{organization.monthly_credits_included}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Utilisés ce mois</span>
                    <span className="font-medium">{organization.credits_used_this_month}</span>
                </div>
            </div>

            <Button className="w-full" asChild>
                <a href="/billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gérer l'abonnement
                </a>
            </Button>
        </CardContent>
    </Card>
);

export default function Account() {
    const { props } = usePage<PageProps>();
    
    // Protection contre les props manquantes avec vérification plus robuste
    if (!props || !props.user || !props.organization) {
        throw new Error('Données utilisateur ou organisation manquantes');
    }

    // Validation des types des props
    if (typeof props.user !== 'object' || typeof props.organization !== 'object') {
        throw new Error('Format des données utilisateur incorrect');
    }

    const { user, organization, stats } = props;

    // Validation des données critiques
    if (!user.id || !organization.id) {
        throw new Error('Identifiants utilisateur ou organisation manquants');
    }

    return (
        <ErrorBoundary>
            <AppLayout>
                <Head title="Mon compte" />
                
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Mon compte</h1>
                        <p className="text-gray-600 mt-2">
                            Gérez vos informations personnelles et les paramètres de votre organisation
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Contenu principal */}
                        <div className="lg:col-span-2 space-y-6">
                            <ProfileSection user={user} />
                            <OrganizationSection organization={organization} user={user} />
                            <SecuritySection />
                            <QuickActionsSection stats={stats} />
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <SubscriptionSidebar organization={organization} />
                        </div>
                    </div>
                </div>
            </AppLayout>
        </ErrorBoundary>
    );
} 