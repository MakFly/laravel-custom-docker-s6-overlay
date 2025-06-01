import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Download, FileText, ArrowLeft, CheckCircle, X, Clock } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Auth {
    user: User;
}

interface Invoice {
    id: string;
    date: string;
    total: number;
    currency: string;
    status: string;
    download_url: string;
}

interface InvoicesProps {
    auth: Auth;
    invoices: Invoice[];
    error?: string;
}

export default function Invoices({ auth, invoices, error }: InvoicesProps) {
    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency.toLowerCase()
        }).format(amount / 100); // Stripe amounts are in cents
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
        switch (status) {
            case 'paid':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'open':
                return `${baseClasses} bg-blue-100 text-blue-800`;
            case 'void':
                return `${baseClasses} bg-gray-100 text-gray-800`;
            case 'uncollectible':
                return `${baseClasses} bg-red-100 text-red-800`;
            default:
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <CheckCircle className="w-4 h-4 mr-1" />;
            case 'open':
                return <Clock className="w-4 h-4 mr-1" />;
            case 'void':
            case 'uncollectible':
                return <X className="w-4 h-4 mr-1" />;
            default:
                return <Clock className="w-4 h-4 mr-1" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid':
                return 'Payée';
            case 'open':
                return 'En attente';
            case 'void':
                return 'Annulée';
            case 'uncollectible':
                return 'Impayée';
            default:
                return status;
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Invoices</h2>}
        >
            <Head title="Invoices" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            Invoices List
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
} 