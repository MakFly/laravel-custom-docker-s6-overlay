<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Services\OCRService;
use App\Jobs\AnalyzeContractWithAI;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessContractOCR implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 300; // 5 minutes

    public function __construct(
        public Contract $contract
    ) {}

    public function handle(OCRService $ocrService): void
    {
        try {
            Log::info("Starting OCR processing for contract", ['contract_id' => $this->contract->id]);
            
            $this->contract->update(['ocr_status' => 'processing']);

            $ocrText = $ocrService->extractText($this->contract->file_path);
            
            $this->contract->update([
                'ocr_status' => 'completed',
                'ocr_raw_text' => $ocrText
            ]);

            Log::info("OCR processing completed for contract", [
                'contract_id' => $this->contract->id,
                'text_length' => strlen($ocrText)
            ]);

            // Déclencher l'analyse IA
            AnalyzeContractWithAI::dispatch($this->contract);

        } catch (\Exception $e) {
            Log::error("OCR processing failed for contract", [
                'contract_id' => $this->contract->id,
                'error' => $e->getMessage()
            ]);
            
            // Marquer OCR et AI comme échoués si OCR échoue
            $this->contract->update([
                'ocr_status' => 'failed',
                'ai_status' => 'failed' // Annuler l'analyse IA si OCR échoue
            ]);
            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("OCR job failed permanently", [
            'contract_id' => $this->contract->id,
            'error' => $exception->getMessage()
        ]);
        
        // Marquer OCR et AI comme échoués en cas d'échec permanent
        $this->contract->update([
            'ocr_status' => 'failed',
            'ai_status' => 'failed'
        ]);
    }
}
