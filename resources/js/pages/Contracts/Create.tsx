import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, Upload, X } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUploadContract } from '@/hooks/useContracts';
import { toast } from 'react-hot-toast';

interface FormData {
    title: string;
    type: 'pro' | 'perso';
    other_party: string;
    amount: string;
    category: string;
    description: string;
    start_date: string;
    end_date: string;
    renewal_notice_days: string;
    is_tacit_renewal: boolean;
    contract_file: File | null;
}

export default function Create() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [formData, setFormData] = useState<FormData>({
        title: '',
        type: 'pro',
        other_party: '',
        amount: '',
        category: 'autre',
        description: '',
        start_date: '',
        end_date: '',
        renewal_notice_days: '30',
        is_tacit_renewal: false,
        contract_file: null,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const uploadMutation = useUploadContract();

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setFormData(prev => ({ ...prev, contract_file: file }));
        
        // Auto-remplir le titre avec le nom du fichier si vide
        if (!formData.title) {
            setFormData(prev => ({ 
                ...prev, 
                title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
            }));
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setFormData(prev => ({ ...prev, contract_file: null }));
    };

    const updateField = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Effacer l'erreur pour ce champ
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Le titre est requis';
        }

        if (!formData.type) {
            newErrors.type = 'Le type est requis';
        }

        if (!formData.category) {
            newErrors.category = 'La catégorie est requise';
        }

        if (!selectedFile) {
            newErrors.contract_file = 'Le fichier du contrat est requis';
        }

        if (formData.amount && isNaN(parseFloat(formData.amount))) {
            newErrors.amount = 'Le montant doit être un nombre valide';
        }

        if (formData.renewal_notice_days && isNaN(parseInt(formData.renewal_notice_days))) {
            newErrors.renewal_notice_days = 'Le préavis doit être un nombre valide';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error('Veuillez corriger les erreurs dans le formulaire');
            return;
        }

        const submitData = new FormData();
        
        // Ajouter tous les champs du formulaire
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'contract_file' && selectedFile) {
                submitData.append(key, selectedFile);
            } else if (key !== 'contract_file' && value !== null) {
                submitData.append(key, value.toString());
            }
        });

        try {
            const result = await uploadMutation.mutateAsync(submitData);
            
            toast.success('Contrat créé avec succès ! Le traitement OCR va commencer.', {
                duration: 5000,
            });
            
            // Rediriger vers la page de détail pour suivre le traitement en temps réel
            router.visit(route('contracts.show', { contract: result.id }));
            
        } catch (error: any) {
            console.error('Erreur lors de la création:', error);
            
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toast.error('Erreurs de validation dans le formulaire');
            } else {
                toast.error('Erreur lors de la création du contrat');
            }
        }
    };

    return (
        <AppLayout>
            <Head title="Nouveau contrat" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <Link
                            href={route('contracts.index')}
                            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Retour aux contrats
                        </Link>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Nouveau contrat</CardTitle>
                            <CardDescription>
                                Ajoutez un nouveau contrat à votre base de données. Le traitement OCR démarrera automatiquement.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Titre */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="title">Titre du contrat *</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => updateField('title', e.target.value)}
                                            placeholder="Ex: Contrat de location bureau"
                                            className={errors.title ? 'border-red-300' : ''}
                                        />
                                        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <Label htmlFor="type">Type de contrat *</Label>
                                        <Select value={formData.type} onValueChange={(value: 'pro' | 'perso') => updateField('type', value)}>
                                            <SelectTrigger className={errors.type ? 'border-red-300' : ''}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pro">Professionnel</SelectItem>
                                                <SelectItem value="perso">Personnel</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
                                    </div>

                                    {/* Catégorie */}
                                    <div>
                                        <Label htmlFor="category">Catégorie *</Label>
                                        <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
                                            <SelectTrigger className={errors.category ? 'border-red-300' : ''}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="assurance">Assurance</SelectItem>
                                                <SelectItem value="telecom">Télécom</SelectItem>
                                                <SelectItem value="energie">Énergie</SelectItem>
                                                <SelectItem value="banque">Banque</SelectItem>
                                                <SelectItem value="immobilier">Immobilier</SelectItem>
                                                <SelectItem value="transport">Transport</SelectItem>
                                                <SelectItem value="autre">Autre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
                                    </div>

                                    {/* Autre partie */}
                                    <div>
                                        <Label htmlFor="other_party">Autre partie</Label>
                                        <Input
                                            id="other_party"
                                            value={formData.other_party}
                                            onChange={(e) => updateField('other_party', e.target.value)}
                                            placeholder="Nom de l'entreprise/personne"
                                            className={errors.other_party ? 'border-red-300' : ''}
                                        />
                                        {errors.other_party && <p className="text-red-600 text-sm mt-1">{errors.other_party}</p>}
                                    </div>

                                    {/* Montant */}
                                    <div>
                                        <Label htmlFor="amount">Montant (€)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => updateField('amount', e.target.value)}
                                            placeholder="0.00"
                                            className={errors.amount ? 'border-red-300' : ''}
                                        />
                                        {errors.amount && <p className="text-red-600 text-sm mt-1">{errors.amount}</p>}
                                    </div>

                                    {/* Préavis */}
                                    <div>
                                        <Label htmlFor="renewal_notice_days">Préavis (jours)</Label>
                                        <Input
                                            id="renewal_notice_days"
                                            type="number"
                                            value={formData.renewal_notice_days}
                                            onChange={(e) => updateField('renewal_notice_days', e.target.value)}
                                            className={errors.renewal_notice_days ? 'border-red-300' : ''}
                                        />
                                        {errors.renewal_notice_days && <p className="text-red-600 text-sm mt-1">{errors.renewal_notice_days}</p>}
                                    </div>

                                    {/* Date de début */}
                                    <div>
                                        <Label>Date de début</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !startDate && "text-muted-foreground",
                                                        errors.start_date && "border-red-300"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {startDate ? format(startDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={startDate}
                                                    onSelect={(date) => {
                                                        setStartDate(date);
                                                        updateField('start_date', date ? format(date, 'yyyy-MM-dd') : '');
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.start_date && <p className="text-red-600 text-sm mt-1">{errors.start_date}</p>}
                                    </div>

                                    {/* Date de fin */}
                                    <div>
                                        <Label>Date de fin</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !endDate && "text-muted-foreground",
                                                        errors.end_date && "border-red-300"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {endDate ? format(endDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={endDate}
                                                    onSelect={(date) => {
                                                        setEndDate(date);
                                                        updateField('end_date', date ? format(date, 'yyyy-MM-dd') : '');
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.end_date && <p className="text-red-600 text-sm mt-1">{errors.end_date}</p>}
                                    </div>

                                    {/* Description */}
                                    <div className="md:col-span-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            placeholder="Description du contrat..."
                                            rows={3}
                                            className={errors.description ? 'border-red-300' : ''}
                                        />
                                        {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
                                    </div>

                                    {/* Renouvellement tacite */}
                                    <div className="md:col-span-2">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="is_tacit_renewal"
                                                checked={formData.is_tacit_renewal}
                                                onChange={(e) => updateField('is_tacit_renewal', e.target.checked)}
                                                className="rounded border-gray-300"
                                            />
                                            <Label htmlFor="is_tacit_renewal">Renouvellement tacite</Label>
                                        </div>
                                    </div>

                                    {/* Upload fichier */}
                                    <div className="md:col-span-2">
                                        <Label>Fichier du contrat *</Label>
                                        <div className="mt-2">
                                            {!selectedFile ? (
                                                <div className={cn(
                                                    "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                                                    errors.contract_file ? "border-red-300" : "border-gray-300 hover:border-gray-400"
                                                )}>
                                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="mt-4">
                                                        <label htmlFor="file-upload" className="cursor-pointer">
                                                            <span className="mt-2 block text-sm font-medium text-gray-900">
                                                                Glissez un fichier ici ou cliquez pour sélectionner
                                                            </span>
                                                            <input
                                                                id="file-upload"
                                                                type="file"
                                                                className="sr-only"
                                                                accept=".pdf,.jpg,.jpeg,.png"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleFileSelect(file);
                                                                }}
                                                            />
                                                        </label>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            PDF, JPG, PNG jusqu'à 10MB
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                                    <div className="flex items-center space-x-3">
                                                        <Upload className="h-5 w-5 text-gray-400" />
                                                        <div>
                                                            <span className="text-sm font-medium">{selectedFile.name}</span>
                                                            <p className="text-xs text-gray-500">
                                                                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={removeFile}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                            {errors.contract_file && <p className="text-red-600 text-sm mt-1">{errors.contract_file}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4">
                                    <Link href={route('contracts.index')}>
                                        <Button type="button" variant="outline" disabled={uploadMutation.isPending}>
                                            Annuler
                                        </Button>
                                    </Link>
                                    <Button type="submit" disabled={uploadMutation.isPending}>
                                        {uploadMutation.isPending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Création en cours...
                                            </>
                                        ) : (
                                            'Créer le contrat'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
} 