<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class HealthController extends Controller
{
    /**
     * Comprehensive health check endpoint for monitoring systems
     */
    public function check(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
            'cache' => $this->checkCache(),
            'ocr_service' => $this->checkOcrService(),
            'ai_service' => $this->checkAiService(),
            'horizon' => $this->checkHorizon(),
            'memory' => $this->checkMemory(),
            'disk_space' => $this->checkDiskSpace(),
        ];

        $overallStatus = $this->determineOverallStatus($checks);
        $timestamp = now()->toISOString();

        return response()->json([
            'status' => $overallStatus,
            'timestamp' => $timestamp,
            'version' => config('app.version', '1.0.0'),
            'environment' => config('app.env'),
            'checks' => $checks,
            'uptime' => $this->getUptime(),
        ], $overallStatus === 'healthy' ? 200 : 503);
    }

    /**
     * Lightweight ping endpoint for load balancers
     */
    public function ping(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
        ]);
    }

    private function checkDatabase(): array
    {
        try {
            $start = microtime(true);
            DB::connection()->getPdo();
            $responseTime = round((microtime(true) - $start) * 1000, 2);
            
            // Test a simple query
            $userCount = DB::table('users')->count();
            
            return [
                'status' => 'healthy',
                'response_time_ms' => $responseTime,
                'details' => [
                    'connection' => 'ok',
                    'user_count' => $userCount,
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkQueue(): array
    {
        try {
            $start = microtime(true);
            $queueSize = Queue::size();
            $responseTime = round((microtime(true) - $start) * 1000, 2);
            
            // Check different queue priorities
            $failedJobs = Queue::size('failed');
            
            $status = 'healthy';
            if ($queueSize > 1000) {
                $status = 'warning';
            }
            if ($queueSize > 5000 || $failedJobs > 50) {
                $status = 'unhealthy';
            }

            return [
                'status' => $status,
                'response_time_ms' => $responseTime,
                'details' => [
                    'pending_jobs' => $queueSize,
                    'failed_jobs' => $failedJobs,
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkStorage(): array
    {
        try {
            $start = microtime(true);
            
            // Test private disk (contracts storage)
            $testFile = 'health-check-' . time() . '.txt';
            Storage::disk('private')->put($testFile, 'health check');
            $exists = Storage::disk('private')->exists($testFile);
            Storage::disk('private')->delete($testFile);
            
            $responseTime = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $exists ? 'healthy' : 'unhealthy',
                'response_time_ms' => $responseTime,
                'details' => [
                    'private_disk' => $exists ? 'writable' : 'error',
                    'public_disk' => Storage::disk('public')->exists('logo.svg') ? 'accessible' : 'warning',
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkCache(): array
    {
        try {
            $start = microtime(true);
            $key = 'health-check-' . time();
            
            Cache::put($key, 'test', 60);
            $retrieved = Cache::get($key);
            Cache::forget($key);
            
            $responseTime = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $retrieved === 'test' ? 'healthy' : 'unhealthy',
                'response_time_ms' => $responseTime,
                'details' => [
                    'driver' => config('cache.default'),
                    'write_read' => $retrieved === 'test' ? 'ok' : 'failed',
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkOcrService(): array
    {
        try {
            $start = microtime(true);
            
            // Check if Tesseract is available
            $tesseractAvailable = false;
            if (function_exists('exec')) {
                exec('tesseract --version 2>&1', $output, $returnCode);
                $tesseractAvailable = $returnCode === 0;
            }
            
            $responseTime = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $tesseractAvailable ? 'healthy' : 'warning',
                'response_time_ms' => $responseTime,
                'details' => [
                    'tesseract' => $tesseractAvailable ? 'available' : 'not found',
                    'ocr_config' => config('ocr.enabled', false) ? 'enabled' : 'disabled',
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'warning',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkAiService(): array
    {
        try {
            $start = microtime(true);
            
            $apiKey = config('openai.api_key');
            $hasApiKey = !empty($apiKey);
            
            // Don't actually call OpenAI API in health check to avoid costs
            // Just verify configuration
            $responseTime = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $hasApiKey ? 'healthy' : 'warning',
                'response_time_ms' => $responseTime,
                'details' => [
                    'api_key_configured' => $hasApiKey ? 'yes' : 'no',
                    'ai_enabled' => config('openai.enabled', false) ? 'enabled' : 'disabled',
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'warning',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkHorizon(): array
    {
        try {
            $start = microtime(true);
            
            // Check if Horizon is accessible (basic check)
            $horizonEnabled = config('horizon.enabled', true);
            
            $responseTime = round((microtime(true) - $start) * 1000, 2);

            return [
                'status' => $horizonEnabled ? 'healthy' : 'warning',
                'response_time_ms' => $responseTime,
                'details' => [
                    'horizon_enabled' => $horizonEnabled ? 'yes' : 'no',
                    'workers' => 'check horizon dashboard',
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'warning',
                'error' => $e->getMessage(),
            ];
        }
    }

    private function checkMemory(): array
    {
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = $this->parseBytes(ini_get('memory_limit'));
        $memoryPercent = round(($memoryUsage / $memoryLimit) * 100, 2);
        
        $status = 'healthy';
        if ($memoryPercent > 80) {
            $status = 'warning';
        }
        if ($memoryPercent > 95) {
            $status = 'unhealthy';
        }

        return [
            'status' => $status,
            'details' => [
                'usage_bytes' => $memoryUsage,
                'usage_mb' => round($memoryUsage / 1024 / 1024, 2),
                'limit_mb' => round($memoryLimit / 1024 / 1024, 2),
                'usage_percent' => $memoryPercent,
            ]
        ];
    }

    private function checkDiskSpace(): array
    {
        $storagePath = storage_path();
        $freeBytes = disk_free_space($storagePath);
        $totalBytes = disk_total_space($storagePath);
        $usedPercent = round((($totalBytes - $freeBytes) / $totalBytes) * 100, 2);
        
        $status = 'healthy';
        if ($usedPercent > 80) {
            $status = 'warning';
        }
        if ($usedPercent > 95) {
            $status = 'unhealthy';
        }

        return [
            'status' => $status,
            'details' => [
                'free_gb' => round($freeBytes / 1024 / 1024 / 1024, 2),
                'total_gb' => round($totalBytes / 1024 / 1024 / 1024, 2),
                'used_percent' => $usedPercent,
            ]
        ];
    }

    private function determineOverallStatus(array $checks): string
    {
        $hasUnhealthy = collect($checks)->contains('status', 'unhealthy');
        $hasWarning = collect($checks)->contains('status', 'warning');
        
        if ($hasUnhealthy) {
            return 'unhealthy';
        }
        if ($hasWarning) {
            return 'warning';
        }
        
        return 'healthy';
    }

    private function getUptime(): string
    {
        if (function_exists('exec')) {
            exec('uptime -p 2>/dev/null', $output);
            return $output[0] ?? 'unknown';
        }
        
        return 'unknown';
    }

    private function parseBytes(string $size): int
    {
        $unit = preg_replace('/[^bkmgtpezy]/i', '', $size);
        $size = (int) preg_replace('/[^0-9\.]/', '', $size);
        
        if ($unit) {
            return round($size * pow(1024, stripos('bkmgtpezy', $unit[0])));
        }
        
        return round($size);
    }
}