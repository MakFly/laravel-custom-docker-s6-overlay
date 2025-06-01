import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { SimplePDFViewer } from '@/components/ui/simple-pdf-viewer';
import { 
  ArrowLeft, 
  FileText, 
  Copy,
  Download,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { PDFViewer } from '@/components/ui/pdf-viewer';

interface Contract {
    id: number;
    title: string;
    type: 'pro' | 'perso';
    category: string;
    status: string;
    ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
    file_original_name: string;
    ocr_raw_text?: string;
    created_at: string;
    updated_at: string;
}

interface OcrResultsProps {
    contract: Contract;
}

export default function OcrResults({ contract }: OcrResultsProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyText = async () => {
        if (contract.ocr_raw_text) {
            try {
                await navigator.clipboard.writeText(contract.ocr_raw_text);
                setCopied(true);
                toast.success('Texte copié dans le presse-papiers');
                setTimeout(() => setCopied(false), 2000);
            } catch {
                toast.error('Erreur lors de la copie');
            }
        }
    };

    const getOcrStatusBadge = () => {
        switch (contract.ocr_status) {
            case 'completed':
                return <Badge variant="default">Terminé</Badge>;
            case 'processing':
                return <Badge variant="secondary">En cours...</Badge>;
            case 'failed':
                return <Badge variant="destructive">Échoué</Badge>;
            case 'pending':
                return <Badge variant="outline">En attente</Badge>;
            default:
                return <Badge variant="outline">Non traité</Badge>;
        }
    };

    const textLength = contract.ocr_raw_text?.length || 0;
    const wordCount = contract.ocr_raw_text ? contract.ocr_raw_text.split(/\s+/).length : 0;

    const pdfViewUrl = `/api/contracts/${contract.id}/view`;
    const pdfDownloadUrl = `/api/contracts/${contract.id}/download`;

    return (
        <AppLayout>
            <Head title={`OCR - ${contract.title}`} />

            <div className="py-12">
                <div className="max-w-full mx-auto sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Link
                                    href={`/contracts/${contract.id}`}
                                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Retour au contrat
                                </Link>
                            </div>
                            {/* <div className="flex items-center space-x-3">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4 mr-2" />
                                        Télécharger PDF
                                    </a>
                                </Button>
                            </div> */}
                        </div>

                        <div className="mt-4">
                            <div className="flex items-center space-x-3">
                                <FileText className="w-6 h-6 text-blue-600" />
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Visualisation OCR
                                </h1>
                            </div>
                            <p className="mt-2 text-gray-600">{contract.title}</p>
                            <div className="mt-2 flex items-center space-x-4">
                                <Badge variant={contract.type === 'pro' ? 'default' : 'secondary'}>
                                    {contract.type === 'pro' ? 'Professionnel' : 'Personnel'}
                                </Badge>
                                <Badge variant="outline">
                                    {contract.category}
                                </Badge>
                                {getOcrStatusBadge()}
                            </div>
                        </div>
                    </div>

                    {/* Métadonnées OCR */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Eye className="w-5 h-5 mr-2" />
                                Informations d'extraction
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Fichier source</label>
                                    <p className="text-sm">{contract.file_original_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Statut OCR</label>
                                    <div className="mt-1">{getOcrStatusBadge()}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Caractères extraits</label>
                                    <p className="text-sm font-semibold">{textLength.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Mots détectés</label>
                                    <p className="text-sm font-semibold">{wordCount.toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vue principale avec PDF et OCR */}
                    {contract.ocr_status === 'completed' && contract.ocr_raw_text ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Lecteur PDF simple avec iframe */}
                            <PDFViewer
                                file={pdfViewUrl}
                                title={`Document PDF - ${contract.title}`}
                                downloadUrl={pdfDownloadUrl}
                            />
                            {/* <SimplePDFViewer
                                file={pdfViewUrl}
                                title={`Document PDF - ${contract.title}`}
                                downloadUrl={pdfDownloadUrl}
                            /> */}

                            {/* Texte OCR */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center">
                                                <Eye className="w-5 h-5 mr-2" />
                                                Texte extrait
                                            </CardTitle>
                                            <CardDescription>
                                                Contenu détecté automatiquement par OCR
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyText}
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            {copied ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 p-4 rounded-lg h-[800px] overflow-y-auto border">
                                        <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                            {contract.ocr_raw_text}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : contract.ocr_status === 'processing' ? (
                        <Card>
                            <CardContent className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Extraction en cours...
                                </h3>
                                <p className="text-gray-600">
                                    Le traitement OCR est en cours. Veuillez patienter.
                                </p>
                            </CardContent>
                        </Card>
                    ) : contract.ocr_status === 'failed' ? (
                        <Card>
                            <CardContent className="text-center py-12">
                                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Échec de l'extraction
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Le traitement OCR a échoué. Le fichier pourrait être corrompu ou dans un format non supporté.
                                </p>
                                <Button variant="outline" asChild>
                                    <Link href={`/contracts/${contract.id}`}>
                                        Retour au contrat
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Traitement en attente
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    L'extraction OCR n'a pas encore été démarrée pour ce document.
                                </p>
                                <Button variant="outline" asChild>
                                    <Link href={`/contracts/${contract.id}`}>
                                        Retour au contrat
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
} 