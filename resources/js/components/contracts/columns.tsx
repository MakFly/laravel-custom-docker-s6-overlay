import * as React from "react"
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
    MoreHorizontal, 
    Eye, 
    Edit, 
    Download, 
    Trash2, 
    FileText,
    AlertTriangle,
    CheckCircle,
    Clock,
    Loader2,
    XCircle,
    Brain
} from "lucide-react";
import { Link, router } from "@inertiajs/react";
import { ContractStatusCell } from "./ContractStatusCell";

export interface Contract {
    id: number;
    title: string;
    type: 'pro' | 'perso';
    category: string;
    status: string;
    ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
    ai_status?: 'pending' | 'processing' | 'completed' | 'failed';
    file_original_name: string;
    amount_cents: number;
    currency: string;
    start_date?: string;
    end_date?: string;
    next_renewal_date?: string;
    notice_period_days: number;
    is_tacit_renewal: boolean;
    created_at: string;
    updated_at: string;
    alerts_count?: number;
}

const getOcrStatusIcon = (status: string) => {
    switch (status) {
        case 'pending':
            return <Clock className="h-4 w-4 text-yellow-500" />;
        case 'processing':
            return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        case 'completed':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'failed':
            return <XCircle className="h-4 w-4 text-red-500" />;
        default:
            return <Clock className="h-4 w-4 text-gray-500" />;
    }
};

const formatAmount = (amountCents: number, currency: string = 'EUR') => {
    if (amountCents <= 0) return '-';
    const amount = amountCents / 100;
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
};

const getDaysUntilRenewal = (renewalDate?: string) => {
    if (!renewalDate) return null;
    const today = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

export const columns: ColumnDef<Contract>[] = [
    {
        accessorKey: "title",
        header: "Contrat",
        cell: ({ row }) => {
            const contract = row.original;
            return (
                <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                        <div className="font-medium">{contract.title}</div>
                        <div className="text-sm text-gray-500">{contract.category}</div>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
            const contract = row.original;
            return (
                <div className="flex flex-col gap-1">
                    <Badge variant={contract.type === 'pro' ? 'default' : 'secondary'}>
                        {contract.type === 'pro' ? 'Pro' : 'Perso'}
                    </Badge>
                    {contract.is_tacit_renewal && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Tacite
                        </Badge>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "amount_cents",
        header: "Montant",
        cell: ({ row }) => {
            const contract = row.original;
            return formatAmount(contract.amount_cents, contract.currency);
        },
    },
    {
        accessorKey: "next_renewal_date",
        header: "Échéance",
        cell: ({ row }) => {
            const contract = row.original;
            const daysUntilRenewal = getDaysUntilRenewal(contract.next_renewal_date);
            const isExpiringSoon = daysUntilRenewal !== null && daysUntilRenewal <= 30;
            
            return (
                <div>
                    <div className="text-sm">{formatDate(contract.next_renewal_date)}</div>
                    {isExpiringSoon && daysUntilRenewal !== null && (
                        <div className="text-xs text-red-600 font-medium">
                            Dans {daysUntilRenewal} jour{daysUntilRenewal > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "ocr_status",
        header: "Traitement",
        cell: ({ row }) => {
            const contract = row.original;
            return (
                <ContractStatusCell
                    contractId={contract.id}
                    initialOcrStatus={contract.ocr_status}
                    initialAiStatus={contract.ai_status}
                    hasOcrText={true}
                    hasAiAnalysis={true}
                />
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const contract = row.original;
            
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={route('contracts.show', { contract: contract.id })} className="flex cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                Voir
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={route('contracts.edit', { contract: contract.id })} className="flex cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <a href={`/api/contracts/${contract.id}/download`} className="flex cursor-pointer">
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600"
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer le contrat</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer le contrat "{contract.title}" ? 
                                        Cette action est irréversible et supprimera définitivement le contrat et ses fichiers associés.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => {
                                            router.delete(route('contracts.destroy', { contract: contract.id }));
                                        }}
                                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                    >
                                        Supprimer
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
]; 