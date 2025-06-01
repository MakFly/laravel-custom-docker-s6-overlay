import { Bell, BarChart3, CheckCircle, Upload } from 'lucide-react';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface OnboardingFormData {
    company_name: string;
    company_size: string;
    contract_types: string[];
    goals: string[];
}

interface Step {
    title: string;
    description: string;
}

interface CompanySize {
    value: string;
    label: string;
}

interface ContractType {
    value: string;
    label: string;
    icon: string;
}

interface Goal {
    value: string;
    label: string;
    icon: string;
}

export default function Onboarding() {
    const [currentStep, setCurrentStep] = useState<number>(1);
    const { data, setData, post, processing } = useForm<OnboardingFormData>({
        company_name: '',
        company_size: '',
        contract_types: [],
        goals: [],
    });

    const steps: Step[] = [
        {
            title: 'Parlez-nous de votre entreprise',
            description: 'Pour personnaliser votre expérience',
        },
        {
            title: 'Vos types de contrats',
            description: 'Quels contrats souhaitez-vous surveiller ?',
        },
        {
            title: 'Vos objectifs',
            description: 'Comment Préavis peut-il vous aider ?',
        },
        {
            title: 'Votre premier contrat',
            description: 'Uploadez un contrat pour voir la magie opérer',
        },
    ];

    const companySize: CompanySize[] = [
        { value: 'freelance', label: 'Freelance / Indépendant' },
        { value: 'startup', label: 'Startup (1-10 employés)' },
        { value: 'sme', label: 'PME (11-50 employés)' },
        { value: 'mid', label: 'Entreprise (51-200 employés)' },
        { value: 'enterprise', label: 'Grande entreprise (200+)' },
    ];

    const contractTypes: ContractType[] = [
        { value: 'insurance', label: 'Assurances', icon: '🛡️' },
        { value: 'telecom', label: 'Télécommunications', icon: '📱' },
        { value: 'energy', label: 'Énergie', icon: '⚡' },
        { value: 'software', label: 'Logiciels / SaaS', icon: '💻' },
        { value: 'lease', label: 'Baux / Location', icon: '🏢' },
        { value: 'banking', label: 'Services bancaires', icon: '🏦' },
        { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
        { value: 'other', label: 'Autres', icon: '📄' },
    ];

    const goals: Goal[] = [
        { value: 'save_money', label: "Économiser de l'argent", icon: '💰' },
        { value: 'avoid_renewal', label: 'Éviter les reconductions automatiques', icon: '🚫' },
        { value: 'organize', label: 'Organiser mes contrats', icon: '📚' },
        { value: 'compliance', label: 'Respecter la conformité', icon: '✅' },
        { value: 'negotiate', label: 'Préparer les négociations', icon: '🤝' },
        { value: 'reporting', label: 'Avoir des rapports détaillés', icon: '📊' },
    ];

    const handleNext = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        } else {
            // Redirect to dashboard
            window.location.href = '/dashboard';
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const toggleSelection = (field: keyof Pick<OnboardingFormData, 'contract_types' | 'goals'>, value: string) => {
        const current = data[field];
        const updated = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        setData(field, updated);
    };

    return (
        <>
            <Head title="Configuration - Préavis" />

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm">
                    <div className="mx-auto max-w-4xl px-4 py-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-indigo-600">Préavis</h1>
                            <div className="text-sm text-gray-500">Étape {currentStep} sur 4</div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mx-auto max-w-4xl px-4 py-8">
                    <div className="mb-8">
                        <div className="flex items-center">
                            {steps.map((step, index) => (
                                <div key={index} className="flex items-center">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                                            index + 1 <= currentStep ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 text-gray-300'
                                        }`}
                                    >
                                        {index + 1 < currentStep ? <CheckCircle className="h-5 w-5" /> : index + 1}
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`mx-4 h-0.5 flex-1 ${index + 1 < currentStep ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="rounded-lg bg-white p-8 shadow-sm">
                        <div className="mb-8 text-center">
                            <h2 className="mb-2 text-2xl font-bold text-gray-900">{steps[currentStep - 1].title}</h2>
                            <p className="text-gray-600">{steps[currentStep - 1].description}</p>
                        </div>

                        {/* Step 1: Company Info */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Nom de votre entreprise</label>
                                    <input
                                        type="text"
                                        value={data.company_name}
                                        onChange={(e) => setData('company_name', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Ex: Ma Super Entreprise"
                                    />
                                </div>
                                <div>
                                    <label className="mb-4 block text-sm font-medium text-gray-700">Taille de votre entreprise</label>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {companySize.map((size) => (
                                            <button
                                                key={size.value}
                                                type="button"
                                                onClick={() => setData('company_size', size.value)}
                                                className={`rounded-lg border p-4 text-left transition ${
                                                    data.company_size === size.value
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                {size.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Contract Types */}
                        {currentStep === 2 && (
                            <div>
                                <p className="mb-6 text-center text-sm text-gray-500">Sélectionnez tous les types qui vous intéressent</p>
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    {contractTypes.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => toggleSelection('contract_types', type.value)}
                                            className={`rounded-lg border p-4 text-center transition ${
                                                data.contract_types.includes(type.value)
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        >
                                            <div className="mb-2 text-2xl">{type.icon}</div>
                                            <div className="text-sm font-medium">{type.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Goals */}
                        {currentStep === 3 && (
                            <div>
                                <p className="mb-6 text-center text-sm text-gray-500">Quels sont vos objectifs principaux ?</p>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {goals.map((goal) => (
                                        <button
                                            key={goal.value}
                                            type="button"
                                            onClick={() => toggleSelection('goals', goal.value)}
                                            className={`flex items-center rounded-lg border p-4 text-left transition ${
                                                data.goals.includes(goal.value)
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        >
                                            <span className="mr-3 text-2xl">{goal.icon}</span>
                                            <span className="font-medium">{goal.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 4: First Contract */}
                        {currentStep === 4 && (
                            <div className="text-center">
                                <div className="mb-8">
                                    <Upload className="mx-auto mb-4 h-16 w-16 text-indigo-600" />
                                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Uploadez votre premier contrat</h3>
                                    <p className="text-gray-600">Glissez-déposez un fichier PDF ou cliquez pour sélectionner</p>
                                </div>

                                <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 transition hover:border-indigo-400">
                                    <input type="file" className="hidden" accept=".pdf" />
                                    <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                    <p className="text-gray-600">Cliquez ou glissez votre contrat PDF ici</p>
                                    <p className="mt-2 text-sm text-gray-400">Formats acceptés: PDF (max 10MB)</p>
                                </div>

                                <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                    <p className="text-sm text-yellow-800">
                                        💡 <strong>Astuce:</strong> Vous pourrez toujours ajouter plus de contrats plus tard depuis votre tableau de
                                        bord
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="mt-8 flex justify-between border-t border-gray-200 pt-6">
                            <button
                                type="button"
                                onClick={handleBack}
                                className={`rounded-lg border border-gray-300 px-6 py-2 font-medium transition ${
                                    currentStep === 1 ? 'cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                                disabled={currentStep === 1}
                            >
                                Précédent
                            </button>

                            <button
                                type="button"
                                onClick={handleNext}
                                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-700"
                            >
                                {currentStep === 4 ? 'Terminer' : 'Suivant'}
                            </button>
                        </div>
                    </div>

                    {/* Benefits Reminder */}
                    <div className="mt-8 grid gap-6 md:grid-cols-3">
                        <div className="text-center">
                            <Bell className="mx-auto mb-2 h-8 w-8 text-indigo-600" />
                            <h4 className="font-semibold text-gray-900">Alertes automatiques</h4>
                            <p className="text-sm text-gray-600">Ne ratez plus jamais une échéance</p>
                        </div>
                        <div className="text-center">
                            <Upload className="mx-auto mb-2 h-8 w-8 text-indigo-600" />
                            <h4 className="font-semibold text-gray-900">OCR intelligent</h4>
                            <p className="text-sm text-gray-600">Extraction automatique des données</p>
                        </div>
                        <div className="text-center">
                            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-indigo-600" />
                            <h4 className="font-semibold text-gray-900">Vue d'ensemble</h4>
                            <p className="text-sm text-gray-600">Tous vos contrats en un coup d'œil</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 