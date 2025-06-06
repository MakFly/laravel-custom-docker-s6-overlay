<?php

namespace App\Services;

use OpenAI\Client;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    protected Client $client;
    protected CircuitBreakerService $circuitBreaker;

    public function __construct()
    {
        $this->client = \OpenAI::client(config('openai.api_key'));
        $this->circuitBreaker = new CircuitBreakerService(
            'openai',
            failureThreshold: 5,
            recoveryTimeout: 300, // 5 minutes
            successThreshold: 2
        );
    }

    public function analyzeContract(string $contractText): array
    {
        $prompt = $this->buildAnalysisPrompt($contractText);

        return $this->circuitBreaker->execute(
            function() use ($prompt) {
                $response = $this->client->chat()->create([
                    'model' => config('openai.model', 'gpt-4'),
                    'messages' => [
                        ['role' => 'system', 'content' => $this->getSystemPrompt()],
                        ['role' => 'user', 'content' => $prompt]
                    ],
                    'temperature' => 0.1,
                    'max_tokens' => config('openai.max_tokens', 2000),
                ]);

                $content = $response->choices[0]->message->content;
                
                Log::info('OpenAI response received', ['length' => strlen($content)]);
                
                try {
                    $analysis = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                    return $this->validateAndCleanAnalysis($analysis);
                } catch (\JsonException $e) {
                    Log::warning('Failed to parse OpenAI JSON response', ['error' => $e->getMessage()]);
                    return $this->parseUnstructuredResponse($content);
                }
            },
            function(\Exception $e) {
                Log::warning('OpenAI circuit breaker fallback triggered', [
                    'error' => $e->getMessage(),
                    'circuit_breaker_metrics' => $this->circuitBreaker->getMetrics()
                ]);

                // Fallback to pattern matching service
                $patternService = app(ContractPatternService::class);
                $result = $patternService->analyzeContract($contractText);
                
                return [
                    'analysis_method' => 'pattern_fallback',
                    'is_tacit_renewal' => $result['is_tacit_renewal'] ?? false,
                    'end_date' => $result['end_date'] ?? null,
                    'notice_period_days' => $result['notice_period_days'] ?? null,
                    'next_renewal_date' => $result['next_renewal_date'] ?? null,
                    'confidence' => $result['confidence_score'] ?? 0.5,
                    'fallback_reason' => 'OpenAI service unavailable - using pattern matching',
                    'warnings' => ['Service IA temporairement indisponible, analyse basique utilisée']
                ];
            }
        );
    }

    private function getSystemPrompt(): string
    {
        return "Tu es un expert en analyse de contrats français. Analyse le contrat fourni et extrais les informations clés au format JSON strict. Concentre-toi particulièrement sur les clauses de reconduction tacite et les conditions de résiliation. Sois précis et factuel dans ton analyse.";
    }

    private function buildAnalysisPrompt(string $contractText): string
    {
        return "Analyse ce contrat et retourne un JSON avec ces champs exacts :
{
  \"type_contrat\": \"string (assurance/telecom/energie/banque/autre)\",
  \"reconduction_tacite\": boolean,
  \"duree_engagement\": \"string (ex: 12 mois, 2 ans)\",
  \"preavis_resiliation_jours\": number,
  \"date_debut\": \"YYYY-MM-DD ou null\",
  \"date_fin\": \"YYYY-MM-DD ou null\",
  \"montant\": number,
  \"frequence_paiement\": \"string (mensuel/annuel/trimestriel/autre)\",
  \"conditions_resiliation\": [\"array de strings décrivant les conditions\"],
  \"clauses_importantes\": [\"array de strings avec les clauses clés\"],
  \"confidence_score\": number (0-1, précision de l'analyse)
}

Contrat à analyser :
" . substr($contractText, 0, 8000); // Limiter la taille pour éviter les erreurs de token
    }

    private function validateAndCleanAnalysis(array $analysis): array
    {
        // Valeurs par défaut
        $defaults = [
            'type_contrat' => 'autre',
            'reconduction_tacite' => false,
            'duree_engagement' => null,
            'preavis_resiliation_jours' => 30,
            'date_debut' => null,
            'date_fin' => null,
            'montant' => 0,
            'frequence_paiement' => 'mensuel',
            'conditions_resiliation' => [],
            'clauses_importantes' => [],
            'confidence_score' => 0.5
        ];

        // Merger avec les defaults
        $analysis = array_merge($defaults, $analysis);

        // Validation et nettoyage
        $analysis['reconduction_tacite'] = (bool) $analysis['reconduction_tacite'];
        $analysis['preavis_resiliation_jours'] = max(0, (int) $analysis['preavis_resiliation_jours']);
        $analysis['montant'] = max(0, (float) $analysis['montant']);
        $analysis['confidence_score'] = max(0, min(1, (float) $analysis['confidence_score']));

        // Validation des dates
        if ($analysis['date_debut'] && !$this->isValidDate($analysis['date_debut'])) {
            $analysis['date_debut'] = null;
        }
        if ($analysis['date_fin'] && !$this->isValidDate($analysis['date_fin'])) {
            $analysis['date_fin'] = null;
        }

        // S'assurer que les arrays sont bien des arrays
        $analysis['conditions_resiliation'] = is_array($analysis['conditions_resiliation']) 
            ? $analysis['conditions_resiliation'] 
            : [];
        $analysis['clauses_importantes'] = is_array($analysis['clauses_importantes']) 
            ? $analysis['clauses_importantes'] 
            : [];

        return $analysis;
    }

    private function parseUnstructuredResponse(string $content): array
    {
        // Parsing de secours si l'IA ne retourne pas du JSON valide
        Log::warning('Using fallback parsing for OpenAI response');
        
        $analysis = [
            'type_contrat' => 'autre',
            'reconduction_tacite' => false,
            'duree_engagement' => null,
            'preavis_resiliation_jours' => 30,
            'date_debut' => null,
            'date_fin' => null,
            'montant' => 0,
            'frequence_paiement' => 'mensuel',
            'conditions_resiliation' => [],
            'clauses_importantes' => [],
            'confidence_score' => 0.1,
            'raw_response' => $content
        ];

        // Tentative d'extraction de quelques informations basiques
        if (preg_match('/reconduction\s+tacite/i', $content)) {
            $analysis['reconduction_tacite'] = true;
            $analysis['confidence_score'] = 0.3;
        }

        return $analysis;
    }

    private function isValidDate(string $date): bool
    {
        try {
            $d = \DateTime::createFromFormat('Y-m-d', $date);
            return $d && $d->format('Y-m-d') === $date;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Test OpenAI connection
     */
    public function testConnection(): bool
    {
        if (!config('openai.api_key')) {
            return false;
        }
        
        try {
            $response = $this->client->chat()->create([
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    ['role' => 'user', 'content' => 'Hello']
                ],
                'max_tokens' => 5,
            ]);
            
            return !empty($response->choices);
        } catch (\Exception $e) {
            Log::error('OpenAI test connection failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Obtenir les modèles disponibles
     */
    public function getAvailableModels(): array
    {
        try {
            $response = $this->client->models()->list();
            return collect($response->data)
                ->pluck('id')
                ->filter(fn($model) => str_contains($model, 'gpt'))
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('Failed to get OpenAI models', ['error' => $e->getMessage()]);
            return [];
        }
    }
} 