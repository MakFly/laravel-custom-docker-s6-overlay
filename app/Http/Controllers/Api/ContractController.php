<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContractRequest;
use App\Http\Resources\ContractResource;
use App\Jobs\ProcessContractOCR;
use App\Jobs\ProcessEnhancedContractOCR;
use App\Models\Contract;
use App\Services\OCRService;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Illuminate\Support\Facades\Storage;

class ContractController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Liste des contrats avec filtres
     */
    public function index(Request $request)
    {
        $contracts = QueryBuilder::for(Contract::class)
            ->allowedFilters([
                'type',
                'category',
                'status',
                'ocr_status',
                AllowedFilter::exact('is_tacit_renewal'),
                AllowedFilter::scope('expiring_soon'),
                AllowedFilter::scope('professional'),
                AllowedFilter::scope('personal'),
                AllowedFilter::scope('active'),
            ])
            ->allowedSorts(['created_at', 'next_renewal_date', 'title', 'amount_cents'])
            ->with(['alerts' => function($query) {
                $query->where('status', 'pending')->orderBy('scheduled_for');
            }])
            ->paginate($request->get('per_page', 15));

        return ContractResource::collection($contracts);
    }

    /**
     * Créer un nouveau contrat avec upload de fichier
     */
    public function store(StoreContractRequest $request)
    {
        $file = $request->file('contract_file');
        $user = $request->user();
        
        // Stocker le fichier de manière sécurisée par organisation
        $filePath = $file->store("contracts/{$user->org_id}", 'private');

        $contract = Contract::create([
            'user_id' => $user->id,
            'title' => $request->title ?? $file->getClientOriginalName(),
            'type' => $request->type,
            'category' => $request->category ?? 'autre',
            'file_path' => $filePath,
            'file_original_name' => $file->getClientOriginalName(),
            'status' => 'active',
            'ocr_status' => 'pending',
            'amount_cents' => $request->amount ? ($request->amount * 100) : 0,
            'notice_period_days' => $request->notice_period_days ?? 30,
        ]);

        // Lancer le traitement OCR optimisé en arrière-plan
        ProcessEnhancedContractOCR::dispatch($contract);

        return new ContractResource($contract);
    }

    /**
     * Afficher un contrat spécifique
     */
    public function show(Contract $contract)
    {
        $this->authorize('view', $contract);
        
        return new ContractResource($contract->load(['alerts', 'clauses', 'user:id,name,email']));
    }

    /**
     * Mettre à jour un contrat
     */
    public function update(Request $request, Contract $contract)
    {
        $this->authorize('update', $contract);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:pro,perso',
            'category' => 'sometimes|string|max:100',
            'amount' => 'sometimes|numeric|min:0',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'next_renewal_date' => 'sometimes|date',
            'notice_period_days' => 'sometimes|integer|min:0',
            'is_tacit_renewal' => 'sometimes|boolean',
            'status' => 'sometimes|in:active,expired,cancelled',
        ]);

        if (isset($validated['amount'])) {
            $validated['amount_cents'] = $validated['amount'] * 100;
            unset($validated['amount']);
        }

        $contract->update($validated);

        return new ContractResource($contract->fresh(['alerts', 'clauses']));
    }

    /**
     * Supprimer un contrat
     */
    public function destroy(Contract $contract)
    {
        $this->authorize('delete', $contract);

        // Supprimer le fichier associé
        if ($contract->file_path && Storage::disk('private')->exists($contract->file_path)) {
            Storage::disk('private')->delete($contract->file_path);
        }

        $contract->delete();

        return response()->json(['message' => 'Contrat supprimé avec succès']);
    }

    /**
     * Relancer le traitement OCR
     */
    public function reprocess(Contract $contract)
    {
        $this->authorize('update', $contract);
        
        $contract->update([
            'ocr_status' => 'pending',
            'ocr_raw_text' => null,
            'ai_analysis' => null,
            'ocr_metadata' => null,
        ]);

        ProcessEnhancedContractOCR::dispatch($contract);

        return response()->json(['message' => 'Retraitement OCR optimisé en cours']);
    }

    /**
     * Obtenir le texte OCR brut
     */
    public function getOcrText(Contract $contract)
    {
        $this->authorize('view', $contract);

        return response()->json([
            'ocr_status' => $contract->ocr_status,
            'ocr_text' => $contract->ocr_raw_text,
            'text_length' => $contract->ocr_raw_text ? strlen($contract->ocr_raw_text) : 0,
            'ocr_metadata' => $contract->ocr_metadata,
        ]);
    }

    /**
     * Obtenir les métadonnées OCR détaillées
     */
    public function getOcrMetadata(Contract $contract)
    {
        $this->authorize('view', $contract);

        $metadata = $contract->ocr_metadata ?? [];
        
        return response()->json([
            'ocr_status' => $contract->ocr_status,
            'confidence' => $metadata['confidence'] ?? null,
            'method_used' => $metadata['method_used'] ?? null,
            'processing_time' => $metadata['processing_time'] ?? null,
            'pattern_analysis' => $metadata['pattern_analysis'] ?? null,
            'has_metadata' => !empty($metadata),
            'recommendations' => $this->generateOcrRecommendations($contract, $metadata),
        ]);
    }

    /**
     * Génère des recommandations basées sur les métadonnées OCR
     */
    private function generateOcrRecommendations(Contract $contract, array $metadata): array
    {
        $recommendations = [];
        
        if (isset($metadata['confidence']) && $metadata['confidence'] < 70) {
            $recommendations[] = [
                'type' => 'low_confidence',
                'message' => "Confiance OCR faible ({$metadata['confidence']}%). Vérification manuelle recommandée.",
                'priority' => 'medium'
            ];
        }
        
        if (isset($metadata['pattern_analysis']['tacit_renewal_detected']) && 
            $metadata['pattern_analysis']['tacit_renewal_detected']) {
            $recommendations[] = [
                'type' => 'tacit_renewal',
                'message' => "Tacite reconduction détectée automatiquement. Vérifiez les conditions de résiliation.",
                'priority' => 'high'
            ];
        }
        
        if (!empty($metadata['pattern_analysis']['validation_warnings'])) {
            $recommendations[] = [
                'type' => 'validation_warnings',
                'message' => "Incohérences détectées dans les données extraites.",
                'priority' => 'medium',
                'details' => $metadata['pattern_analysis']['validation_warnings']
            ];
        }
        
        return $recommendations;
    }

    /**
     * Obtenir l'analyse IA
     */
    public function getAnalysis(Contract $contract)
    {
        $this->authorize('view', $contract);

        return response()->json([
            'ai_analysis' => $contract->ai_analysis,
            'has_analysis' => !empty($contract->ai_analysis),
            'is_tacit_renewal' => $contract->is_tacit_renewal,
            'next_renewal_date' => $contract->next_renewal_date,
        ]);
    }

    /**
     * Forcer une nouvelle analyse IA
     */
    public function reanalyze(Contract $contract, OpenAIService $aiService)
    {
        $this->authorize('update', $contract);

        if (!$contract->ocr_raw_text) {
            return response()->json(['error' => 'Aucun texte OCR disponible'], 400);
        }

        try {
            $analysis = $aiService->analyzeContract($contract->ocr_raw_text);
            
            $contract->update([
                'ai_analysis' => $analysis,
                'is_tacit_renewal' => $analysis['reconduction_tacite'] ?? false,
                'amount_cents' => isset($analysis['montant']) ? ($analysis['montant'] * 100) : $contract->amount_cents,
                'notice_period_days' => $analysis['preavis_resiliation_jours'] ?? $contract->notice_period_days,
            ]);

            // Mettre à jour les dates si disponibles
            if (!empty($analysis['date_debut'])) {
                $contract->start_date = $analysis['date_debut'];
            }
            if (!empty($analysis['date_fin'])) {
                $contract->end_date = $analysis['date_fin'];
                $contract->next_renewal_date = $analysis['date_fin'];
            }
            
            $contract->save();

            return response()->json([
                'message' => 'Analyse IA mise à jour',
                'analysis' => $analysis,
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Télécharger le fichier original du contrat
     */
    public function download(Contract $contract)
    {
        $this->authorize('view', $contract);

        if (!Storage::disk('private')->exists($contract->file_path)) {
            return response()->json(['error' => 'Fichier non trouvé'], 404);
        }

        $filePath = Storage::disk('private')->path($contract->file_path);
        
        return response()->download(
            $filePath,
            $contract->file_original_name
        );
    }

    /**
     * Statistiques des contrats pour l'organisation
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        
        $stats = [
            'total_contracts' => Contract::count(),
            'active_contracts' => Contract::where('status', 'active')->count(),
            'professional_contracts' => Contract::where('type', 'pro')->count(),
            'personal_contracts' => Contract::where('type', 'perso')->count(),
            'tacit_renewal_contracts' => Contract::where('is_tacit_renewal', true)->count(),
            'expiring_soon' => Contract::expiringSoon(30)->count(),
            'pending_ocr' => Contract::where('ocr_status', 'pending')->count(),
            'processing_ocr' => Contract::where('ocr_status', 'processing')->count(),
            'failed_ocr' => Contract::where('ocr_status', 'failed')->count(),
            'total_amount' => Contract::where('status', 'active')->sum('amount_cents') / 100,
        ];

        return response()->json($stats);
    }

    /**
     * Contrats arrivant à échéance
     */
    public function upcomingRenewals(Request $request)
    {
        $days = $request->get('days', 90);
        
        $contracts = Contract::expiringSoon($days)
            ->with(['alerts' => function($query) {
                $query->where('status', 'pending')->orderBy('scheduled_for');
            }])
            ->orderBy('next_renewal_date')
            ->get();

        return ContractResource::collection($contracts);
    }

    /**
     * Get contract processing status
     */
    public function status(Contract $contract): JsonResponse
    {
        $this->authorize('view', $contract);
        
        return response()->json([
            'id' => $contract->id,
            'ocr_status' => $contract->ocr_status,
            'ai_status' => $contract->ai_status,
            'has_ocr_text' => !empty($contract->ocr_raw_text),
            'has_ai_analysis' => !empty($contract->ai_analysis),
            'updated_at' => $contract->updated_at?->toISOString(),
        ]);
    }
}
