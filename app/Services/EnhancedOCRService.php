<?php

namespace App\Services;

use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use thiagoalessio\TesseractOCR\TesseractOCR;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class EnhancedOCRService
{
    protected ImageManager $imageManager;
    protected array $config;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver());
        $this->config = config('ocr', [
            'confidence_threshold' => 70,
            'enable_preprocessing' => true,
            'cache_results' => true,
            'cache_ttl' => 3600, // 1 heure
        ]);
    }

    /**
     * Extrait et optimise le texte d'un fichier avec scoring de confiance
     */
    public function extractTextWithConfidence(string $filePath): array
    {
        $cacheKey = "ocr:enhanced:" . md5($filePath);
        
        if ($this->config['cache_results'] && Cache::has($cacheKey)) {
            Log::info("OCR result retrieved from cache", ['file_path' => $filePath]);
            return Cache::get($cacheKey);
        }

        // Use local disk for testing - TODO: configure S3 for production
        // $disk = Storage::disk('local');
        $disk = Storage::disk('private');
        
        if (!$disk->exists($filePath)) {
            throw new \Exception("Le fichier à analyser n'existe pas: {$filePath}");
        }

        $tempDir = storage_path('app/temp/enhanced_ocr');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        
        $fileName = basename($filePath);
        $tempPath = $tempDir . '/' . uniqid() . '_' . $fileName;
        
        try {
            // Télécharger le fichier
            $fileContent = $disk->get($filePath);
            file_put_contents($tempPath, $fileContent);
            
            $extension = strtolower(pathinfo($tempPath, PATHINFO_EXTENSION));
            
            Log::info("Enhanced OCR processing started", [
                'file_path' => $filePath,
                'temp_path' => $tempPath,
                'extension' => $extension,
                'size' => filesize($tempPath)
            ]);

            if ($extension === 'pdf') {
                $result = $this->extractFromPdfWithConfidence($tempPath);
            } else {
                $result = $this->extractFromImageWithConfidence($tempPath);
            }
            
            // Cache le résultat
            if ($this->config['cache_results']) {
                Cache::put($cacheKey, $result, $this->config['cache_ttl']);
            }
            
            // Nettoyer
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            
            Log::error("Enhanced OCR extraction failed: " . $e->getMessage());
            throw new \Exception("Erreur lors de l'extraction OCR optimisée: " . $e->getMessage());
        }
    }

    /**
     * Traite un PDF avec multiple tentatives et scoring
     */
    private function extractFromPdfWithConfidence(string $pdfPath): array
    {
        // First, try to extract native text from PDF
        if ($this->hasNativeText($pdfPath)) {
            Log::info("PDF contains native text, extracting directly", ['pdf_path' => $pdfPath]);
            return $this->extractNativeTextFromPdf($pdfPath);
        }
        
        // Fallback to OCR if no native text
        Log::info("PDF requires OCR processing", ['pdf_path' => $pdfPath]);
        return $this->extractFromPdfWithOCR($pdfPath);
    }
    
    /**
     * Check if PDF contains native extractable text
     */
    private function hasNativeText(string $pdfPath): bool
    {
        try {
            $output = [];
            $returnCode = 0;
            exec("pdftotext " . escapeshellarg($pdfPath) . " - 2>/dev/null", $output, $returnCode);
            
            if ($returnCode === 0) {
                $text = implode("\n", $output);
                $cleanText = trim($text);
                // Consider it has native text if we extracted at least 50 readable characters
                return strlen($cleanText) > 50 && $this->isReadableText($cleanText);
            }
            
            return false;
        } catch (\Exception $e) {
            Log::debug("Failed to check native text: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check if extracted text is readable (not garbled)
     */
    private function isReadableText(string $text): bool
    {
        // Count alphanumeric characters vs total
        $alphanumericCount = preg_match_all('/[a-zA-Z0-9À-ÿ]/', $text);
        $totalLength = strlen($text);
        
        if ($totalLength === 0) return false;
        
        $ratio = $alphanumericCount / $totalLength;
        return $ratio > 0.3; // At least 30% should be readable characters
    }
    
    /**
     * Extract native text from PDF using pdftotext
     */
    private function extractNativeTextFromPdf(string $pdfPath): array
    {
        $startTime = microtime(true);
        
        try {
            $output = [];
            $returnCode = 0;
            exec("pdftotext " . escapeshellarg($pdfPath) . " - 2>/dev/null", $output, $returnCode);
            
            if ($returnCode !== 0) {
                throw new \Exception("pdftotext failed with return code: {$returnCode}");
            }
            
            $text = implode("\n", $output);
            $cleanText = $this->cleanText($text);
            $confidence = $this->calculateConfidence($cleanText);
            
            $processingTime = microtime(true) - $startTime;
            
            Log::info("Native PDF text extracted successfully", [
                'text_length' => strlen($cleanText),
                'confidence' => $confidence,
                'processing_time' => $processingTime
            ]);
            
            return [
                'text' => $cleanText,
                'confidence' => $confidence,
                'method_used' => 'native_pdf_text',
                'all_attempts' => [
                    'native_pdf_text' => [
                        'text' => $cleanText,
                        'confidence' => $confidence,
                        'method' => 'native_pdf_text',
                        'processing_time' => $processingTime
                    ]
                ],
                'metadata' => [
                    'processing_time' => $processingTime,
                    'extraction_method' => 'pdftotext'
                ]
            ];
            
        } catch (\Exception $e) {
            Log::error("Native PDF text extraction failed: " . $e->getMessage());
            throw new \Exception("Failed to extract native text from PDF: " . $e->getMessage());
        }
    }
    
    /**
     * Extract from PDF using OCR (fallback method)
     */
    private function extractFromPdfWithOCR(string $pdfPath): array
    {
        $tempDir = dirname($pdfPath);
        $imagePath = $tempDir . "/pdf-enhanced-" . uniqid() . '.jpg';
        
        try {
            // Convertir PDF avec qualité optimisée
            $this->convertPdfOptimized($pdfPath, $imagePath);
            
            if (!file_exists($imagePath)) {
                throw new \Exception("Échec de la conversion PDF vers image");
            }

            // Extraire avec confidence
            $result = $this->extractFromImageWithConfidence($imagePath);

            // Nettoyer
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }

            return $result;
            
        } catch (\Exception $e) {
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
            throw $e;
        }
    }

    /**
     * Conversion PDF optimisée pour OCR
     */
    private function convertPdfOptimized(string $pdfPath, string $outputPath): void
    {
        // Conversion haute résolution avec pdftoppm
        $command = sprintf(
            'pdftoppm -jpeg -r 400 -f 1 -l 1 -q %s %s',
            escapeshellarg($pdfPath),
            escapeshellarg(pathinfo($outputPath, PATHINFO_DIRNAME) . '/' . pathinfo($outputPath, PATHINFO_FILENAME))
        );
        
        Log::info("Converting PDF with optimized settings: " . $command);
        
        $output = [];
        $returnCode = 0;
        exec($command . ' 2>&1', $output, $returnCode);
        
        if ($returnCode !== 0) {
            throw new \Exception("PDF conversion failed: " . implode("\n", $output));
        }
        
        $generatedFile = pathinfo($outputPath, PATHINFO_DIRNAME) . '/' . 
                        pathinfo($outputPath, PATHINFO_FILENAME) . '-1.jpg';
        
        if (file_exists($generatedFile)) {
            rename($generatedFile, $outputPath);
        } else {
            throw new \Exception("Generated file not found");
        }
    }

    /**
     * Extraction d'image avec preprocessing avancé et scoring
     */
    private function extractFromImageWithConfidence(string $imagePath): array
    {
        if (!file_exists($imagePath)) {
            throw new \Exception("Image file not found: {$imagePath}");
        }

        $imageInfo = getimagesize($imagePath);
        if ($imageInfo === false) {
            throw new \Exception("Impossible de lire l'image");
        }

        [$width, $height] = $imageInfo;
        
        // Multiple tentatives avec preprocessing différent
        $attempts = [
            'original' => $imagePath,
            'enhanced' => $this->preprocessImage($imagePath, 'enhanced'),
            'high_contrast' => $this->preprocessImage($imagePath, 'high_contrast'),
            'denoised' => $this->preprocessImage($imagePath, 'denoised'),
        ];

        $bestResult = null;
        $bestConfidence = 0;
        $allResults = [];

        foreach ($attempts as $method => $processedPath) {
            try {
                $result = $this->performOCRWithConfidence($processedPath, $method);
                $allResults[$method] = $result;
                
                if ($result['confidence'] > $bestConfidence) {
                    $bestConfidence = $result['confidence'];
                    $bestResult = $result;
                }
                
                // Nettoyer les fichiers temporaires (sauf l'original)
                if ($processedPath !== $imagePath && file_exists($processedPath)) {
                    unlink($processedPath);
                }
                
                // Si on a une très bonne confiance, on peut arrêter
                if ($result['confidence'] > 85) {
                    break;
                }
                
            } catch (\Exception $e) {
                Log::warning("OCR attempt failed for method {$method}: " . $e->getMessage());
                
                if ($processedPath !== $imagePath && file_exists($processedPath)) {
                    unlink($processedPath);
                }
                continue;
            }
        }

        if (!$bestResult) {
            throw new \Exception("Toutes les tentatives OCR ont échoué");
        }

        Log::info("Enhanced OCR completed", [
            'best_method' => $bestResult['method'],
            'best_confidence' => $bestConfidence,
            'text_length' => strlen($bestResult['text']),
            'attempts_tried' => count($allResults)
        ]);

        return [
            'text' => $bestResult['text'],
            'confidence' => $bestConfidence,
            'method_used' => $bestResult['method'],
            'all_attempts' => $allResults,
            'metadata' => [
                'image_dimensions' => [$width, $height],
                'file_size' => filesize($imagePath),
                'processing_time' => microtime(true) - ($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true))
            ]
        ];
    }

    /**
     * Preprocessing d'image selon différentes stratégies
     */
    private function preprocessImage(string $imagePath, string $method): string
    {
        if (!$this->config['enable_preprocessing']) {
            return $imagePath;
        }

        $tempDir = dirname($imagePath);
        $outputPath = $tempDir . "/preprocessed_{$method}_" . uniqid() . '.jpg';

        try {
            $image = $this->imageManager->read($imagePath);
            
            switch ($method) {
                case 'enhanced':
                    // Preprocessing standard optimisé
                    $image->greyscale()
                          ->sharpen(15)
                          ->contrast(20)
                          ->brightness(5);
                    break;
                    
                case 'high_contrast':
                    // Très haut contraste pour texte difficile
                    $image->greyscale()
                          ->contrast(40)
                          ->sharpen(25);
                    break;
                    
                case 'denoised':
                    // Réduction de bruit avec légère flou puis renforcement
                    $image->greyscale()
                          ->blur(1)
                          ->contrast(30)
                          ->sharpen(20);
                    break;
                    
                default:
                    // Méthode par défaut
                    $image->greyscale()
                          ->contrast(15)
                          ->sharpen(10);
            }

            // Redimensionner si nécessaire (optimal pour OCR: 300-400 DPI equivalent)
            $currentWidth = $image->width();
            $currentHeight = $image->height();
            
            if ($currentWidth > 4000 || $currentHeight > 4000) {
                $scale = min(4000 / $currentWidth, 4000 / $currentHeight);
                $newWidth = (int)($currentWidth * $scale);
                $newHeight = (int)($currentHeight * $scale);
                $image->resize($newWidth, $newHeight);
            } elseif ($currentWidth < 1500 && $currentHeight < 1500) {
                // Upscaler les petites images
                $scale = min(1500 / $currentWidth, 1500 / $currentHeight);
                $newWidth = (int)($currentWidth * $scale);
                $newHeight = (int)($currentHeight * $scale);
                $image->resize($newWidth, $newHeight);
            }

            $image->save($outputPath, 95); // Haute qualité JPEG
            
            Log::debug("Image preprocessed", [
                'method' => $method,
                'original_size' => [$currentWidth, $currentHeight],
                'processed_size' => [$image->width(), $image->height()],
                'output_path' => $outputPath
            ]);
            
            return $outputPath;
            
        } catch (\Exception $e) {
            Log::error("Image preprocessing failed for method {$method}: " . $e->getMessage());
            return $imagePath; // Fallback vers l'original
        }
    }

    /**
     * Effectue l'OCR avec calcul de confiance
     */
    private function performOCRWithConfidence(string $imagePath, string $method): array
    {
        $startTime = microtime(true);
        
        // Configuration Tesseract optimisée
        $ocrConfigs = [
            'default' => ['psm' => 3, 'oem' => 3],
            'alternative' => ['psm' => 1, 'oem' => 1],
            'fallback' => ['psm' => 6, 'oem' => 2],
        ];

        $bestResult = null;
        $bestConfidence = 0;

        foreach ($ocrConfigs as $configName => $config) {
            try {
                $ocr = new TesseractOCR($imagePath);
                $text = $ocr->lang('fra', 'eng')
                           ->psm($config['psm'])
                           ->oem($config['oem'])
                           ->run();

                if (empty(trim($text))) {
                    continue;
                }

                $cleanText = $this->cleanText($text);
                $confidence = $this->calculateConfidence($cleanText);
                
                if ($confidence > $bestConfidence) {
                    $bestConfidence = $confidence;
                    $bestResult = [
                        'text' => $cleanText,
                        'confidence' => $confidence,
                        'method' => $method,
                        'ocr_config' => $configName,
                        'processing_time' => microtime(true) - $startTime
                    ];
                }
                
                // Si on a une bonne confiance, on peut arrêter
                if ($confidence > 80) {
                    break;
                }
                
            } catch (\Exception $e) {
                Log::debug("OCR config {$configName} failed: " . $e->getMessage());
                continue;
            }
        }

        if (!$bestResult) {
            throw new \Exception("Aucune configuration OCR n'a produit de résultat");
        }

        return $bestResult;
    }

    /**
     * Calcule un score de confiance basé sur des heuristiques
     */
    private function calculateConfidence(string $text): float
    {
        if (empty($text)) {
            return 0;
        }

        $score = 50; // Base score
        $length = strlen($text);
        
        // Longueur du texte (plus de texte = généralement meilleur)
        if ($length > 100) $score += 10;
        if ($length > 500) $score += 10;
        if ($length > 1000) $score += 5;
        
        // Ratio de caractères alphabétiques
        $alphaCount = preg_match_all('/[a-zA-ZÀ-ÿ]/', $text);
        $alphaRatio = $alphaCount / $length;
        $score += $alphaRatio * 20;
        
        // Présence de mots français communs
        $frenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'que', 'est', 'pour', 'du', 'contrat', 'article', 'clause'];
        $frenchCount = 0;
        foreach ($frenchWords as $word) {
            if (stripos($text, $word) !== false) {
                $frenchCount++;
            }
        }
        $score += ($frenchCount / count($frenchWords)) * 15;
        
        // Pénalité pour trop de caractères spéciaux ou de fragments
        $specialCharRatio = preg_match_all('/[^a-zA-ZÀ-ÿ0-9\s\.,;:!?()\-]/', $text) / $length;
        if ($specialCharRatio > 0.3) {
            $score -= 20;
        }
        
        // Pénalité pour des mots trop courts (fragments OCR)
        $words = explode(' ', $text);
        $shortWords = array_filter($words, function($w) {
            return strlen(trim($w)) <= 2;
        });
        $shortWordRatio = count($shortWords) / count($words);
        if ($shortWordRatio > 0.4) {
            $score -= 15;
        }
        
        // Bonus pour structure de document (paragraphes, ponctuation)
        if (preg_match('/\n\s*\n/', $text)) $score += 5; // Paragraphes
        if (preg_match('/[.!?]+/', $text)) $score += 5; // Ponctuation de fin
        
        return max(0, min(100, $score));
    }

    /**
     * Nettoie le texte OCR avec préservation de la structure
     */
    private function cleanText(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }
        
        // Normaliser les espaces mais préserver les retours à la ligne
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = preg_replace('/\n\s*\n\s*\n+/', "\n\n", $text); // Max 2 retours à la ligne consécutifs
        
        // Supprimer les caractères non imprimables sauf espaces et retours à la ligne
        $text = preg_replace('/[^\p{L}\p{N}\s\-.,;:!?()\[\]€$%°\'""\/@]/u', '', $text);
        
        // Corriger les espaces autour de la ponctuation
        $text = preg_replace('/\s+([,;:!?])/', '$1', $text);
        $text = preg_replace('/([.!?])\s*([A-ZÀ-Ÿ])/', '$1 $2', $text);
        
        return trim($text);
    }

    /**
     * Vérifie la disponibilité des outils OCR
     */
    public function checkAvailability(): array
    {
        $status = [];
        
        // Vérifier Tesseract
        try {
            $version = shell_exec('tesseract --version 2>&1');
            $status['tesseract'] = [
                'available' => true,
                'version' => trim(explode("\n", $version)[0] ?? 'Version inconnue')
            ];
        } catch (\Exception $e) {
            $status['tesseract'] = ['available' => false, 'error' => $e->getMessage()];
        }
        
        // Vérifier pdftoppm
        try {
            $version = shell_exec('pdftoppm -h 2>&1');
            $status['pdftoppm'] = ['available' => !empty($version)];
        } catch (\Exception $e) {
            $status['pdftoppm'] = ['available' => false, 'error' => $e->getMessage()];
        }
        
        // Vérifier ImageMagick
        try {
            $version = shell_exec('convert -version 2>&1');
            $status['imagemagick'] = ['available' => !empty($version)];
        } catch (\Exception $e) {
            $status['imagemagick'] = ['available' => false, 'error' => $e->getMessage()];
        }
        
        return $status;
    }
} 