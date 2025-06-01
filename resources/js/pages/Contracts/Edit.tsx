import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { ArrowLeft, Save, AlertTriangle, FileText } from 'lucide-react';
import { Link, router } from '@inertiajs/react';
import { toast } from 'react-hot-toast';

interface ContractData {
    id: number;
    title: string;
    type: 'pro' | 'perso';
    category: string;
    status: string;
    status_color: string;
    ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
    ai_status: 'pending' | 'processing' | 'completed' | 'failed';
    file_original_name: string;
    amount: number;
    currency: string;
    start_date: string | null;
    end_date: string | null;
    next_renewal_date: string | null;
    notice_period_days: number;
    is_tacit_renewal: boolean;
    is_expiring: boolean;
    days_until_renewal: number | null;
    has_ocr_text: boolean;
    ocr_text_length: number;
    has_ai_analysis: boolean;
    ai_analysis: any;
    alert_type: string | null;
    needs_alert: boolean;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    links?: {
        self: string;
        download: string;
        view: string;
        reprocess: string;
        analysis: string;
        ocr_text: string;
    };
}

interface EditProps {
    contract: {
        data: ContractData;
        meta?: any;
    };
}

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
};

// Composant d'erreur réutilisable
const ErrorMessage = ({ message }: { message: string }) => (
    <div className="flex items-center mt-1 text-sm text-red-600">
        <AlertCircle className="w-4 h-4 mr-1" />
        {message}
    </div>
);

