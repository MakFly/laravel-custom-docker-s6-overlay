import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    User, 
    Building, 
    Mail, 
    Calendar, 
    Shield, 
    Settings, 
    CreditCard,
    Users,
    Edit,
    Save,
    X
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'react-hot-toast';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    subscription_plan: string;
    ai_credits_remaining: number;
    ai_credits_monthly_limit: number;
    created_at: string;
    email_verified_at: string;
}

interface Organization {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    users_count: number;
}

interface AccountProps {
    user: User;
    organization: Organization;
}

export default function Account({ user, organization }: AccountProps) {
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingOrg, setIsEditingOrg] = useState(false);

    // Formulaires
    const profileForm = useForm({
        name: user.name,
        email: user.email,
    });

    const orgForm = useForm({
        name: organization.name,
    });

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        profileForm.put('/account/profile', {
            onSuccess: () => {
                setIsEditingProfile(false);
                toast.success('Profil mis à jour');
            },
            onError: () => {
                toast.error('Erreur lors de la mise à jour');
            }
        });
    };

    const handleOrgSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        orgForm.put('/account/organization', {
            onSuccess: () => {
                setIsEditingOrg(false);
                toast.success('Organisation mise à jour');
            },
            onError: () => {
                toast.error('Erreur lors de la mise à jour');
            }
        });
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'default';
            case 'user': return 'secondary';
            case 'viewer': return 'outline';
            default: return 'outline';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrateur';
            case 'user': return 'Utilisateur';
            case 'viewer': return 'Lecteur';
            default: return role;
        }
    };

    const getPlanLabel = (plan: string) => {
        switch (plan) {
            case 'premium': return 'Premium';
            case 'basic': return 'Basic';
            case 'enterprise': return 'Enterprise';
            default: return 'Gratuit';
        }
    };

    return (
        <AppLayout>
            <Head title="Mon Compte" />
            
            <div className="py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* En-tête */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Compte</h1>
                        <p className="text-gray-600">Gérez vos informations personnelles et les paramètres de votre organisation</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Colonne principale */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Informations du profil */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="flex items-center">
                                        <User className="h-5 w-5 mr-2" />
                                        Informations personnelles
                                    </CardTitle>
                                    {!isEditingProfile ? (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setIsEditingProfile(true)}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Modifier
                                        </Button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                    setIsEditingProfile(false);
                                                    profileForm.reset();
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="sm"
                                                onClick={handleProfileSubmit}
                                                disabled={profileForm.processing}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                Sauvegarder
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {!isEditingProfile ? (
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Nom complet</Label>
                                                <p className="text-gray-900 font-medium">{user.name}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Adresse email</Label>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-gray-900 font-medium">{user.email}</p>
                                                    {user.email_verified_at ? (
                                                        <Badge variant="default" className="text-xs">
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            Vérifié
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Non vérifié
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Rôle</Label>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={getRoleBadgeVariant(user.role)}>
                                                        {getRoleLabel(user.role)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Membre depuis</Label>
                                                <p className="text-gray-900 font-medium">
                                                    {new Date(user.created_at).toLocaleDateString('fr-FR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                                            <div>
                                                <Label htmlFor="name">Nom complet</Label>
                                                <Input
                                                    id="name"
                                                    value={profileForm.data.name}
                                                    onChange={(e) => profileForm.setData('name', e.target.value)}
                                                    className={profileForm.errors.name ? 'border-red-300' : ''}
                                                />
                                                {profileForm.errors.name && (
                                                    <p className="text-red-600 text-sm mt-1">{profileForm.errors.name}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="email">Adresse email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={profileForm.data.email}
                                                    onChange={(e) => profileForm.setData('email', e.target.value)}
                                                    className={profileForm.errors.email ? 'border-red-300' : ''}
                                                />
                                                {profileForm.errors.email && (
                                                    <p className="text-red-600 text-sm mt-1">{profileForm.errors.email}</p>
                                                )}
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Informations de l'organisation */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="flex items-center">
                                        <Building className="h-5 w-5 mr-2" />
                                        Organisation
                                    </CardTitle>
                                    {user.role === 'admin' && !isEditingOrg ? (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setIsEditingOrg(true)}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Modifier
                                        </Button>
                                    ) : user.role === 'admin' && isEditingOrg ? (
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                    setIsEditingOrg(false);
                                                    orgForm.reset();
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="sm"
                                                onClick={handleOrgSubmit}
                                                disabled={orgForm.processing}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                Sauvegarder
                                            </Button>
                                        </div>
                                    ) : null}
                                </CardHeader>
                                <CardContent>
                                    {!isEditingOrg ? (
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Nom de l'organisation</Label>
                                                <p className="text-gray-900 font-medium">{organization.name}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Identifiant</Label>
                                                <p className="text-gray-900 font-mono text-sm">{organization.slug}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Nombre d'utilisateurs</Label>
                                                <p className="text-gray-900 font-medium">{organization.users_count}</p>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-500">Créée le</Label>
                                                <p className="text-gray-900 font-medium">
                                                    {new Date(organization.created_at).toLocaleDateString('fr-FR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleOrgSubmit} className="space-y-4">
                                            <div>
                                                <Label htmlFor="org_name">Nom de l'organisation</Label>
                                                <Input
                                                    id="org_name"
                                                    value={orgForm.data.name}
                                                    onChange={(e) => orgForm.setData('name', e.target.value)}
                                                    className={orgForm.errors.name ? 'border-red-300' : ''}
                                                />
                                                {orgForm.errors.name && (
                                                    <p className="text-red-600 text-sm mt-1">{orgForm.errors.name}</p>
                                                )}
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Sécurité et confidentialité */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Shield className="h-5 w-5 mr-2" />
                                        Sécurité et confidentialité
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <h3 className="font-medium">Mot de passe</h3>
                                            <p className="text-sm text-gray-600">Modifiez votre mot de passe</p>
                                        </div>
                                        <Button variant="outline" asChild>
                                            <Link href="/account/password">
                                                Changer
                                            </Link>
                                        </Button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <h3 className="font-medium">Authentification à deux facteurs</h3>
                                            <p className="text-sm text-gray-600">Sécurisez votre compte avec 2FA</p>
                                        </div>
                                        <Button variant="outline" asChild>
                                            <Link href="/account/2fa">
                                                Configurer
                                            </Link>
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <h3 className="font-medium">Sessions actives</h3>
                                            <p className="text-sm text-gray-600">Gérez vos sessions de connexion</p>
                                        </div>
                                        <Button variant="outline" asChild>
                                            <Link href="/account/sessions">
                                                Voir
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Plan et crédits */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <CreditCard className="h-5 w-5 mr-2" />
                                        Abonnement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-center">
                                        <Badge className="mb-2 bg-gradient-to-r from-purple-600 to-blue-600">
                                            {getPlanLabel(user.subscription_plan)}
                                        </Badge>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {user.ai_credits_remaining}
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            crédits IA restants
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            sur {user.ai_credits_monthly_limit} ce mois
                                        </p>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                            style={{ 
                                                width: `${(user.ai_credits_remaining / user.ai_credits_monthly_limit) * 100}%` 
                                            }}
                                        ></div>
                                    </div>

                                    <Button variant="outline" className="w-full" asChild>
                                        <Link href="/billing">
                                            <CreditCard className="h-4 w-4 mr-2" />
                                            Gérer l'abonnement
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Actions rapides */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Settings className="h-5 w-5 mr-2" />
                                        Actions rapides
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button variant="outline" className="w-full" asChild>
                                        <Link href="/settings">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Paramètres
                                        </Link>
                                    </Button>

                                    {user.role === 'admin' && (
                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href="/account/users">
                                                <Users className="h-4 w-4 mr-2" />
                                                Gérer les utilisateurs
                                            </Link>
                                        </Button>
                                    )}

                                    <Button variant="outline" className="w-full" asChild>
                                        <Link href="/billing/invoices">
                                            <Mail className="h-4 w-4 mr-2" />
                                            Factures
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Statistiques */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Calendar className="h-5 w-5 mr-2" />
                                        Activité
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-gray-900">
                                            {new Date().getFullYear() - new Date(user.created_at).getFullYear() || '< 1'}
                                        </div>
                                        <p className="text-sm text-gray-600">année(s) avec nous</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 