import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@inertiajs/react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<
    React.PropsWithChildren<{}>,
    ErrorBoundaryState
> {
    constructor(props: React.PropsWithChildren<{}>) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({
            error,
            errorInfo,
        });

        // Log l'erreur côté serveur
        this.logErrorToServer(error, errorInfo);
    }

    logErrorToServer = async (error: Error, errorInfo: React.ErrorInfo) => {
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            // Collecte d'informations supplémentaires pour le debug
            const debugInfo = {
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
                referrer: document.referrer,
                inertiaPageProps: (window as any).page?.props ? Object.keys((window as any).page.props) : undefined,
            };
            
            await fetch('/api/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
                },
                body: JSON.stringify({
                    error: {
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                    },
                    errorInfo: {
                        componentStack: errorInfo.componentStack,
                    },
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    debug: debugInfo,
                }),
            });
        } catch (logError) {
            console.error('Failed to log error to server:', logError);
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback 
                error={this.state.error} 
                onReload={this.handleReload}
                onReset={this.handleReset}
            />;
        }

        return this.props.children;
    }
}

interface ErrorFallbackProps {
    error: Error | null;
    onReload: () => void;
    onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReload, onReset }) => {
    const isDevelopment = import.meta.env.DEV;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <AlertTriangle className="h-16 w-16 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl text-red-600">
                        Une erreur inattendue s'est produite
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <p className="text-gray-600 mb-4">
                            Nous sommes désolés, quelque chose s'est mal passé. 
                            L'erreur a été automatiquement signalée à notre équipe.
                        </p>
                    </div>

                    {isDevelopment && error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h3 className="font-medium text-red-800 mb-2">Détails de l'erreur (développement):</h3>
                            <pre className="text-sm text-red-700 whitespace-pre-wrap overflow-auto max-h-40">
                                {error.message}
                                {error.stack && '\n\nStack trace:\n' + error.stack}
                            </pre>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={onReset} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Réessayer
                        </Button>
                        <Button onClick={onReload}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Recharger la page
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/dashboard">
                                <Home className="h-4 w-4 mr-2" />
                                Retour à l'accueil
                            </Link>
                        </Button>
                    </div>

                    <div className="text-center text-sm text-gray-500">
                        Si le problème persiste, contactez le support technique.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ErrorBoundary; 