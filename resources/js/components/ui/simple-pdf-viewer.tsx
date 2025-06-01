import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Download,
    Eye,
    ExternalLink,
    AlertTriangle
} from 'lucide-react';

interface SimplePDFViewerProps {
    file: string;
    title?: string;
    downloadUrl?: string;
    className?: string;
}

export function SimplePDFViewer({ file, title, downloadUrl, className = '' }: SimplePDFViewerProps) {
    const [error, setError] = useState<boolean>(false);

    const handleIframeError = () => {
        setError(true);
    };

    if (error) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                        <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Impossible d'afficher le PDF
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Votre navigateur ne peut pas afficher ce fichier PDF directement.
                        </p>
                        <div className="space-x-2">
                            {downloadUrl && (
                                <Button variant="outline" asChild>
                                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4 mr-2" />
                                        Télécharger le PDF
                                    </a>
                                </Button>
                            )}
                            <Button asChild>
                                <a href={file} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ouvrir dans un nouvel onglet
                                </a>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                        <Eye className="w-5 h-5 mr-2" />
                        {title || 'Document PDF'}
                    </CardTitle>
                    
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                            <a href={file} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Ouvrir
                            </a>
                        </Button>
                        {downloadUrl && (
                            <Button variant="outline" size="sm" asChild>
                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-1" />
                                    Télécharger
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-0">
                <div className="relative bg-gray-100" style={{ height: '600px' }}>
                    <iframe
                        src={file}
                        className="w-full h-full border-0"
                        title={title || 'Document PDF'}
                        onError={handleIframeError}
                    />
                </div>
            </CardContent>
        </Card>
    );
} 