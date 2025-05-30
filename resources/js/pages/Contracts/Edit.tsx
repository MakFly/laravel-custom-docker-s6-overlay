import { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, Upload, X, FileText } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Contract } from '@/types/contract';

interface Props {
    contract: Contract;
}

interface FormData {
    title: string;
    type: 'pro' | 'perso';
    other_party: string;
    amount: string;
    description: string;
    start_date: string;
    end_date: string;
    renewal_notice_days: string;
    is_tacit_renewal: boolean;
    contract_file?: File | null;
}

export default function Edit({ contract }: Props) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();

    const { data, setData, put, errors, processing } = useForm<FormData>({
        title: contract.title || '',
        type: contract.type || 'pro',
        other_party: contract.other_party || '',
        amount: contract.amount?.toString() || '',
        description: contract.description || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        renewal_notice_days: contract.renewal_notice_days?.toString() || '30',
        is_tacit_renewal: contract.is_tacit_renewal || false,
        contract_file: null,
    });

    useEffect(() => {
        if (contract.start_date) {
            setStartDate(parseISO(contract.start_date));
        }
        if (contract.end_date) {
            setEndDate(parseISO(contract.end_date));
        }
    }, [contract]);

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setData('contract_file', file);
    };

    const removeFile = () => {
        setSelectedFile(null);
        setData('contract_file', null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/contracts/${contract.id}`);
    };

    return (
        <AppLayout>
            <Head title="Modifier le contrat" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <Link
                            href={`/contracts/${contract.id}`}
                            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Retour au contrat
                        </Link>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Modifier le contrat</CardTitle>
                            <CardDescription>
                                Modifiez les informations de ce contrat
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
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Ex: Contrat de location bureau"
                                            className={errors.title ? 'border-red-300' : ''}
                                        />
                                        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <Label htmlFor="type">Type de contrat *</Label>
                                        <Select value={data.type} onValueChange={(value: 'pro' | 'perso') => setData('type', value)}>
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

                                    {/* Autre partie */}
                                    <div>
                                        <Label htmlFor="other_party">Autre partie</Label>
                                        <Input
                                            id="other_party"
                                            value={data.other_party}
                                            onChange={(e) => setData('other_party', e.target.value)}
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
                                            value={data.amount}
                                            onChange={(e) => setData('amount', e.target.value)}
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
                                            value={data.renewal_notice_days}
                                            onChange={(e) => setData('renewal_notice_days', e.target.value)}
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
                                                        setData('start_date', date ? format(date, 'yyyy-MM-dd') : '');
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
                                                        setData('end_date', date ? format(date, 'yyyy-MM-dd') : '');
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
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
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
                                                checked={data.is_tacit_renewal}
                                                onChange={(e) => setData('is_tacit_renewal', e.target.checked)}
                                                className="rounded border-gray-300"
                                            />
                                            <Label htmlFor="is_tacit_renewal">Renouvellement tacite</Label>
                                        </div>
                                    </div>

                                    {/* Fichier actuel et remplacement */}
                                    <div className="md:col-span-2">
                                        <Label>Fichier du contrat</Label>
                                        
                                        {contract.file_path && !selectedFile && (
                                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                                                        <span className="text-sm text-blue-800">
                                                            Fichier actuel: {contract.file_path.split('/').pop()}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => document.getElementById('file-upload')?.click()}
                                                    >
                                                        Remplacer
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-2">
                                            {!selectedFile && !contract.file_path ? (
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                                            ) : selectedFile ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                                                    <span className="text-sm text-green-800">
                                                        Nouveau fichier: {selectedFile.name}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={removeFile}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
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
                                            )}
                                            {errors.contract_file && <p className="text-red-600 text-sm mt-1">{errors.contract_file}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4">
                                    <Link href={`/contracts/${contract.id}`}>
                                        <Button type="button" variant="outline">
                                            Annuler
                                        </Button>
                                    </Link>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Sauvegarde...' : 'Sauvegarder'}
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