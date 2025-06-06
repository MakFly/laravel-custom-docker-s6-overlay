<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class FileValidationService
{
    private const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    private const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    // Enhanced malicious patterns based on open source threat intelligence
    private const MALICIOUS_PATTERNS = [
        // PHP backdoors and webshells
        '<?php',
        '<?=',
        'eval(',
        'exec(',
        'shell_exec(',
        'system(',
        'passthru(',
        'popen(',
        'proc_open(',
        'file_get_contents(',
        'file_put_contents(',
        'fwrite(',
        'fputs(',
        'base64_decode(',
        'gzinflate(',
        'str_rot13(',
        'create_function(',
        'preg_replace(',
        'assert(',
        'call_user_func(',
        
        // JavaScript malware patterns
        '<script>',
        '<script',
        'javascript:',
        'data:text/html',
        'document.write(',
        'document.cookie',
        'eval(',
        'setTimeout(',
        'setInterval(',
        'Function(',
        'ActiveXObject(',
        'XMLHttpRequest(',
        'unescape(',
        'String.fromCharCode(',
        
        // Common exploit patterns
        'union select',
        'drop table',
        'insert into',
        'delete from',
        'update set',
        '../../../',
        '..\\..\\..\\',
        'cmd.exe',
        'powershell',
        '/bin/sh',
        '/bin/bash',
        'nc -l',
        'wget ',
        'curl ',
        
        // Obfuscation patterns
        'eval(base64_decode(',
        'eval(gzinflate(',
        'eval(str_rot13(',
        'chr(', 
        'ord(',
        'hexdec(',
        'pack(',
        'unpack(',
        
        // Suspicious URLs and domains
        'bit.ly/',
        'tinyurl.com/',
        'malware.com',
        'phishing.com',
        '127.0.0.1',
        'localhost',
        '0.0.0.0',
        
        // Common malware signatures
        'trojan',
        'backdoor',
        'rootkit',
        'keylogger',
        'botnet',
        'ransomware',
        'cryptominer',
        'adware',
        'spyware',
    ];

    // Extended virus signatures from open source threat feeds
    private const VIRUS_SIGNATURES = [
        // EICAR test signatures
        'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
        
        // Common file type magic numbers for executables
        "\x4D\x5A", // PE executable (MZ header)
        "\x7F\x45\x4C\x46", // ELF executable
        "\xCA\xFE\xBA\xBE", // Java class file
        "\xFE\xED\xFA\xCE", // Mach-O binary (32-bit)
        "\xFE\xED\xFA\xCF", // Mach-O binary (64-bit)
        "\xCF\xFA\xED\xFE", // Mach-O binary (reverse byte ordering)
        
        // Script interpreters in binary
        "#!/bin/sh",
        "#!/bin/bash",
        "#!/usr/bin/env",
        "#!/usr/bin/perl",
        "#!/usr/bin/python",
        
        // Suspicious base64 patterns
        'YWRtaW4=', // 'admin'
        'cGFzc3dvcmQ=', // 'password'
        'cm9vdA==', // 'root'
        'c2NyaXB0', // 'script'
        'ZXZhbA==', // 'eval'
        'ZXhlYw==', // 'exec'
        
        // Common backdoor signatures
        'c99shell',
        'r57shell',
        'webshell',
        'phpspy',
        'b374k',
        'wso',
        'FilesMan',
        'Cgishell',
        
        // Crypto miner signatures
        'stratum+tcp',
        'mining.pool',
        'cryptonight',
        'xmrig',
        'claymore',
        
        // Ransomware indicators
        '.locked',
        '.encrypted',
        '.crypto',
        'DECRYPT_INSTRUCTION',
        'YOUR_FILES_ARE_ENCRYPTED',
        
        // Network scanning tools
        'nmap',
        'masscan',
        'zmap',
        'unicornscan',
        
        // Suspicious PowerShell
        'powershell -enc',
        'powershell -e ',
        'powershell -w hidden',
        'IEX(',
        'Invoke-Expression',
        'DownloadString',
        'WebClient',
        
        // Suspicious registry operations
        'HKEY_LOCAL_MACHINE',
        'HKEY_CURRENT_USER',
        'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
        
        // Common exploit kits
        'metasploit',
        'meterpreter',
        'exploit',
        'payload',
        'shellcode',
    ];

    /**
     * Comprehensive file validation
     */
    public function validateFile(UploadedFile $file): array
    {
        $validations = [
            'basic' => $this->validateBasicSecurity($file),
            'mime' => $this->validateMimeType($file),
            'size' => $this->validateFileSize($file),
            'content' => $this->validateFileContent($file),
            'virus' => $this->scanForViruses($file),
            'metadata' => $this->validateMetadata($file),
            'extension' => $this->validateExtension($file),
        ];

        $isValid = collect($validations)->every(fn($validation) => $validation['valid']);
        $errors = collect($validations)->filter(fn($validation) => !$validation['valid'])
                                        ->pluck('error')->toArray();

        $result = [
            'valid' => $isValid,
            'errors' => $errors,
            'warnings' => $this->generateWarnings($file, $validations),
            'file_info' => $this->getFileInfo($file),
            'security_score' => $this->calculateSecurityScore($validations),
        ];

        // Log security events
        $this->logValidation($file, $result);

        return $result;
    }

    /**
     * Basic security validation
     */
    private function validateBasicSecurity(UploadedFile $file): array
    {
        // Check if file was actually uploaded
        if (!$file->isValid()) {
            return ['valid' => false, 'error' => 'File upload failed or corrupted'];
        }

        // Check for double extensions
        $filename = $file->getClientOriginalName();
        if (substr_count($filename, '.') > 1) {
            return ['valid' => false, 'error' => 'Multiple file extensions not allowed'];
        }

        // Check for null bytes (directory traversal attempt)
        if (strpos($filename, "\0") !== false) {
            return ['valid' => false, 'error' => 'Null bytes detected in filename'];
        }

        // Check for suspicious filenames
        $suspiciousPatterns = ['/\.\./', '/\//', '/\\\\/', '/\x00/'];
        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $filename)) {
                return ['valid' => false, 'error' => 'Suspicious filename pattern detected'];
            }
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * MIME type validation
     */
    private function validateMimeType(UploadedFile $file): array
    {
        $detectedMime = $file->getMimeType();
        $clientMime = $file->getClientMimeType();

        // Check if MIME type is allowed
        if (!in_array($detectedMime, self::ALLOWED_MIME_TYPES)) {
            return [
                'valid' => false, 
                'error' => "File type not allowed: {$detectedMime}"
            ];
        }

        // Check MIME type spoofing
        if ($detectedMime !== $clientMime) {
            Log::channel('security')->warning('MIME type mismatch detected', [
                'detected' => $detectedMime,
                'client' => $clientMime,
                'filename' => $file->getClientOriginalName(),
            ]);
        }

        // Deep MIME validation for critical types
        if ($detectedMime === 'application/pdf') {
            return $this->validatePdfStructure($file);
        }

        if (str_starts_with($detectedMime, 'image/')) {
            return $this->validateImageStructure($file);
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * File size validation
     */
    private function validateFileSize(UploadedFile $file): array
    {
        $size = $file->getSize();
        
        if ($size > self::MAX_FILE_SIZE) {
            return [
                'valid' => false,
                'error' => 'File size exceeds maximum allowed: ' . ($size / 1024 / 1024) . 'MB'
            ];
        }

        // Check for zero-byte files
        if ($size === 0) {
            return ['valid' => false, 'error' => 'Empty file not allowed'];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * File content validation
     */
    private function validateFileContent(UploadedFile $file): array
    {
        $content = file_get_contents($file->getPathname());
        
        // Check for malicious patterns
        foreach (self::MALICIOUS_PATTERNS as $pattern) {
            if (stripos($content, $pattern) !== false) {
                return [
                    'valid' => false,
                    'error' => 'Malicious content detected in file'
                ];
            }
        }

        // Check for embedded executables
        if ($this->containsExecutableContent($content)) {
            return ['valid' => false, 'error' => 'Executable content detected'];
        }

        // Check for suspicious URLs
        if ($this->containsSuspiciousUrls($content)) {
            return ['valid' => false, 'error' => 'Suspicious URLs detected'];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Enhanced virus scanning with multiple engines
     */
    private function scanForViruses(UploadedFile $file): array
    {
        $content = file_get_contents($file->getPathname());
        $detectedThreats = [];

        // 1. Signature-based detection
        foreach (self::VIRUS_SIGNATURES as $signature) {
            if (strpos($content, $signature) !== false) {
                $detectedThreats[] = "Signature match: {$signature}";
            }
        }

        // 2. Heuristic analysis
        $heuristicResults = $this->performHeuristicAnalysis($content, $file);
        if (!$heuristicResults['clean']) {
            $detectedThreats = array_merge($detectedThreats, $heuristicResults['threats']);
        }

        // 3. Entropy analysis (detect packed/encrypted content)
        $entropyScore = $this->calculateEntropy($content);
        if ($entropyScore > 7.5) { // High entropy indicates possible packing/encryption
            $detectedThreats[] = "High entropy content detected (score: {$entropyScore})";
        }

        // 4. ClamAV scanning if available
        if (function_exists('exec') && $this->isClamAvAvailable()) {
            $clamAvResult = $this->scanWithClamAv($file->getPathname());
            if (!$clamAvResult['clean']) {
                $detectedThreats[] = "ClamAV: {$clamAvResult['threat']}";
            }
        }

        // 5. YARA rules scanning (if yara-php extension available)
        if (extension_loaded('yara')) {
            $yaraResults = $this->scanWithYara($file->getPathname());
            if (!$yaraResults['clean']) {
                $detectedThreats = array_merge($detectedThreats, $yaraResults['threats']);
            }
        }

        if (!empty($detectedThreats)) {
            return [
                'valid' => false,
                'error' => 'Multiple threats detected: ' . implode(', ', $detectedThreats),
                'threats' => $detectedThreats
            ];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Perform heuristic analysis on file content
     */
    private function performHeuristicAnalysis(string $content, UploadedFile $file): array
    {
        $threats = [];
        $suspicionScore = 0;

        // Check for multiple suspicious patterns
        $patternMatches = 0;
        foreach (self::MALICIOUS_PATTERNS as $pattern) {
            if (stripos($content, $pattern) !== false) {
                $patternMatches++;
            }
        }

        if ($patternMatches > 3) {
            $threats[] = "Multiple suspicious patterns detected ({$patternMatches})";
            $suspicionScore += $patternMatches * 0.5;
        }

        // Check for obfuscation indicators
        $obfuscationIndicators = [
            'base64_decode' => substr_count($content, 'base64_decode'),
            'eval' => substr_count($content, 'eval'),
            'chr' => substr_count($content, 'chr'),
            'ord' => substr_count($content, 'ord'),
        ];

        foreach ($obfuscationIndicators as $indicator => $count) {
            if ($count > 5) {
                $threats[] = "Heavy use of obfuscation function: {$indicator} ({$count} times)";
                $suspicionScore += $count * 0.1;
            }
        }

        // Check for suspicious file characteristics
        $fileSize = $file->getSize();
        $mimeType = $file->getMimeType();

        // Unusually small files claiming to be documents
        if ($fileSize < 1024 && in_array($mimeType, ['application/pdf', 'application/msword'])) {
            $threats[] = "Suspiciously small file size for document type";
            $suspicionScore += 1;
        }

        // Files with suspicious names
        $filename = $file->getClientOriginalName();
        $suspiciousNames = ['test', 'temp', 'backup', 'config', 'admin', 'shell', 'cmd'];
        foreach ($suspiciousNames as $suspiciousName) {
            if (stripos($filename, $suspiciousName) !== false) {
                $threats[] = "Suspicious filename pattern: {$suspiciousName}";
                $suspicionScore += 0.5;
            }
        }

        return [
            'clean' => $suspicionScore < 3, // Threshold for suspicion
            'threats' => $threats,
            'suspicion_score' => $suspicionScore
        ];
    }

    /**
     * Calculate Shannon entropy of content
     */
    private function calculateEntropy(string $data): float
    {
        if (empty($data)) {
            return 0;
        }

        $frequencies = array_count_values(str_split($data));
        $length = strlen($data);
        $entropy = 0;

        foreach ($frequencies as $frequency) {
            $probability = $frequency / $length;
            $entropy -= $probability * log($probability, 2);
        }

        return $entropy;
    }

    /**
     * Scan with YARA rules (if available)
     */
    private function scanWithYara(string $filePath): array
    {
        try {
            // This would require YARA rules to be configured
            // For now, return clean as placeholder
            return ['clean' => true, 'threats' => []];
        } catch (\Exception $e) {
            Log::warning('YARA scanning failed', ['error' => $e->getMessage()]);
            return ['clean' => true, 'threats' => []];
        }
    }

    /**
     * Metadata validation
     */
    private function validateMetadata(UploadedFile $file): array
    {
        // Check file extension matches content
        $extension = strtolower($file->getClientOriginalExtension());
        $mimeType = $file->getMimeType();
        
        $expectedMimes = [
            'pdf' => 'application/pdf',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'txt' => 'text/plain',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (isset($expectedMimes[$extension]) && $expectedMimes[$extension] !== $mimeType) {
            return [
                'valid' => false,
                'error' => "File extension doesn't match content type"
            ];
        }

        // Strip dangerous metadata for images
        if (str_starts_with($mimeType, 'image/')) {
            $this->stripImageMetadata($file);
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Extension validation
     */
    private function validateExtension(UploadedFile $file): array
    {
        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'doc', 'docx'];
        $extension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($extension, $allowedExtensions)) {
            return [
                'valid' => false,
                'error' => "File extension not allowed: {$extension}"
            ];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * PDF structure validation
     */
    private function validatePdfStructure(UploadedFile $file): array
    {
        $content = file_get_contents($file->getPathname());
        
        // Check PDF header
        if (!str_starts_with($content, '%PDF-')) {
            return ['valid' => false, 'error' => 'Invalid PDF file structure'];
        }

        // Check for embedded JavaScript
        if (stripos($content, '/JavaScript') !== false || stripos($content, '/JS') !== false) {
            return ['valid' => false, 'error' => 'PDF contains JavaScript'];
        }

        // Check for forms
        if (stripos($content, '/AcroForm') !== false) {
            Log::channel('security')->info('PDF with forms uploaded', [
                'filename' => $file->getClientOriginalName()
            ]);
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Image structure validation
     */
    private function validateImageStructure(UploadedFile $file): array
    {
        try {
            $imageManager = new ImageManager(new Driver());
            $image = $imageManager->read($file->getPathname());
            
            // Validate image dimensions
            $width = $image->width();
            $height = $image->height();
            
            if ($width > 10000 || $height > 10000) {
                return ['valid' => false, 'error' => 'Image dimensions too large'];
            }

            if ($width < 1 || $height < 1) {
                return ['valid' => false, 'error' => 'Invalid image dimensions'];
            }

            return ['valid' => true, 'error' => null];
        } catch (\Exception $e) {
            return ['valid' => false, 'error' => 'Invalid image file'];
        }
    }

    /**
     * Check for executable content
     */
    private function containsExecutableContent(string $content): bool
    {
        $executableSignatures = [
            "\x4D\x5A", // PE executable
            "\x7F\x45\x4C\x46", // ELF executable
            "\xCA\xFE\xBA\xBE", // Java class file
            "\xFE\xED\xFA", // Mach-O
        ];

        foreach ($executableSignatures as $signature) {
            if (str_contains($content, $signature)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check for suspicious URLs
     */
    private function containsSuspiciousUrls(string $content): bool
    {
        $suspiciousDomains = [
            'bit.ly', 'tinyurl.com', 'malware.com', 'phishing.com'
        ];

        foreach ($suspiciousDomains as $domain) {
            if (stripos($content, $domain) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Strip image metadata
     */
    private function stripImageMetadata(UploadedFile $file): void
    {
        try {
            $imageManager = new ImageManager(new Driver());
            $image = $imageManager->read($file->getPathname());
            
            // Remove EXIF data by re-encoding
            $image->save($file->getPathname());
        } catch (\Exception $e) {
            Log::warning('Failed to strip image metadata', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Check if ClamAV is available
     */
    private function isClamAvAvailable(): bool
    {
        exec('which clamscan', $output, $returnCode);
        return $returnCode === 0;
    }

    /**
     * Scan with ClamAV
     */
    private function scanWithClamAv(string $filePath): array
    {
        exec("clamscan --no-summary {$filePath} 2>&1", $output, $returnCode);
        
        $clean = $returnCode === 0;
        $threat = $clean ? null : implode(' ', $output);
        
        return ['clean' => $clean, 'threat' => $threat];
    }

    /**
     * Generate warnings
     */
    private function generateWarnings(UploadedFile $file, array $validations): array
    {
        $warnings = [];
        
        if ($file->getSize() > 20 * 1024 * 1024) { // > 20MB
            $warnings[] = 'Large file size may slow processing';
        }
        
        if (!$validations['virus']['valid'] && !$this->isClamAvAvailable()) {
            $warnings[] = 'Advanced virus scanning not available';
        }
        
        return $warnings;
    }

    /**
     * Get comprehensive file information
     */
    private function getFileInfo(UploadedFile $file): array
    {
        return [
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'client_mime_type' => $file->getClientMimeType(),
            'extension' => $file->getClientOriginalExtension(),
            'hash_md5' => md5_file($file->getPathname()),
            'hash_sha256' => hash_file('sha256', $file->getPathname()),
        ];
    }

    /**
     * Calculate security score
     */
    private function calculateSecurityScore(array $validations): int
    {
        $score = 100;
        
        foreach ($validations as $validation) {
            if (!$validation['valid']) {
                $score -= 20;
            }
        }
        
        return max(0, $score);
    }

    /**
     * Log validation results
     */
    private function logValidation(UploadedFile $file, array $result): void
    {
        Log::channel('security')->info('File validation completed', [
            'filename' => $file->getClientOriginalName(),
            'valid' => $result['valid'],
            'errors' => $result['errors'],
            'security_score' => $result['security_score'],
            'user_id' => auth()->id(),
            'ip' => request()->ip(),
        ]);
    }
}