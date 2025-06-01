import React from 'react';
import { Search, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface NotFoundProps {
    message?: string;
    showLayout?: boolean;
}

const NotFoundContent: React.FC<{ message?: string }> = ({ message }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <Search className="h-16 w-16 text-gray-400" />
                </div>
                <CardTitle className="text-6xl font-bold text-gray-400 mb-2">
                    404
                </CardTitle>
                <CardTitle className="text-2xl text-gray-600">
                    Page non trouvée
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">
                        {message || "La page que vous cherchez n'existe pas ou a été déplacée."}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => window.history.back()} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard">
                            <Home className="h-4 w-4 mr-2" />
                            Accueil
                        </Link>
                    </Button>
                </div>

                <div className="text-center">
                    <p className="text-sm text-gray-500">
                        Suggestions :
                    </p>
                    <div className="mt-2 space-y-1">
                        <Link href="/contracts" className="block text-blue-600 hover:text-blue-800 text-sm">
                            Voir mes contrats
                        </Link>
                        <Link href="/dashboard" className="block text-blue-600 hover:text-blue-800 text-sm">
                            Tableau de bord
                        </Link>
                        <Link href="/account" className="block text-blue-600 hover:text-blue-800 text-sm">
                            Mon compte
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
);

export default function NotFound({ message, showLayout = true }: NotFoundProps) {
    if (showLayout) {
        return (
            <AppLayout>
                <Head title="Page non trouvée" />
                <NotFoundContent message={message} />
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Page non trouvée" />
            <NotFoundContent message={message} />
        </>
    );
} 