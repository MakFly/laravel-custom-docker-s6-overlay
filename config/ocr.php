<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OCR Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration pour le service OCR optimisé
    |
    */

    // Seuil de confiance général
    'confidence_threshold' => env('OCR_CONFIDENCE_THRESHOLD', 70),

    // Activer le preprocessing avancé
    'enable_preprocessing' => env('OCR_ENABLE_PREPROCESSING', true),

    // Cache des résultats OCR
    'cache_results' => env('OCR_CACHE_RESULTS', true),
    'cache_ttl' => env('OCR_CACHE_TTL', 3600), // 1 heure

    // Paramètres de qualité d'image
    'image_quality' => [
        'max_width' => 4000,
        'max_height' => 4000,
        'min_width' => 1500,
        'min_height' => 1500,
        'jpeg_quality' => 95,
    ],

    // Configuration PDF
    'pdf' => [
        'resolution' => 400, // DPI
        'format' => 'jpeg',
        'quality' => 90,
    ],

    // Configuration Tesseract
    'tesseract' => [
        'languages' => ['fra', 'eng'],
        'default_psm' => 3, // Fully automatic page segmentation
        'default_oem' => 3, // Default OCR Engine Mode
        'fallback_configs' => [
            ['psm' => 1, 'oem' => 1],
            ['psm' => 6, 'oem' => 2],
        ],
    ],

    // Métrique de confiance
    'confidence_metrics' => [
        'base_score' => 50,
        'length_bonus' => [
            100 => 10,   // 10 points si plus de 100 caractères
            500 => 10,   // 10 points supplémentaires si plus de 500
            1000 => 5,   // 5 points supplémentaires si plus de 1000
        ],
        'alpha_ratio_weight' => 20,
        'french_words_weight' => 15,
        'special_char_penalty' => 20,
        'short_words_penalty' => 15,
        'structure_bonus' => 5,
    ],
]; 