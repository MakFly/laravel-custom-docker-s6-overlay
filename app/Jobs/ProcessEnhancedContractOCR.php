<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Services\EnhancedOCRService;
use App\Services\ContractPatternService;
use App\Jobs\AnalyzeContractWithAI;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessEnhancedContractOCR implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 600; // 10 minutes pour le traitement avancé

    public function __construct(
        public Contract $contract,
        public bool $triggerAiAfterOcr = false // Par défaut, ne plus lancer l'IA automatiquement
    ) {}

    public function handle(EnhancedOCRService $enhancedOcr, ContractPatternService $patternService): void
    {
        DB::beginTransaction();
        
        try {
            Log::info("Starting enhanced OCR processing for contract", [
                'contract_id' => $this->contract->id,
                'title' => $this->contract->title
            ]);
            
            $this->contract->update([
                'ocr_status' => 'processing',
                'ocr_raw_text' => null,
                'ai_analysis' => null
            ]);

            // Délai minimal pour permettre à l'UI de montrer la progress bar
            sleep(2);

            // Étape 1: OCR optimisé avec scoring de confiance
            $ocrResult = $enhancedOcr->extractTextWithConfidence($this->contract->file_path);
            
            Log::info("Enhanced OCR completed", [
                'contract_id' => $this->contract->id,
                'confidence' => $ocrResult['confidence'],
                'method_used' => $ocrResult['method_used'],
                'text_length' => strlen($ocrResult['text'])
            ]);

            // Étape 2: Analyse des patterns de tacite reconduction
            $patternAnalysis = $patternService->analyzeForTacitRenewal($ocrResult['text']);
            
            Log::info("Pattern analysis completed", [
                'contract_id' => $this->contract->id,
                'tacit_renewal_detected' => $patternAnalysis['tacit_renewal_detected'],
                'pattern_confidence' => $patternAnalysis['confidence_score'],
                'patterns_matched' => count($patternAnalysis['patterns_matched'])
            ]);

            // Étape 3: Consolidation des résultats
            $consolidatedData = $this->consolidateResults($ocrResult, $patternAnalysis);
            
            // Étape 4: Mise à jour du contrat avec les données extraites
            $this->updateContractFromAnalysis($consolidatedData);
            
            // Étape 4b: Stocker les résultats du pattern matching
            $this->contract->updatePatternAnalysis(
                $patternAnalysis,
                $patternAnalysis['tacit_renewal_detected'],
                $patternAnalysis['confidence_score']
            );

            // Étape 5: Marquer comme terminé avec succès
            $this->contract->update([
                'ocr_status' => 'completed',
                'ocr_raw_text' => $ocrResult['text'],
                'ocr_metadata' => [
                    'confidence' => $ocrResult['confidence'],
                    'method_used' => $ocrResult['method_used'],
                    'processing_time' => $ocrResult['metadata']['processing_time'] ?? null,
                    'pattern_analysis' => [
                        'tacit_renewal_detected' => $patternAnalysis['tacit_renewal_detected'],
                        'confidence_score' => $patternAnalysis['confidence_score'],
                        'patterns_matched_count' => count($patternAnalysis['patterns_matched']),
                        'validation_warnings' => $patternAnalysis['validation_warnings']
                    ]
                ]
            ]);

            DB::commit();

            // Déclencher l'analyse IA si demandé et si le texte OCR est de qualité suffisante
            if ($this->triggerAiAfterOcr && $ocrResult['confidence'] >= 60) {
                Log::info("Triggering AI analysis", ['contract_id' => $this->contract->id]);
                AnalyzeContractWithAI::dispatch($this->contract);
            } else {
                if (!$this->triggerAiAfterOcr) {
                    Log::info("AI analysis skipped (manual OCR reprocess)", ['contract_id' => $this->contract->id]);
                } else {
                    Log::warning("OCR confidence too low for AI analysis", [
                        'contract_id' => $this->contract->id,
                        'confidence' => $ocrResult['confidence']
                    ]);
                }
            }

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("Enhanced OCR processing failed for contract", [
                'contract_id' => $this->contract->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            $this->contract->update([
                'ocr_status' => 'failed',
                'ai_status' => 'failed', // Annuler l'analyse IA si OCR échoue
                'ocr_metadata' => [
                    'error' => $e->getMessage(),
                    'failed_at' => now()->toISOString()
                ]
            ]);
            
            throw $e;
        }
    }

    /**
     * Consolide les résultats OCR et pattern matching
     */
    private function consolidateResults(array $ocrResult, array $patternAnalysis): array
    {
        $consolidated = [
            'ocr' => $ocrResult,
            'patterns' => $patternAnalysis,
            'final_confidence' => $this->calculateFinalConfidence($ocrResult, $patternAnalysis),
            'extracted_data' => [],
            'recommendations' => []
        ];

        // Extraire les données les plus fiables
        $extractedData = $patternAnalysis['extracted_data'];
        
        // Dates
        if (!empty($extractedData['start_dates'])) {
            $consolidated['extracted_data']['start_date'] = $extractedData['start_dates'][0]['date'];
            $consolidated['extracted_data']['start_date_confidence'] = $extractedData['start_dates'][0]['confidence'];
        }
        
        if (!empty($extractedData['end_dates'])) {
            $consolidated['extracted_data']['end_date'] = $extractedData['end_dates'][0]['date'];
            $consolidated['extracted_data']['end_date_confidence'] = $extractedData['end_dates'][0]['confidence'];
        }

        // Montants
        if (!empty($extractedData['monthly_amount'])) {
            $consolidated['extracted_data']['monthly_amount'] = $extractedData['monthly_amount'][0]['amount'];
            $consolidated['extracted_data']['monthly_amount_confidence'] = $extractedData['monthly_amount'][0]['confidence'];
        }
        
        if (!empty($extractedData['annual_amount'])) {
            $consolidated['extracted_data']['annual_amount'] = $extractedData['annual_amount'][0]['amount'];
            $consolidated['extracted_data']['annual_amount_confidence'] = $extractedData['annual_amount'][0]['confidence'];
        }

        // Préavis
        if (isset($extractedData['notice_period_days'])) {
            $consolidated['extracted_data']['notice_period_days'] = $extractedData['notice_period_days'];
        }

        // Tacite reconduction
        $consolidated['extracted_data']['tacit_renewal_detected'] = $patternAnalysis['tacit_renewal_detected'];
        $consolidated['extracted_data']['tacit_renewal_confidence'] = $patternAnalysis['confidence_score'];

        // Générer des recommandations
        $consolidated['recommendations'] = $this->generateRecommendations($consolidated);

        return $consolidated;
    }

    /**
     * Calcule une confiance finale basée sur OCR et pattern matching
     */
    private function calculateFinalConfidence(array $ocrResult, array $patternAnalysis): float
    {
        $ocrWeight = 0.6;
        $patternWeight = 0.4;
        
        $ocrConfidence = $ocrResult['confidence'] / 100;
        $patternConfidence = $patternAnalysis['confidence_score'];
        
        $finalConfidence = ($ocrConfidence * $ocrWeight) + ($patternConfidence * $patternWeight);
        
        return round($finalConfidence * 100, 2);
    }

    /**
     * Met à jour le contrat avec les données extraites fiables
     */
    private function updateContractFromAnalysis(array $consolidatedData): void
    {
        $updateData = [];
        $extractedData = $consolidatedData['extracted_data'];
        $confidenceThreshold = 0.7;

        // Mettre à jour seulement si confiance suffisante
        if (isset($extractedData['tacit_renewal_detected'])) {
            if ($extractedData['tacit_renewal_confidence'] >= $confidenceThreshold) {
                $updateData['is_tacit_renewal'] = $extractedData['tacit_renewal_detected'];
            }
        }

        if (isset($extractedData['start_date']) && $extractedData['start_date_confidence'] >= $confidenceThreshold) {
            $updateData['start_date'] = $extractedData['start_date'];
        }

        if (isset($extractedData['end_date']) && $extractedData['end_date_confidence'] >= $confidenceThreshold) {
            $updateData['end_date'] = $extractedData['end_date'];
            $updateData['next_renewal_date'] = $extractedData['end_date']; // Prochaine échéance
        }

        if (isset($extractedData['notice_period_days'])) {
            $updateData['notice_period_days'] = $extractedData['notice_period_days'];
        }

        // Montants (privilégier annuel puis mensuel)
        if (isset($extractedData['annual_amount']) && $extractedData['annual_amount_confidence'] >= $confidenceThreshold) {
            $updateData['amount_cents'] = $extractedData['annual_amount'] * 100;
        } elseif (isset($extractedData['monthly_amount']) && $extractedData['monthly_amount_confidence'] >= $confidenceThreshold) {
            // Convertir mensuel en annuel
            $updateData['amount_cents'] = $extractedData['monthly_amount'] * 12 * 100;
        }

        if (!empty($updateData)) {
            Log::info("Updating contract with extracted data", [
                'contract_id' => $this->contract->id,
                'fields_updated' => array_keys($updateData)
            ]);
            
            $this->contract->update($updateData);
        }
    }

    /**
     * Génère des recommandations basées sur l'analyse
     */
    private function generateRecommendations(array $consolidatedData): array
    {
        $recommendations = [];
        $extractedData = $consolidatedData['extracted_data'];
        $patternAnalysis = $consolidatedData['patterns'];

        // Recommandations liées à la tacite reconduction
        if ($extractedData['tacit_renewal_detected']) {
            if (isset($extractedData['notice_period_days'])) {
                $days = $extractedData['notice_period_days'];
                $recommendations[] = [
                    'type' => 'tacit_renewal_warning',
                    'priority' => 'high',
                    'message' => "Ce contrat se renouvelle automatiquement. Préavis de {$days} jours requis pour la résiliation.",
                    'action_required' => true
                ];
            } else {
                $recommendations[] = [
                    'type' => 'tacit_renewal_check',
                    'priority' => 'medium',
                    'message' => "Tacite reconduction détectée. Vérifiez manuellement les conditions de résiliation.",
                    'action_required' => true
                ];
            }
        }

        // Recommandations liées à la qualité OCR
        if ($consolidatedData['ocr']['confidence'] < 70) {
            $recommendations[] = [
                'type' => 'low_ocr_quality',
                'priority' => 'medium',
                'message' => "Qualité OCR faible ({$consolidatedData['ocr']['confidence']}%). Vérification manuelle recommandée.",
                'action_required' => false
            ];
        }

        // Recommandations liées aux incohérences
        if (!empty($patternAnalysis['validation_warnings'])) {
            $recommendations[] = [
                'type' => 'data_inconsistency',
                'priority' => 'medium',
                'message' => "Incohérences détectées dans les données extraites. Validation manuelle requise.",
                'action_required' => true,
                'details' => $patternAnalysis['validation_warnings']
            ];
        }

        // Recommandation de programmation d'alerte
        if ($extractedData['tacit_renewal_detected'] && isset($extractedData['end_date'])) {
            $recommendations[] = [
                'type' => 'schedule_alert',
                'priority' => 'low',
                'message' => "Programmer des alertes de renouvellement basées sur l'échéance détectée.",
                'action_required' => false
            ];
        }

        return $recommendations;
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("Enhanced OCR job failed permanently", [
            'contract_id' => $this->contract->id,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
        
        $this->contract->update([
            'ocr_status' => 'failed',
            'ai_status' => 'failed', // Annuler l'analyse IA si OCR échoue
            'ocr_metadata' => [
                'error' => $exception->getMessage(),
                'failed_permanently_at' => now()->toISOString(),
                'max_attempts' => $this->tries
            ]
        ]);
    }
} 