export default function Edit({ contract }: EditProps) {
    // Debug : vérifier si le contrat a un ID
    console.log('Contract ID:', contract.data.id, 'Contract:', contract.data);
    console.log('Props reçues:', { contract });
    console.log('contract keys:', Object.keys(contract || {}));
    
    // Si pas d'ID, afficher une erreur 
    if (!contract.data.id) {
        console.error('ERREUR: Contrat sans ID reçu!', contract);
        return <div className="flex items-center justify-center p-8">
            <ErrorMessage message="Erreur: Contrat non trouvé" />
        </div>;
    }
    
    const { data, setData, put, processing, errors, isDirty } = useForm({
        title: contract.data.title || '',
        type: contract.data.type || 'perso',
        category: contract.data.category || 'autre',
        status: contract.data.status || 'active',
        amount: contract.data.amount || 0,
        start_date: formatDate(contract.data.start_date),
        end_date: formatDate(contract.data.end_date),
        next_renewal_date: formatDate(contract.data.next_renewal_date),
        notice_period_days: contract.data.notice_period_days || 30,
        is_tacit_renewal: contract.data.is_tacit_renewal || false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Vérification de sécurité renforcée
        const contractId = contract.data.id;
        if (!contractId) {
            console.error('ID du contrat manquant dans handleSubmit:', { contract, contractId });
            toast.error('Erreur : ID du contrat manquant');
            return;
        }
        
        // Utiliser l'URL directe au lieu de route() pour éviter Ziggy
        put(`/contracts/${contractId}`, {
            onSuccess: () => {
                toast.success('Contrat mis à jour avec succès !');
                router.visit(`/contracts/${contractId}`);
            },
            onError: (errors) => {
                console.error('Erreurs de validation:', errors);
                toast.error('Erreur lors de la mise à jour du contrat');
            },
        });
    };

    const categories = [
        { value: 'energie', label: 'Énergie' },
        { value: 'assurance', label: 'Assurance' },
        { value: 'telephonie', label: 'Téléphonie' },
        { value: 'internet', label: 'Internet' },
        { value: 'abonnement', label: 'Abonnement' },
        { value: 'location', label: 'Location' },
        { value: 'travail', label: 'Travail' },
        { value: 'autre', label: 'Autre' },
    ];

    return (
        <AppLayout>
            <Head title={`Modifier ${contract.data.title}`} />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <Link
                                href={`/contracts/${contract.data.id || ''}`}
                                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Retour au contrat
                            </Link>
                        </div>

                        <div className="mt-4">
                            <h1 className="text-3xl font-bold text-gray-900">
                                Modifier le contrat
                            </h1>
                            <div className="mt-2 flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{contract.data.file_original_name}</span>
                                </div>
                                <Badge variant={contract.data.type === 'pro' ? 'default' : 'secondary'}>
                                    {contract.data.type === 'pro' ? 'Professionnel' : 'Personnel'}
                                </Badge>
                                {contract.data.is_tacit_renewal && (
                                    <Badge variant="destructive">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Reconduction tacite
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Informations générales */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations générales</CardTitle>
                                <CardDescription>
                                    Modifiez les informations de base du contrat
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Titre du contrat *</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            className={errors.title ? 'border-red-300' : ''}
                                            placeholder="Nom du contrat"
                                            required
                                        />
                                        {errors.title && <ErrorMessage message={errors.title} />}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type de contrat *</Label>
                                        <Select
                                            value={data.type}
                                            onValueChange={(value: 'pro' | 'perso') => setData('type', value)}
                                            required
                                        >
                                            <SelectTrigger className={errors.type ? 'border-red-300' : ''}>
                                                <SelectValue placeholder="Sélectionner le type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pro">Professionnel</SelectItem>
                                                <SelectItem value="perso">Personnel</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.type && <ErrorMessage message={errors.type} />}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="category">Catégorie</Label>
                                        <Select
                                            value={data.category}
                                            onValueChange={(value) => setData('category', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une catégorie" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.value} value={category.value}>
                                                        {category.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="status">Statut</Label>
                                        <Select
                                            value={data.status}
                                            onValueChange={(value) => setData('status', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Actif</SelectItem>
                                                <SelectItem value="expired">Expiré</SelectItem>
                                                <SelectItem value="cancelled">Annulé</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Informations financières */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations financières</CardTitle>
                                <CardDescription>
                                    Montant et conditions financières du contrat
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Montant (€)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.amount}
                                            onChange={(e) => setData('amount', parseFloat(e.target.value) || 0)}
                                            className={errors.amount ? 'border-red-300' : ''}
                                            placeholder="0.00"
                                        />
                                        {errors.amount && <ErrorMessage message={errors.amount} />}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notice_period_days">Préavis (jours)</Label>
                                        <Input
                                            id="notice_period_days"
                                            type="number"
                                            min="0"
                                            value={data.notice_period_days}
                                            onChange={(e) => setData('notice_period_days', parseInt(e.target.value) || 0)}
                                            className={errors.notice_period_days ? 'border-red-300' : ''}
                                            placeholder="30"
                                        />
                                        {errors.notice_period_days && <ErrorMessage message={errors.notice_period_days} />}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_tacit_renewal"
                                        checked={data.is_tacit_renewal}
                                        onCheckedChange={(checked) => setData('is_tacit_renewal', checked as boolean)}
                                    />
                                    <Label htmlFor="is_tacit_renewal" className="flex items-center space-x-2 cursor-pointer">
                                        <span>Reconduction tacite</span>
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dates importantes */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Dates importantes</CardTitle>
                                <CardDescription>
                                    Gestion des échéances et renouvellements
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="start_date">Date de début</Label>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            value={data.start_date}
                                            onChange={(e) => setData('start_date', e.target.value)}
                                            className={errors.start_date ? 'border-red-300' : ''}
                                        />
                                        {errors.start_date && <ErrorMessage message={errors.start_date} />}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="end_date">Date de fin</Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            value={data.end_date}
                                            onChange={(e) => setData('end_date', e.target.value)}
                                            className={errors.end_date ? 'border-red-300' : ''}
                                        />
                                        {errors.end_date && <ErrorMessage message={errors.end_date} />}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="next_renewal_date">Prochain renouvellement</Label>
                                        <Input
                                            id="next_renewal_date"
                                            type="date"
                                            value={data.next_renewal_date}
                                            onChange={(e) => setData('next_renewal_date', e.target.value)}
                                            className={errors.next_renewal_date ? 'border-red-300' : ''}
                                        />
                                        {errors.next_renewal_date && <ErrorMessage message={errors.next_renewal_date} />}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <Button 
                                variant="outline" 
                                asChild
                                disabled={processing}
                            >
                                <Link href={`/contracts/${contract.data.id || ''}`}>
                                    Annuler
                                </Link>
                            </Button>

                            <div className="flex items-center space-x-3">
                                {isDirty && (
                                    <span className="text-sm text-orange-600 font-medium">
                                        • Modifications non sauvegardées
                                    </span>
                                )}
                                <Button type="submit" disabled={processing || !isDirty}>
                                    <Save className="w-4 h-4 mr-2" />
                                    {processing ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
} 