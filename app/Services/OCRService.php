<?php

namespace App\Services;

use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Spatie\PdfToImage\Pdf;
use Spatie\PdfToImage\Enums\OutputFormat;
use thiagoalessio\TesseractOCR\TesseractOCR;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Aws\S3\S3Client;

class OCRService
{
    protected ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver());
    }

    public function extractText(string $filePath): string
    {
        $disk = Storage::disk('private');
        
        Log::info("Starting OCR extraction for file", [
            'file_path' => $filePath,
            'disk' => 'private (S3/MinIO)',
            'file_exists' => $disk->exists($filePath)
        ]);

        // Vérifier que le fichier existe dans le stockage
        if (!$disk->exists($filePath)) {
            Log::error("File does not exist in storage: {$filePath}");
            throw new \Exception("Le fichier à analyser n'existe pas: {$filePath}");
        }

        // Télécharger le fichier temporairement pour l'OCR
        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        
        $fileName = basename($filePath);
        $tempPath = $tempDir . '/' . uniqid() . '_' . $fileName;
        
        try {
            // Télécharger le fichier depuis MinIO
            $fileContent = $disk->get($filePath);
            file_put_contents($tempPath, $fileContent);
            
            $extension = strtolower(pathinfo($tempPath, PATHINFO_EXTENSION));
            
            Log::info("File downloaded for OCR processing", [
                'temp_path' => $tempPath,
                'extension' => $extension,
                'size' => filesize($tempPath)
            ]);

            if ($extension === 'pdf') {
                $result = $this->extractFromPdf($tempPath);
            } else {
                $result = $this->extractFromImage($tempPath);
            }
            
            // Nettoyer le fichier temporaire
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            // Nettoyer en cas d'erreur
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            
            Log::error("OCR extraction failed: " . $e->getMessage());
            throw new \Exception("Erreur lors de l'extraction OCR: " . $e->getMessage());
        }
    }

    private function extractFromPdf(string $pdfPath): string
    {
        try {
            $tempDir = storage_path('app/temp');
            if (!is_dir($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $imagePath = $tempDir . "/pdf-" . uniqid() . '.jpg';
            
            Log::info("Converting PDF to image", ['path' => $pdfPath, 'output' => $imagePath]);
            
            // Essayer d'abord avec poppler-utils (pdftoppm) comme fallback
            try {
                $this->convertPdfWithPoppler($pdfPath, $imagePath);
            } catch (\Exception $e) {
                Log::warning("Poppler conversion failed, trying spatie/pdf-to-image: " . $e->getMessage());
                
                // Fallback vers spatie/pdf-to-image
                $pdf = new Pdf($pdfPath);
                $pdf->format(OutputFormat::Jpg)
                    ->quality(90)
                    ->resolution(300)
                    ->save($imagePath);
            }

            if (!file_exists($imagePath)) {
                throw new \Exception("Échec de la conversion PDF vers image");
            }

            // Extraire le texte de l'image
            $text = $this->extractFromImage($imagePath);

            // Nettoyer l'image temporaire
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }

            if (empty(trim($text))) {
                throw new \Exception("Aucun texte extrait du PDF");
            }

            Log::info("PDF OCR completed", ['text_length' => strlen($text)]);
            return trim($text);
            
        } catch (\Exception $e) {
            Log::error("PDF OCR extraction failed: " . $e->getMessage());
            throw new \Exception("Erreur lors de l'extraction OCR du PDF: " . $e->getMessage());
        }
    }

    /**
     * Convertir PDF en image avec poppler-utils (pdftoppm)
     * Alternative à ImageMagick qui peut avoir des restrictions de sécurité
     */
    private function convertPdfWithPoppler(string $pdfPath, string $outputPath): void
    {
        // Utiliser pdftoppm pour convertir la première page
        $command = sprintf(
            'pdftoppm -jpeg -r 300 -f 1 -l 1 %s %s',
            escapeshellarg($pdfPath),
            escapeshellarg(pathinfo($outputPath, PATHINFO_DIRNAME) . '/' . pathinfo($outputPath, PATHINFO_FILENAME))
        );
        
        Log::info("Running poppler command: " . $command);
        
        $output = [];
        $returnCode = 0;
        exec($command . ' 2>&1', $output, $returnCode);
        
        if ($returnCode !== 0) {
            throw new \Exception("pdftoppm failed with return code {$returnCode}: " . implode("\n", $output));
        }
        
        // pdftoppm génère un fichier avec le suffixe -1.jpg pour la première page
        $generatedFile = pathinfo($outputPath, PATHINFO_DIRNAME) . '/' . 
                        pathinfo($outputPath, PATHINFO_FILENAME) . '-1.jpg';
        
        if (file_exists($generatedFile)) {
            rename($generatedFile, $outputPath);
        } else {
            throw new \Exception("Generated file not found: {$generatedFile}");
        }
    }

    private function extractFromImage(string $imagePath): string
    {
        try {
            // Utiliser Tesseract directement sans preprocessing lourd pour éviter les problèmes de mémoire
            Log::info("Starting OCR extraction from image", ['path' => $imagePath, 'exists' => file_exists($imagePath)]);
            
            // Vérifier que le fichier image existe
            if (!file_exists($imagePath)) {
                throw new \Exception("Image file not found: {$imagePath}");
            }
            
            // Vérifier si l'image est lisible
            $imageInfo = getimagesize($imagePath);
            if ($imageInfo === false) {
                throw new \Exception("Impossible de lire les informations de l'image");
            }
            
            [$width, $height] = $imageInfo;
            Log::info("Image dimensions", ['width' => $width, 'height' => $height]);
            
            // Si l'image est très grande, la redimensionner avec une approche plus économe en mémoire
            $processedPath = $imagePath;
            if ($width > 3000 || $height > 3000) {
                Log::info("Image too large, resizing for better OCR performance");
                
                $tempDir = storage_path('app/temp');
                $resizedPath = $tempDir . '/resized-' . uniqid() . '.jpg';
                
                // Redimensionner avec une commande système plus économe en mémoire
                $scale = min(3000 / $width, 3000 / $height);
                $newWidth = (int)($width * $scale);
                $newHeight = (int)($height * $scale);
                
                $resizeCommand = sprintf(
                    'convert %s -resize %dx%d %s',
                    escapeshellarg($imagePath),
                    $newWidth,
                    $newHeight,
                    escapeshellarg($resizedPath)
                );
                
                exec($resizeCommand . ' 2>&1', $output, $returnCode);
                
                if ($returnCode === 0 && file_exists($resizedPath)) {
                    $processedPath = $resizedPath;
                    Log::info("Image resized successfully", ['new_path' => $resizedPath]);
                } else {
                    Log::warning("Image resize failed, using original", ['output' => implode("\n", $output)]);
                }
            }

            Log::info("Running Tesseract OCR", ['processed_path' => $processedPath]);

            // Extraction OCR avec Tesseract - configuration améliorée
            $ocr = new TesseractOCR($processedPath);
            $text = $ocr->lang('fra', 'eng')
                       ->psm(3) // Fully automatic page segmentation (better than 6 for documents)
                       ->oem(3) // Default OCR Engine Mode
                       ->run();

            Log::info("Tesseract OCR completed", [
                'text_length' => $text ? strlen($text) : 0,
                'is_empty' => empty($text),
                'first_100_chars' => $text ? substr($text, 0, 100) : 'NULL'
            ]);

            // Nettoyer le fichier temporaire redimensionné si créé
            if ($processedPath !== $imagePath && file_exists($processedPath)) {
                unlink($processedPath);
            }

            // Vérifier que du texte a été extrait
            if (empty($text) || trim($text) === '') {
                // Essayer avec des paramètres différents
                Log::warning("Empty OCR result, trying alternative settings");
                
                $ocr = new TesseractOCR($imagePath);
                $text = $ocr->lang('fra', 'eng')
                           ->psm(1) // Automatic page segmentation with OSD
                           ->oem(1) // Neural nets LSTM engine only
                           ->run();
                
                Log::info("Alternative OCR attempt", [
                    'text_length' => $text ? strlen($text) : 0,
                    'first_100_chars' => $text ? substr($text, 0, 100) : 'NULL'
                ]);
            }

            return $this->cleanText($text);

        } catch (\Exception $e) {
            Log::error("OCR extraction failed: " . $e->getMessage());
            throw new \Exception("Erreur lors de l'extraction OCR: " . $e->getMessage());
        }
    }

    private function cleanText(?string $text): string
    {
        // Gérer le cas où $text est null ou vide
        if ($text === null || $text === '') {
            return '';
        }
        
        // Nettoyer le texte OCR
        $text = preg_replace('/\s+/', ' ', $text); // Normaliser espaces
        $text = preg_replace('/[^\p{L}\p{N}\s\-.,;:!?()\[\]€$%]/u', '', $text);
        $text = str_replace(['  ', '   '], ' ', $text); // Réduire espaces multiples
        
        return trim($text);
    }

    /**
     * Vérifier si Tesseract est disponible
     */
    public function isAvailable(): bool
    {
        try {
            $ocr = new TesseractOCR();
            $ocr->image(storage_path('app/test-image.png'));
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get Tesseract version for testing
     */
    public function getVersion(): string
    {
        try {
            $output = shell_exec('tesseract --version 2>&1');
            $lines = explode("\n", $output);
            return trim($lines[0] ?? 'Version inconnue');
        } catch (\Exception $e) {
            return 'Tesseract non disponible';
        }
    }
} 