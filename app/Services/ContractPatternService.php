<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ContractPatternService
{
    protected array $config;
    protected array $patterns;

    public function __construct()
    {
        $this->config = config('contract_patterns', [
            'confidence_threshold' => 0.7,
            'date_tolerance_days' => 30,
            'amount_tolerance_percent' => 0.15,
        ]);

        $this->initializePatterns();
    }

    /**
     * Analyse le texte OCR pour extraire les informations de tacite reconduction
     */
    public function analyzeForTacitRenewal(string $text): array
    {
        $results = [
            'tacit_renewal_detected' => false,
            'confidence_score' => 0.0,
            'extracted_data' => [],
            'patterns_matched' => [],
            'validation_warnings' => [],
            'metadata' => [
                'text_length' => strlen($text),
                'analysis_timestamp' => now()->toISOString(),
                'patterns_tested' => count($this->patterns)
            ]
        ];

        Log::info("Starting contract pattern analysis", [
            'text_length' => strlen($text),
            'patterns_count' => count($this->patterns)
        ]);

        // Nettoyer et normaliser le texte
        $normalizedText = $this->normalizeText($text);

        // Rechercher les patterns de tacite reconduction
        $tacitRenewalResults = $this->detectTacitRenewalPatterns($normalizedText);
        $results = array_merge($results, $tacitRenewalResults);

        // Extraire les données contractuelles
        $extractedData = $this->extractContractData($normalizedText);
        $results['extracted_data'] = array_merge($results['extracted_data'], $extractedData);

        // Valider la cohérence des données extraites
        $validationResults = $this->validateExtractedData($results['extracted_data']);
        $results['validation_warnings'] = $validationResults['warnings'];
        $results['confidence_score'] = $this->calculateOverallConfidence($results);

        Log::info("Contract pattern analysis completed", [
            'tacit_renewal_detected' => $results['tacit_renewal_detected'],
            'confidence_score' => $results['confidence_score'],
            'patterns_matched' => count($results['patterns_matched']),
            'warnings_count' => count($results['validation_warnings'])
        ]);

        return $results;
    }

    /**
     * Initialise les patterns de détection
     */
    private function initializePatterns(): void
    {
        $this->patterns = [
            'tacit_renewal' => [
                // Expressions explicites de tacite reconduction
                'explicit' => [
                    '/\btacite?\s+reconduction\b/i',
                    '/\brenouvellement\s+automatique\b/i',
                    '/\breconduction\s+tacite\b/i',
                    '/\bautomatiquement\s+renouvel[ée]?\b/i',
                    '/\bprorog[éa]tion\s+automatique\b/i',
                    '/renewal\s+type:\s*tacite\s+reconduction/i', // Format structuré
                ],
                // Formulations indirectes
                'implicit' => [
                    '/(?:sauf\s+)?d[ée]nonciation?\s+(?:express?e?\s+)?(?:par\s+)?(?:l\'une\s+des\s+)?parties?\b/i',
                    '/(?:à\s+)?d[ée]faut\s+de\s+(?:d[ée]nonciation?|r[ée]siliation?)\b/i',
                    '/renouvel[éa]ble?\s+(?:par\s+)?p[ée]riodes?\b/i',
                    '/prorogation\s+d\'une?\s+(?:ann[ée]e?|p[ée]riode)\b/i',
                ],
                // Conditions de résiliation
                'termination_conditions' => [
                    '/pr[ée]avis\s+de\s+(\d+)\s+(jours?|mois|semaines?)\b/i',
                    '/lettre\s+recommand[ée]e?\s+avec\s+accus[ée]\s+de\s+r[ée]ception\b/i',
                    '/(\d+)\s+(mois|jours?)\s+avant\s+(?:l\')?[ée]ch[ée]ance\b/i',
                    '/d[ée]lai\s+de\s+pr[ée]avis\s+de\s+(\d+)\b/i',
                    '/cancellation\s+notice\s+days:\s*(\d+)/i', // Format structuré anglais
                ]
            ],
            'dates' => [
                // Dates de début/fin
                'start_dates' => [
                    '/(?:(?:prend\s+effet|commence|d[ée]bute)\s+(?:le\s+)?)?(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i',
                    '/(?:à\s+)?(?:compter\s+)?du\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i',
                    '/start\s+date:\s*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i', // Format structuré YYYY-MM-DD
                ],
                'end_dates' => [
                    '/(?:jusqu\'au|jusqu\'?à|se\s+termine\s+le)\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i',
                    '/[ée]ch[ée]ance\s+(?:du\s+|le\s+)?(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i',
                    '/end\s+date:\s*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i', // Format structuré YYYY-MM-DD
                ],
                'renewal_dates' => [
                    '/renouvel[éa]ble?\s+(?:le\s+)?(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i',
                    '/prochaine\s+[ée]ch[ée]ance\s+(?:le\s+)?(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i',
                ]
            ],
            'amounts' => [
                // Montants et tarifs
                'monthly' => [
                    '/(\d+(?:[,\.]\d{2})?)\s*€?\s*\/?\s*(?:par\s+)?mois/i',
                    '/(?:montant\s+)?mensuel(?:le)?\s*:?\s*(\d+(?:[,\.]\d{2})?)\s*€?/i',
                ],
                'annual' => [
                    '/(\d+(?:[,\.]\d{2})?)\s*€?\s*\/?\s*(?:par\s+)?an/i',
                    '/(?:montant\s+)?annuel(?:le)?\s*:?\s*(\d+(?:[,\.]\d{2})?)\s*€?/i',
                ],
                'total' => [
                    '/(?:montant\s+)?total\s*:?\s*(\d+(?:[,\.]\d{2})?)\s*€?/i',
                    '/co[ûu]t\s+(?:total\s+)?:?\s*(\d+(?:[,\.]\d{2})?)\s*€?/i',
                ]
            ],
            'durations' => [
                // Durées de contrat
                'contract_duration' => [
                    '/dur[ée]e\s+(?:du\s+contrat\s+)?:?\s*(\d+)\s+(ans?|mois|ann[ée]es?)/i',
                    '/p[ée]riode\s+(?:initiale\s+)?:?\s*(\d+)\s+(ans?|mois|ann[ée]es?)/i',
                ],
                'notice_period' => [
                    '/pr[ée]avis\s+de\s+(\d+)\s+(jours?|mois|semaines?)/i',
                    '/d[ée]lai\s+de\s+pr[ée]avis\s*:?\s*(\d+)\s+(jours?|mois)/i',
                ],
                'renewal_period' => [
                    '/renouvel[éa]ble?\s+(?:par\s+)?p[ée]riodes?\s+de\s+(\d+)\s+(ans?|mois|ann[ée]es?)/i',
                    '/reconduction\s+pour\s+(\d+)\s+(ans?|mois|ann[ée]es?)/i',
                ]
            ]
        ];
    }

    /**
     * Détecte les patterns de tacite reconduction
     */
    private function detectTacitRenewalPatterns(string $text): array
    {
        $results = [
            'tacit_renewal_detected' => false,
            'patterns_matched' => [],
            'extracted_data' => []
        ];

        $score = 0;
        $maxScore = 0;

        // Vérifier les patterns explicites (score élevé)
        foreach ($this->patterns['tacit_renewal']['explicit'] as $pattern) {
            $maxScore += 3;
            if (preg_match($pattern, $text, $matches)) {
                $score += 3;
                $results['patterns_matched'][] = [
                    'type' => 'explicit_tacit_renewal',
                    'pattern' => $pattern,
                    'match' => $matches[0],
                    'confidence' => 0.9
                ];
            }
        }

        // Vérifier les patterns implicites (score moyen)
        foreach ($this->patterns['tacit_renewal']['implicit'] as $pattern) {
            $maxScore += 2;
            if (preg_match($pattern, $text, $matches)) {
                $score += 2;
                $results['patterns_matched'][] = [
                    'type' => 'implicit_tacit_renewal',
                    'pattern' => $pattern,
                    'match' => $matches[0],
                    'confidence' => 0.7
                ];
            }
        }

        // Vérifier les conditions de résiliation (score faible mais indicatif)
        foreach ($this->patterns['tacit_renewal']['termination_conditions'] as $pattern) {
            $maxScore += 1;
            if (preg_match($pattern, $text, $matches)) {
                $score += 1;
                $results['patterns_matched'][] = [
                    'type' => 'termination_condition',
                    'pattern' => $pattern,
                    'match' => $matches[0],
                    'confidence' => 0.6
                ];
                
                // Extraire le délai de préavis si présent
                if (isset($matches[1]) && is_numeric($matches[1])) {
                    $results['extracted_data']['notice_period_days'] = $this->convertTodays($matches[1], $matches[2] ?? 'jours');
                }
            }
        }

        // Calculer si tacite reconduction détectée
        $tacitConfidence = $maxScore > 0 ? $score / $maxScore : 0;
        
        // Logic améliorée: si on a des patterns explicites forts, on peut détecter avec un seuil plus bas
        $explicitPatternsFound = 0;
        foreach ($results['patterns_matched'] as $pattern) {
            if ($pattern['type'] === 'explicit_tacit_renewal') {
                $explicitPatternsFound++;
            }
        }
        
        // Si on a au moins 2 patterns explicites OU un ratio >= 0.3
        $results['tacit_renewal_detected'] = ($explicitPatternsFound >= 2) || ($tacitConfidence >= 0.3);

        return $results;
    }

    /**
     * Extrait les données contractuelles
     */
    private function extractContractData(string $text): array
    {
        $data = [];

        // Extraire les dates
        $dates = $this->extractDates($text);
        $data = array_merge($data, $dates);

        // Extraire les montants
        $amounts = $this->extractAmounts($text);
        $data = array_merge($data, $amounts);

        // Extraire les durées
        $durations = $this->extractDurations($text);
        $data = array_merge($data, $durations);

        return $data;
    }

    /**
     * Extrait les dates du contrat
     */
    private function extractDates(string $text): array
    {
        $dates = [];

        foreach ($this->patterns['dates'] as $dateType => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $text, $matches, PREG_SET_ORDER)) {
                    foreach ($matches as $match) {
                        try {
                            // Check if it's YYYY-MM-DD format (for structured data)
                            if (strlen($match[1]) === 4 && (int)$match[1] > 1900) {
                                // YYYY-MM-DD format
                                $year = (int)$match[1];
                                $month = (int)$match[2];
                                $day = (int)$match[3];
                            } else {
                                // DD/MM/YYYY format (traditional)
                                $day = (int)$match[1];
                                $month = (int)$match[2];
                                $year = (int)$match[3];
                            }
                            
                            if (checkdate($month, $day, $year)) {
                                $date = Carbon::createFromDate($year, $month, $day);
                                $dates[$dateType][] = [
                                    'date' => $date->format('Y-m-d'),
                                    'confidence' => 0.8,
                                    'source_text' => $match[0]
                                ];
                            }
                        } catch (\Exception $e) {
                            Log::debug("Date parsing failed: " . $e->getMessage());
                        }
                    }
                }
            }
        }

        return $dates;
    }

    /**
     * Extrait les montants
     */
    private function extractAmounts(string $text): array
    {
        $amounts = [];

        foreach ($this->patterns['amounts'] as $amountType => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $text, $matches, PREG_SET_ORDER)) {
                    foreach ($matches as $match) {
                        $rawAmount = str_replace(',', '.', $match[1]);
                        if (is_numeric($rawAmount)) {
                            $amounts[$amountType . '_amount'][] = [
                                'amount' => (float)$rawAmount,
                                'confidence' => 0.75,
                                'source_text' => $match[0]
                            ];
                        }
                    }
                }
            }
        }

        return $amounts;
    }

    /**
     * Extrait les durées
     */
    private function extractDurations(string $text): array
    {
        $durations = [];

        foreach ($this->patterns['durations'] as $durationType => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $text, $matches, PREG_SET_ORDER)) {
                    foreach ($matches as $match) {
                        $value = (int)$match[1];
                        $unit = strtolower($match[2]);
                        
                        $days = $this->convertTodays($value, $unit);
                        if ($days > 0) {
                            $durations[$durationType][] = [
                                'days' => $days,
                                'original_value' => $value,
                                'original_unit' => $unit,
                                'confidence' => 0.8,
                                'source_text' => $match[0]
                            ];
                        }
                    }
                }
            }
        }

        return $durations;
    }

    /**
     * Convertit une durée en jours
     */
    private function convertTodays(int $value, string $unit): int
    {
        $unit = strtolower(trim($unit));
        
        switch ($unit) {
            case 'jour':
            case 'jours':
                return $value;
            case 'semaine':
            case 'semaines':
                return $value * 7;
            case 'mois':
                return $value * 30; // Approximation
            case 'an':
            case 'ans':
            case 'année':
            case 'années':
                return $value * 365;
            default:
                return 0;
        }
    }

    /**
     * Valide la cohérence des données extraites
     */
    private function validateExtractedData(array $data): array
    {
        $warnings = [];

        // Vérifier la cohérence des dates
        if (isset($data['start_dates']) && isset($data['end_dates'])) {
            $startDate = $data['start_dates'][0]['date'] ?? null;
            $endDate = $data['end_dates'][0]['date'] ?? null;
            
            if ($startDate && $endDate) {
                $start = Carbon::parse($startDate);
                $end = Carbon::parse($endDate);
                
                if ($end->lte($start)) {
                    $warnings[] = "Date de fin antérieure ou égale à la date de début";
                }
                
                $duration = $start->diffInDays($end);
                if ($duration > 365 * 10) { // Plus de 10 ans
                    $warnings[] = "Durée de contrat exceptionnellement longue ({$duration} jours)";
                }
            }
        }

        // Vérifier la cohérence des montants
        $monthlyAmounts = $data['monthly_amount'] ?? [];
        $annualAmounts = $data['annual_amount'] ?? [];
        
        if (!empty($monthlyAmounts) && !empty($annualAmounts)) {
            $monthly = $monthlyAmounts[0]['amount'];
            $annual = $annualAmounts[0]['amount'];
            $expectedAnnual = $monthly * 12;
            
            $tolerance = $expectedAnnual * $this->config['amount_tolerance_percent'];
            if (abs($annual - $expectedAnnual) > $tolerance) {
                $warnings[] = "Incohérence entre montant mensuel ({$monthly}€) et annuel ({$annual}€)";
            }
        }

        // Vérifier les délais de préavis
        if (isset($data['notice_period_days'])) {
            $noticeDays = $data['notice_period_days'];
            if ($noticeDays < 1) {
                $warnings[] = "Délai de préavis trop court ({$noticeDays} jours)";
            } elseif ($noticeDays > 365) {
                $warnings[] = "Délai de préavis exceptionnellement long ({$noticeDays} jours)";
            }
        }

        return ['warnings' => $warnings];
    }

    /**
     * Calcule un score de confiance global
     */
    private function calculateOverallConfidence(array $results): float
    {
        $confidence = 0;
        $factors = [];

        // Facteur de détection de tacite reconduction
        if ($results['tacit_renewal_detected']) {
            $tacitScore = 0;
            foreach ($results['patterns_matched'] as $match) {
                $tacitScore += $match['confidence'] * 0.3;
            }
            $factors['tacit_renewal'] = min(1.0, $tacitScore);
        }

        // Facteur de qualité des données extraites
        $dataQuality = 0;
        $extractedData = $results['extracted_data'];
        
        if (!empty($extractedData['start_dates'])) $dataQuality += 0.2;
        if (!empty($extractedData['end_dates'])) $dataQuality += 0.2;
        if (!empty($extractedData['monthly_amount']) || !empty($extractedData['annual_amount'])) $dataQuality += 0.2;
        if (isset($extractedData['notice_period_days'])) $dataQuality += 0.3;
        if (!empty($extractedData['contract_duration'])) $dataQuality += 0.1;
        
        $factors['data_quality'] = $dataQuality;

        // Facteur de cohérence (pénaliser les warnings)
        $consistencyScore = 1.0 - (count($results['validation_warnings']) * 0.1);
        $factors['consistency'] = max(0, $consistencyScore);

        // Calcul pondéré
        $confidence = ($factors['tacit_renewal'] ?? 0) * 0.4 +
                     ($factors['data_quality'] ?? 0) * 0.4 +
                     ($factors['consistency'] ?? 0) * 0.2;

        return round($confidence, 3);
    }

    /**
     * Normalise le texte pour améliorer la détection de patterns
     */
    private function normalizeText(string $text): string
    {
        // Remplacer les caractères similaires
        $text = str_replace(['â', 'ê', 'î', 'ô', 'û'], ['à', 'è', 'ì', 'ò', 'ù'], $text);
        $text = str_replace(['é', 'è', 'ë'], ['e', 'e', 'e'], $text);
        
        // Normaliser les espaces
        $text = preg_replace('/\s+/', ' ', $text);
        
        // Normaliser les tirets et apostrophes
        $text = str_replace(['–', '—', "\u{2018}", "\u{2019}"], ['-', '-', "'", "'"], $text);
        
        return $text;
    }

    /**
     * Obtient une synthèse des résultats pour affichage
     */
    public function getSummary(array $analysisResults): array
    {
        $summary = [
            'tacit_renewal' => $analysisResults['tacit_renewal_detected'],
            'confidence' => $analysisResults['confidence_score'],
            'key_findings' => [],
            'recommendations' => []
        ];

        // Extraire les informations clés
        $data = $analysisResults['extracted_data'];
        
        if (!empty($data['start_dates'])) {
            $summary['key_findings'][] = "Date de début: " . $data['start_dates'][0]['date'];
        }
        
        if (!empty($data['end_dates'])) {
            $summary['key_findings'][] = "Date de fin: " . $data['end_dates'][0]['date'];
        }
        
        if (isset($data['notice_period_days'])) {
            $summary['key_findings'][] = "Préavis: {$data['notice_period_days']} jours";
        }

        // Générer des recommandations
        if ($analysisResults['tacit_renewal_detected']) {
            if (isset($data['notice_period_days'])) {
                $summary['recommendations'][] = "Attention: Ce contrat se renouvelle automatiquement. Préavis de {$data['notice_period_days']} jours requis.";
            } else {
                $summary['recommendations'][] = "Attention: Tacite reconduction détectée. Vérifiez les conditions de résiliation.";
            }
        }

        if (!empty($analysisResults['validation_warnings'])) {
            $summary['recommendations'][] = "Vérification manuelle recommandée en raison d'incohérences détectées.";
        }

        return $summary;
    }
} 