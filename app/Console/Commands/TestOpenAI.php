<?php

namespace App\Console\Commands;

use App\Services\OpenAIService;
use Illuminate\Console\Command;

class TestOpenAI extends Command
{
    protected $signature = 'openai:test';
    protected $description = 'Test OpenAI configuration and connection';

    public function handle(OpenAIService $aiService): int
    {
        $this->info('🔍 Test de la configuration OpenAI...');
        $this->newLine();

        // Test 1: Configuration
        $this->info('1. Configuration OpenAI:');
        $apiKey = config('openai.api_key');
        if ($apiKey) {
            $maskedKey = 'sk-***' . substr($apiKey, -4);
            $this->line("   ✅ Clé API: {$maskedKey}");
        } else {
            $this->error('   ❌ Clé API manquante');
            $this->warn('   💡 Ajoutez OPENAI_API_KEY dans votre .env');
            return Command::FAILURE;
        }

        $this->line('   📋 Modèle: ' . config('openai.model', 'gpt-4'));
        $this->line('   🎯 Max tokens: ' . config('openai.max_tokens', 2000));
        $this->newLine();

        // Test 2: Connexion
        $this->info('2. Test de connexion OpenAI:');
        try {
            $connected = $aiService->testConnection();
            
            if ($connected) {
                $this->line('   ✅ Connexion OpenAI réussie');
            } else {
                $this->error('   ❌ Échec de connexion OpenAI');
                return Command::FAILURE;
            }
        } catch (\Exception $e) {
            $this->error('   ❌ Erreur: ' . $e->getMessage());
            return Command::FAILURE;
        }
        $this->newLine();

        // Test 3: Analyse
        $this->info('3. Test d\'analyse de contrat:');
        $testText = "CONTRAT D'ASSURANCE AUTOMOBILE\n\nSouscripteur: Jean Dupont\nDurée: 12 mois à compter du 01/01/2024\nÉchéance: 31/12/2024\nMontant annuel: 850 EUR\n\nCLAUSE DE RECONDUCTION TACITE:\nLe présent contrat se renouvelle automatiquement par périodes de 12 mois sauf résiliation par l'une des parties moyennant un préavis de 2 mois avant l'échéance.\n\nCONDITIONS DE RÉSILIATION:\n- Résiliation possible à tout moment après la première année\n- Préavis de 60 jours avant échéance\n- Lettre recommandée avec accusé de réception";

        try {
            $this->line('   📝 Analyse en cours...');
            $analysis = $aiService->analyzeContract($testText);
            
            $this->line('   ✅ Analyse terminée');
            $this->line('   📊 Résultats:');
            $this->line('      - Type: ' . ($analysis['type_contrat'] ?? 'non détecté'));
            $this->line('      - Reconduction tacite: ' . ($analysis['reconduction_tacite'] ? 'Oui' : 'Non'));
            $this->line('      - Montant: ' . ($analysis['montant'] ?? 0) . ' EUR');
            $this->line('      - Préavis: ' . ($analysis['preavis_resiliation_jours'] ?? 0) . ' jours');
            $this->line('      - Confiance: ' . round(($analysis['confidence_score'] ?? 0) * 100, 1) . '%');
            
            if (($analysis['confidence_score'] ?? 0) >= 0.7) {
                $this->line('   🎯 Analyse de haute qualité (confiance >= 70%)');
            } else {
                $this->warn('   ⚠️  Analyse de faible confiance (< 70%)');
            }
            
        } catch (\Exception $e) {
            $this->error('   ❌ Erreur d\'analyse: ' . $e->getMessage());
            return Command::FAILURE;
        }

        $this->newLine();
        $this->info('🎉 Tous les tests OpenAI sont passés avec succès !');
        $this->info('💡 Vous pouvez maintenant uploader des contrats pour test.');
        
        return Command::SUCCESS;
    }
} 