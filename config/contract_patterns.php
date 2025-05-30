<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Contract Pattern Analysis Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration pour l'analyse des patterns dans les contrats
    |
    */

    // Seuil de confiance pour pattern matching
    'confidence_threshold' => env('PATTERN_CONFIDENCE_THRESHOLD', 0.7),

    // Tolérance pour validation des données
    'date_tolerance_days' => env('PATTERN_DATE_TOLERANCE', 30),
    'amount_tolerance_percent' => env('PATTERN_AMOUNT_TOLERANCE', 0.15),

    // Seuils de détection pour tacite reconduction
    'tacit_renewal' => [
        'detection_threshold' => 0.3, // Seuil bas car critique
        'explicit_pattern_weight' => 3,
        'implicit_pattern_weight' => 2,
        'termination_condition_weight' => 1,
    ],

    // Mots-clés français pour validation de confiance
    'french_keywords' => [
        'common' => [
            'le', 'la', 'de', 'et', 'à', 'un', 'que', 'est', 'pour', 'du'
        ],
        'contract_specific' => [
            'contrat', 'article', 'clause', 'accord', 'convention',
            'engagement', 'obligation', 'droit', 'service', 'prestation'
        ],
        'tacit_renewal' => [
            'tacite', 'reconduction', 'renouvellement', 'automatique',
            'résiliation', 'préavis', 'dénonciation', 'échéance'
        ]
    ],

    // Validation des délais
    'notice_periods' => [
        'min_days' => 1,
        'max_days' => 365,
        'common_values' => [30, 60, 90], // Valeurs fréquentes
    ],

    // Validation des durées de contrat
    'contract_durations' => [
        'min_days' => 1,
        'max_days' => 365 * 10, // 10 ans maximum
        'suspicious_threshold' => 365 * 5, // Au-delà de 5 ans, vérification
    ],

    // Validation des montants
    'amounts' => [
        'min_value' => 0,
        'max_value' => 1000000, // 1M€ maximum
        'suspicious_threshold' => 100000, // Au-delà de 100k€, vérification
        'monthly_annual_ratio_tolerance' => 0.15, // 15% de tolérance
    ],

    // Configuration des recommandations
    'recommendations' => [
        'priorities' => ['high', 'medium', 'low'],
        'types' => [
            'tacit_renewal_warning',
            'tacit_renewal_check',
            'low_ocr_quality',
            'data_inconsistency',
            'schedule_alert',
            'manual_verification'
        ]
    ],
]; 