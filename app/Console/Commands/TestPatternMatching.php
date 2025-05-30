<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ContractPatternService;

class TestPatternMatching extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'test:pattern-matching {text_file} {--show-details}';

    /**
     * The console command description.
     */
    protected $description = 'Test pattern matching on a text file';

    /**
     * Execute the console command.
     */
    public function handle(ContractPatternService $patternService)
    {
        $textFile = $this->argument('text_file');
        $showDetails = $this->option('show-details');
        
        if (!file_exists($textFile)) {
            $this->error("File not found: {$textFile}");
            return 1;
        }
        
        $text = file_get_contents($textFile);
        
        if (empty($text)) {
            $this->error("File is empty or unreadable");
            return 1;
        }
        
        $this->info("Testing Pattern Matching");
        $this->info("File: {$textFile}");
        $this->info("Text length: " . strlen($text) . " characters");
        
        try {
            $startTime = microtime(true);
            
            $result = $patternService->analyzeForTacitRenewal($text);
            
            $processingTime = microtime(true) - $startTime;
            
            $this->info("\n📊 Results:");
            $this->info("🔄 Tacit renewal detected: " . ($result['tacit_renewal_detected'] ? 'YES' : 'NO'));
            $this->info("📊 Confidence score: " . round($result['confidence_score'] * 100, 1) . "%");
            $this->info("🎯 Patterns matched: " . count($result['patterns_matched']));
            
            if (!empty($result['validation_warnings'])) {
                $this->warn("\n⚠️  Validation warnings:");
                foreach ($result['validation_warnings'] as $warning) {
                    $this->line("  - {$warning}");
                }
            }
            
            // Afficher les données extraites
            if (!empty($result['extracted_data'])) {
                $this->info("\n📋 Extracted data:");
                $data = $result['extracted_data'];
                
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
            if ($showDetails && !empty($result['patterns_matched'])) {
                $this->info("\n🎯 Patterns matched:");
                foreach ($result['patterns_matched'] as $pattern) {
                    $confidence = round($pattern['confidence'] * 100, 1);
                    $this->line("  - {$pattern['type']}: \"{$pattern['match']}\" ({$confidence}%)");
                }
            }
            
            // Générer un résumé
            $summary = $patternService->getSummary($result);
            
            if (!empty($summary['recommendations'])) {
                $this->info("\n💡 Recommendations:");
                foreach ($summary['recommendations'] as $recommendation) {
                    $this->line("  - {$recommendation}");
                }
            }
            
            $this->info("\n⏱️  Processing time: " . round($processingTime * 1000, 2) . "ms");
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("❌ Pattern matching failed: " . $e->getMessage());
            
            if ($showDetails) {
                $this->error("Stack trace:");
                $this->line($e->getTraceAsString());
            }
            
            return 1;
        }
    }
} 