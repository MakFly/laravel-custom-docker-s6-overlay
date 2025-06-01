import React, { useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Download,
    Eye,
    ExternalLink,
    AlertTriangle
} from 'lucide-react';

// Import styles pour react-pdf-viewer
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFViewerProps {
    file: string;
    title?: string;
    downloadUrl?: string;
    className?: string;
}

export function PDFViewer({ file, title, downloadUrl, className = '' }: PDFViewerProps) {
    const [error, setError] = useState<string | null>(null);

    // Plugin pour la mise en page par défaut avec tous les contrôles
    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        sidebarTabs: (defaultTabs) => [defaultTabs[0]], // Garde seulement les thumbnails
    });

    const handleDocumentLoadError = (error: any) => {
        console.error('PDF loading error:', error);
        setError('Impossible de charger le document PDF');
    };

    if (error) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Erreur de chargement
                        </h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <div className="space-x-2">
                            {downloadUrl && (
                                <Button variant="outline" asChild>
                                    <a href={downloadUrl} download>
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
                                <a href={downloadUrl} download>
                                    <Download className="w-4 h-4 mr-1" />
                                    Télécharger
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-0">
                <div className="border" style={{ height: '600px' }}>
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                        <Viewer
                            fileUrl={file}
                            plugins={[defaultLayoutPluginInstance]}
                            onDocumentLoadError={handleDocumentLoadError}
                        />
                    </Worker>
                </div>
            </CardContent>
        </Card>
    );
} 