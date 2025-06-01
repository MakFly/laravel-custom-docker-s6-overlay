<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Services\OpenAIService;
use App\Jobs\CreateContractAlerts;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeContractWithAI implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 120; // 2 minutes

    public function __construct(
        public Contract $contract
    ) {}

    public function handle(OpenAIService $aiService): void
    {
        // Vérifier que l'OCR a réussi avant de commencer l'analyse IA
        if ($this->contract->ocr_status !== 'completed') {
            Log::warning("OCR not completed, cannot start AI analysis", [
                'contract_id' => $this->contract->id,
                'ocr_status' => $this->contract->ocr_status
            ]);
            $this->contract->update(['ai_status' => 'failed']);
            return;
        }

        if (!$this->contract->ocr_raw_text) {
            Log::warning("No OCR text available for AI analysis", [
                'contract_id' => $this->contract->id
            ]);
            $this->contract->update(['ai_status' => 'failed']);
            return;
        }

        // Vérifier si OpenAI est configuré
        if (!config('openai.api_key')) {
            Log::warning("OpenAI API key not configured, skipping AI analysis", [
                'contract_id' => $this->contract->id
            ]);
            $this->contract->update(['ai_status' => 'failed']);
            return;
        }

        try {
            Log::info("Starting AI analysis for contract", [
                'contract_id' => $this->contract->id,
                'text_length' => strlen($this->contract->ocr_raw_text)
            ]);

            // Marquer comme en cours de traitement
            $this->contract->update(['ai_status' => 'processing']);

            $analysis = $aiService->analyzeContract($this->contract->ocr_raw_text);
            
            // Mettre à jour le contrat avec l'analyse
            $this->contract->update([
                'ai_analysis' => $analysis,
                'ai_status' => 'completed'
            ]);

            // Mettre à jour les champs basés sur l'analyse si confiance suffisante
            if (($analysis['confidence_score'] ?? 0) >= 0.7) {
                $updateData = [];
                
                if (isset($analysis['reconduction_tacite'])) {
                    $updateData['is_tacit_renewal'] = $analysis['reconduction_tacite'];
                }
                
                if (isset($analysis['montant']) && $analysis['montant'] > 0) {
                    $updateData['amount_cents'] = $analysis['montant'] * 100;
                }
                
                if (isset($analysis['date_fin']) && $analysis['date_fin']) {
                    $updateData['end_date'] = $analysis['date_fin'];
                    $updateData['next_renewal_date'] = $analysis['date_fin'];
                }
                
                if (isset($analysis['preavis_resiliation_jours']) && $analysis['preavis_resiliation_jours'] > 0) {
                    $updateData['notice_period_days'] = $analysis['preavis_resiliation_jours'];
                }
                
                if (isset($analysis['type_contrat']) && $analysis['type_contrat'] !== 'autre') {
                    $updateData['category'] = $analysis['type_contrat'];
                }
                
                if (!empty($updateData)) {
                    $this->contract->update($updateData);
                    Log::info("Contract fields updated based on AI analysis", [
                        'contract_id' => $this->contract->id,
                        'updated_fields' => array_keys($updateData)
                    ]);
                }
            }

            Log::info("AI analysis completed for contract", [
                'contract_id' => $this->contract->id,
                'confidence_score' => $analysis['confidence_score'] ?? 0,
                'tacit_renewal' => $analysis['reconduction_tacite'] ?? false
            ]);

            // Créer les alertes basées sur l'analyse
            if (class_exists('App\Jobs\CreateContractAlerts')) {
                CreateContractAlerts::dispatch($this->contract);
            } else {
                Log::warning("CreateContractAlerts job not found, skipping alert creation", [
                    'contract_id' => $this->contract->id
                ]);
            }

        } catch (\Exception $e) {
            Log::error("AI analysis failed for contract", [
                'contract_id' => $this->contract->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Marquer comme échoué
            $this->contract->update(['ai_status' => 'failed']);
            
            // Ne pas relancer l'exception si c'est un problème OpenAI (éviter les retry inutiles)
            if (str_contains($e->getMessage(), 'OpenAI') || str_contains($e->getMessage(), 'API')) {
                return;
            }
            
            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("AI analysis job failed permanently", [
            'contract_id' => $this->contract->id,
            'error' => $exception->getMessage()
        ]);
        
        // Marquer comme échoué en cas d'échec permanent
        $this->contract->update(['ai_status' => 'failed']);
    }
} 