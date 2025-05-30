<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\OCRService;
use App\Models\Contract;
use Illuminate\Support\Facades\Storage;

class TestOCR extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:ocr {contract_id}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test OCR on a specific contract';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $contractId = $this->argument('contract_id');
        $contract = Contract::find($contractId);
        
        if (!$contract) {
            $this->error("Contract {$contractId} not found");
            return 1;
        }
        
        $this->info("Testing OCR for contract: {$contract->title}");
        $this->info("File path: {$contract->file_path}");
        
        $disk = Storage::disk('private');
        if (!$disk->exists($contract->file_path)) {
            $this->error("File does not exist in storage");
            return 1;
        }
        
        $this->info("File exists in storage");
        
        // Test manual PDF conversion with poppler
        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        
        $fileName = basename($contract->file_path);
        $tempPath = $tempDir . '/' . uniqid() . '_' . $fileName;
        
        try {
            // Download file
            $this->info("Downloading file from MinIO...");
            $fileContent = $disk->get($contract->file_path);
            file_put_contents($tempPath, $fileContent);
            
            $this->info("File downloaded to: {$tempPath}");
            $this->info("File size: " . filesize($tempPath) . " bytes");
            
            // Test poppler conversion
            $imagePath = $tempDir . "/test-" . uniqid() . '.jpg';
            
            $command = sprintf(
                'pdftoppm -jpeg -r 300 -f 1 -l 1 %s %s',
                escapeshellarg($tempPath),
                escapeshellarg(pathinfo($imagePath, PATHINFO_DIRNAME) . '/' . pathinfo($imagePath, PATHINFO_FILENAME))
            );
            
            $this->info("Running: {$command}");
            
            $output = [];
            $returnCode = 0;
            exec($command . ' 2>&1', $output, $returnCode);
            
            $this->info("Return code: {$returnCode}");
            $this->info("Output: " . implode("\n", $output));
            
            // Check generated file
            $generatedFile = pathinfo($imagePath, PATHINFO_DIRNAME) . '/' . 
                            pathinfo($imagePath, PATHINFO_FILENAME) . '-1.jpg';
            
            if (file_exists($generatedFile)) {
                $this->info("✅ PDF converted successfully to: {$generatedFile}");
                $this->info("Image size: " . filesize($generatedFile) . " bytes");
                
                // Check the file type
                $fileType = mime_content_type($generatedFile);
                $this->info("File type: {$fileType}");
                
                // Check first few bytes to ensure it's actually a JPEG
                $handle = fopen($generatedFile, 'rb');
                $firstBytes = fread($handle, 10);
                fclose($handle);
                $this->info("First bytes (hex): " . bin2hex($firstBytes));
                
                // Test Tesseract OCR on the generated image
                try {
                    $this->info("Testing Tesseract OCR...");
                    
                    // Rename the generated file for easier access
                    rename($generatedFile, $imagePath);
                    
                    $ocr = new \thiagoalessio\TesseractOCR\TesseractOCR($imagePath);
                    $text = $ocr->lang('fra', 'eng')
                               ->psm(3)
                               ->oem(3)
                               ->run(); // Remove configFile to test
                    
                    $this->info("✅ OCR completed successfully!");
                    $this->info("Extracted text length: " . strlen($text) . " characters");
                    $this->info("First 200 chars: " . substr($text, 0, 200) . "...");
                    
                    // Cleanup
                    unlink($imagePath);
                    
                } catch (\Exception $e) {
                    $this->error("❌ OCR failed: " . $e->getMessage());
                    
                    // Cleanup on error
                    if (file_exists($imagePath)) {
                        unlink($imagePath);
                    }
                }
            } else {
                $this->error("❌ Generated file not found: {$generatedFile}");
            }
            
            // Cleanup temp file
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            
        } catch (\Exception $e) {
            $this->error("Error: " . $e->getMessage());
            
            // Cleanup
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        }
        
        return 0;
    }
}
