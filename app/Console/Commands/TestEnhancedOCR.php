<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\EnhancedOCRService;
use App\Services\ContractPatternService;
use App\Models\Contract;

class TestEnhancedOCR extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:enhanced-ocr {contract_id} {--show-details}';

    /**
     * The console command description.
     */
    protected $description = 'Test enhanced OCR with pattern matching on a specific contract';

    /**
     * Execute the console command.
     */
    public function handle(EnhancedOCRService $enhancedOcr, ContractPatternService $patternService)
    {
        $contractId = $this->argument('contract_id');
        $showDetails = $this->option('show-details');
        
        $contract = Contract::find($contractId);
        
        if (!$contract) {
            $this->error("Contract {$contractId} not found");
            return 1;
        }
        
        $this->info("Testing Enhanced OCR for contract: {$contract->title}");
        $this->info("File path: {$contract->file_path}");
        
        // Vérifier la disponibilité des outils
        $this->info("\n🔧 Checking OCR tools availability...");
        $availability = $enhancedOcr->checkAvailability();
        
        foreach ($availability as $tool => $status) {
            if ($status['available']) {
                $version = $status['version'] ?? 'Available';
                $this->info("✅ {$tool}: {$version}");
            } else {
                $error = $status['error'] ?? 'Not available';
                $this->error("❌ {$tool}: {$error}");
            }
        }
        
        try {
            // Étape 1: OCR optimisé
            $this->info("\n📄 Starting enhanced OCR processing...");
            $startTime = microtime(true);
            
            $ocrResult = $enhancedOcr->extractTextWithConfidence($contract->file_path);
            
            $ocrTime = microtime(true) - $startTime;
            
            $this->info("✅ OCR completed in " . round($ocrTime, 2) . "s");
            $this->info("📊 Confidence: {$ocrResult['confidence']}%");
            $this->info("🔧 Method used: {$ocrResult['method_used']}");
            $this->info("📝 Text length: " . strlen($ocrResult['text']) . " characters");
            
            if ($showDetails) {
                $this->info("\n📋 All OCR attempts:");
                foreach ($ocrResult['all_attempts'] as $method => $result) {
                    $this->line("  - {$method}: {$result['confidence']}% confidence");
                }
            }
            
            // Étape 2: Pattern matching
            $this->info("\n🔍 Starting pattern analysis...");
            $patternStartTime = microtime(true);
            
            $patternResult = $patternService->analyzeForTacitRenewal($ocrResult['text']);
            
            $patternTime = microtime(true) - $patternStartTime;
            
            $this->info("✅ Pattern analysis completed in " . round($patternTime, 2) . "s");
            $this->info("🔄 Tacit renewal detected: " . ($patternResult['tacit_renewal_detected'] ? 'YES' : 'NO'));
            $this->info("📊 Pattern confidence: " . round($patternResult['confidence_score'] * 100, 1) . "%");
            $this->info("🎯 Patterns matched: " . count($patternResult['patterns_matched']));
            
            if (!empty($patternResult['validation_warnings'])) {
                $this->warn("⚠️  Validation warnings:");
                foreach ($patternResult['validation_warnings'] as $warning) {
                    $this->line("  - {$warning}");
                }
            }
            
            // Afficher les données extraites
            if (!empty($patternResult['extracted_data'])) {
                $this->info("\n📋 Extracted data:");
                $data = $patternResult['extracted_data'];
                
                if (!empty($data['start_dates'])) {
                    $this->line("  📅 Start date: " . $data['start_dates'][0]['date']);
                }
                
                if (!empty($data['end_dates'])) {
                    $this->line("  📅 End date: " . $data['end_dates'][0]['date']);
                }
                
                if (isset($data['notice_period_days'])) {
                    $this->line("  ⏰ Notice period: {$data['notice_period_days']} days");
                }
                
                if (!empty($data['monthly_amount'])) {
                    $this->line("  💰 Monthly amount: " . $data['monthly_amount'][0]['amount'] . "€");
                }
                
                if (!empty($data['annual_amount'])) {
                    $this->line("  💰 Annual amount: " . $data['annual_amount'][0]['amount'] . "€");
                }
            }
            
            // Afficher les patterns détectés
            if ($showDetails && !empty($patternResult['patterns_matched'])) {
                $this->info("\n🎯 Patterns matched:");
                foreach ($patternResult['patterns_matched'] as $pattern) {
                    $confidence = round($pattern['confidence'] * 100, 1);
                    $this->line("  - {$pattern['type']}: \"{$pattern['match']}\" ({$confidence}%)");
                }
            }
            
            // Générer un résumé
            $summary = $patternService->getSummary($patternResult);
            
            if (!empty($summary['recommendations'])) {
                $this->info("\n💡 Recommendations:");
                foreach ($summary['recommendations'] as $recommendation) {
                    $this->line("  - {$recommendation}");
                }
            }
            
            // Afficher un extrait du texte
            if ($showDetails) {
                $this->info("\n📄 Text preview (first 300 chars):");
                $this->line(substr($ocrResult['text'], 0, 300) . "...");
            }
            
            $totalTime = microtime(true) - $startTime;
            $this->info("\n⏱️  Total processing time: " . round($totalTime, 2) . "s");
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("❌ Enhanced OCR failed: " . $e->getMessage());
            
            if ($showDetails) {
                $this->error("Stack trace:");
                $this->line($e->getTraceAsString());
            }
            
            return 1;
        }
    }
}
