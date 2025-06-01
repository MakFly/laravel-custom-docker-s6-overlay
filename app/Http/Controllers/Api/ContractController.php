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
use App\Jobs\CreateContractAlerts;

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

        // Lancer le traitement OCR optimisé en arrière-plan (mode pattern-only par défaut)
        ProcessEnhancedContractOCR::dispatch($contract, false);

        return new ContractResource($contract);
    }

    /**
     * Afficher un contrat spécifique avec analyse complète
     */
    public function show(Contract $contract)
    {
        $this->authorize('view', $contract);
        $user = request()->user();

        // Charger les relations de base
        $contract->load(['alerts', 'clauses', 'user:id,name,email']);

        // Obtenir l'analyse complète (pattern + IA)
        $tacitRenewalInfo = $contract->getTacitRenewalInfo();
        $aiAnalysis = $contract->getCachedOrFreshAiAnalysis();

        // Utiliser ContractResource pour les données de base
        $contractResource = new ContractResource($contract);
        $contractData = $contractResource->toArray(request());

        // Enrichir avec les données d'analyse complète
        $contractData['analysis'] = [
            // Informations générales
            'processing_mode' => $contract->processing_mode,
            'has_ai_analysis' => !empty($aiAnalysis),
            'has_cached_ai_analysis' => $contract->hasValidCachedAiAnalysis(),
            'ai_analysis_cached_at' => $contract->ai_analysis_cached_at,
            
            // Analyse de tacite reconduction
            'tacit_renewal' => [
                'detected' => $tacitRenewalInfo['detected'],
                'source' => $tacitRenewalInfo['source'], // 'pattern_only' ou 'ai_enhanced'
                'confidence' => $tacitRenewalInfo['confidence'],
                'details' => $tacitRenewalInfo['details']
            ],
            
            // Résultats du pattern matching (toujours disponible)
            'pattern_analysis' => [
                'result' => $contract->pattern_analysis_result,
                'confidence_score' => $contract->pattern_confidence_score,
                'detected_tacit_renewal' => $contract->tacit_renewal_detected_by_pattern,
                'is_reliable' => $contract->pattern_confidence_score >= 0.7
            ],
            
            // Analyse IA complète (si disponible)
            'ai_analysis' => $aiAnalysis,
            
            // Métadonnées OCR
            'ocr_metadata' => $contract->ocr_metadata,
            'has_ocr_text' => !empty($contract->ocr_raw_text),
        ];

        // Informations utilisateur pour les crédits
        $contractData['user_credits'] = $user->getAiCreditsInfo();
        $contractData['can_use_ai'] = $user->hasAiCredits();

        return response()->json($contractData);
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

        ProcessEnhancedContractOCR::dispatch($contract, false);

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
     * Obtenir l'analyse complète du contrat (pattern + IA)
     */
    public function getAnalysis(Contract $contract)
    {
        $this->authorize('view', $contract);
        $user = request()->user();

        // Informations sur la tacite reconduction
        $tacitRenewalInfo = $contract->getTacitRenewalInfo();

        // Analyse IA (cachée ou temporaire)
        $aiAnalysis = $contract->getCachedOrFreshAiAnalysis();
        
        return response()->json([
            // Informations générales
            'processing_mode' => $contract->processing_mode,
            'has_ai_analysis' => !empty($aiAnalysis),
            'has_cached_ai_analysis' => $contract->hasValidCachedAiAnalysis(),
            'ai_analysis_cached_at' => $contract->ai_analysis_cached_at,
            
            // Analyse de tacite reconduction
            'tacit_renewal' => [
                'detected' => $tacitRenewalInfo['detected'],
                'source' => $tacitRenewalInfo['source'], // 'pattern_only' ou 'ai_enhanced'
                'confidence' => $tacitRenewalInfo['confidence'],
                'details' => $tacitRenewalInfo['details']
            ],
            
            // Résultats du pattern matching (toujours disponible)
            'pattern_analysis' => [
                'result' => $contract->pattern_analysis_result,
                'confidence_score' => $contract->pattern_confidence_score,
                'detected_tacit_renewal' => $contract->tacit_renewal_detected_by_pattern,
                'is_reliable' => $contract->pattern_confidence_score >= 0.7
            ],
            
            // Analyse IA complète (si disponible)
            'ai_analysis' => $aiAnalysis,
            
            // Métadonnées OCR
            'ocr_metadata' => $contract->ocr_metadata,
            'ocr_status' => $contract->ocr_status,
            'has_ocr_text' => !empty($contract->ocr_raw_text),
            
            // Informations utilisateur pour les crédits
            'user_credits' => $user->getAiCreditsInfo(),
            'can_use_ai' => $user->hasAiCredits(),
            
            // Données du contrat
            'contract' => [
                'id' => $contract->id,
                'title' => $contract->title,
                'is_tacit_renewal' => $contract->is_tacit_renewal,
                'next_renewal_date' => $contract->next_renewal_date,
                'notice_period_days' => $contract->notice_period_days,
                'amount' => $contract->amount,
                'status' => $contract->status,
            ]
        ]);
    }

    /**
     * Forcer une nouvelle analyse IA (avec gestion des crédits)
     */
    public function reanalyze(Contract $contract, OpenAIService $aiService)
    {
        $this->authorize('update', $contract);
        $user = request()->user();

        if (!$contract->ocr_raw_text) {
            return response()->json(['error' => 'Aucun texte OCR disponible'], 400);
        }

        // Vérifier si l'utilisateur a déjà une analyse IA cachée
        if ($contract->hasValidCachedAiAnalysis()) {
            return response()->json([
                'has_cached_analysis' => true,
                'cached_analysis' => $contract->ai_analysis_cached,
                'cached_at' => $contract->ai_analysis_cached_at,
                'message' => 'Une analyse IA récente existe déjà. Voulez-vous la remplacer ?',
                'user_credits' => $user->getAiCreditsInfo(),
            ]);
        }

        // Vérifier les crédits IA
        if (!$user->hasAiCredits()) {
            return response()->json([
                'error' => 'Crédits IA insuffisants',
                'user_credits' => $user->getAiCreditsInfo(),
                'upgrade_needed' => true
            ], 402); // Payment Required
        }

        try {
            // Consommer un crédit IA
            if (!$user->consumeAiCredit()) {
                return response()->json([
                    'error' => 'Impossible de consommer le crédit IA',
                    'user_credits' => $user->getAiCreditsInfo(),
                ], 402);
            }

            $analysis = $aiService->analyzeContract($contract->ocr_raw_text);
            
            // Cacher l'analyse IA pour éviter les appels futurs
            $contract->cacheAiAnalysis($analysis);
            $contract->setProcessingMode('ai_enhanced');
            
            // Mettre à jour les champs du contrat
            $updateData = [
                'is_tacit_renewal' => $analysis['reconduction_tacite'] ?? false,
                'notice_period_days' => $analysis['preavis_resiliation_jours'] ?? $contract->notice_period_days,
            ];

            if (isset($analysis['montant'])) {
                $updateData['amount_cents'] = $analysis['montant'] * 100;
            }

            // Mettre à jour les dates si disponibles
            if (!empty($analysis['date_debut'])) {
                $updateData['start_date'] = $analysis['date_debut'];
            }
            if (!empty($analysis['date_fin'])) {
                $updateData['end_date'] = $analysis['date_fin'];
                $updateData['next_renewal_date'] = $analysis['date_fin'];
            }
            
            $contract->update($updateData);

            // Créer les alertes basées sur la nouvelle analyse
            CreateContractAlerts::dispatch($contract);

            return response()->json([
                'message' => 'Analyse IA mise à jour et sauvegardée',
                'analysis' => $analysis,
                'credit_consumed' => true,
                'user_credits' => $user->fresh()->getAiCreditsInfo(),
            ]);

        } catch (\Exception $e) {
            // En cas d'erreur, rembourser le crédit
            $user->increment('ai_credits_remaining');
            $user->decrement('ai_credits_used_this_month');
            $user->decrement('ai_credits_total_used');
            
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Forcer une nouvelle analyse IA en remplaçant l'existante
     */
    public function forceReanalyze(Contract $contract, OpenAIService $aiService)
    {
        $this->authorize('update', $contract);
        $user = request()->user();

        if (!$contract->ocr_raw_text) {
            return response()->json(['error' => 'Aucun texte OCR disponible'], 400);
        }

        // Vérifier les crédits IA
        if (!$user->hasAiCredits()) {
            return response()->json([
                'error' => 'Crédits IA insuffisants',
                'user_credits' => $user->getAiCreditsInfo(),
                'upgrade_needed' => true
            ], 402);
        }

        try {
            // Consommer un crédit IA
            if (!$user->consumeAiCredit()) {
                return response()->json([
                    'error' => 'Impossible de consommer le crédit IA',
                    'user_credits' => $user->getAiCreditsInfo(),
                ], 402);
            }

            // Invalider l'ancien cache
            $contract->invalidateAiCache();

            $analysis = $aiService->analyzeContract($contract->ocr_raw_text);
            
            // Cacher la nouvelle analyse IA
            $contract->cacheAiAnalysis($analysis);
            $contract->setProcessingMode('ai_enhanced');
            
            // Mettre à jour les champs du contrat
            $updateData = [
                'is_tacit_renewal' => $analysis['reconduction_tacite'] ?? false,
                'notice_period_days' => $analysis['preavis_resiliation_jours'] ?? $contract->notice_period_days,
            ];

            if (isset($analysis['montant'])) {
                $updateData['amount_cents'] = $analysis['montant'] * 100;
            }

            if (!empty($analysis['date_debut'])) {
                $updateData['start_date'] = $analysis['date_debut'];
            }
            if (!empty($analysis['date_fin'])) {
                $updateData['end_date'] = $analysis['date_fin'];
                $updateData['next_renewal_date'] = $analysis['date_fin'];
            }
            
            $contract->update($updateData);

            // Créer les alertes basées sur la nouvelle analyse
            CreateContractAlerts::dispatch($contract);

            return response()->json([
                'message' => 'Nouvelle analyse IA effectuée et sauvegardée',
                'analysis' => $analysis,
                'credit_consumed' => true,
                'user_credits' => $user->fresh()->getAiCreditsInfo(),
            ]);

        } catch (\Exception $e) {
            // En cas d'erreur, rembourser le crédit
            $user->increment('ai_credits_remaining');
            $user->decrement('ai_credits_used_this_month');
            $user->decrement('ai_credits_total_used');
            
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

        // Récupérer le contenu du fichier depuis MinIO/S3
        $fileContent = Storage::disk('private')->get($contract->file_path);
        $fileSize = Storage::disk('private')->size($contract->file_path);
        
        // Déterminer le type MIME basé sur l'extension
        $extension = strtolower(pathinfo($contract->file_original_name, PATHINFO_EXTENSION));
        $mimeType = match($extension) {
            'pdf' => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            default => 'application/octet-stream'
        };
        
        return response($fileContent, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'attachment; filename="' . $contract->file_original_name . '"',
            'Content-Length' => $fileSize,
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Afficher le fichier PDF en inline pour visualisation
     */
    public function view(Contract $contract)
    {
        $this->authorize('view', $contract);

        if (!Storage::disk('private')->exists($contract->file_path)) {
            return response()->json(['error' => 'Fichier non trouvé'], 404);
        }

        // Récupérer le contenu du fichier depuis MinIO/S3
        $fileContent = Storage::disk('private')->get($contract->file_path);
        
        // Déterminer le type MIME basé sur l'extension
        $extension = strtolower(pathinfo($contract->file_original_name, PATHINFO_EXTENSION));
        $mimeType = match($extension) {
            'pdf' => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => 'application/octet-stream'
        };
        
        return response($fileContent, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $contract->file_original_name . '"',
            'Content-Length' => strlen($fileContent),
            'Cache-Control' => 'public, max-age=3600',
            'Accept-Ranges' => 'bytes',
        ]);
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
