<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use App\Models\Contract;
use App\Models\AuditLog;

class MonitoringService
{
    /**
     * Track OCR processing metrics
     */
    public function trackOcrProcessing(string $contractId, float $processingTime, bool $success, ?string $error = null): void
    {
        $metrics = [
            'contract_id' => $contractId,
            'processing_time_ms' => round($processingTime * 1000, 2),
            'success' => $success,
            'error' => $error,
            'timestamp' => now()->toISOString(),
        ];

        // Store in cache for real-time monitoring
        $key = "ocr_metrics:" . date('Y-m-d-H');
        $existing = Cache::get($key, []);
        $existing[] = $metrics;
        Cache::put($key, $existing, 3600); // Store for 1 hour

        // Log for permanent storage
        Log::channel('ocr')->info('OCR Processing', $metrics);

        // Update daily stats
        $this->updateDailyStats('ocr_processing', $success ? 1 : 0, $success ? 0 : 1);
    }

    /**
     * Track AI analysis metrics
     */
    public function trackAiAnalysis(string $contractId, float $processingTime, bool $success, int $creditsUsed, ?string $error = null): void
    {
        $metrics = [
            'contract_id' => $contractId,
            'processing_time_ms' => round($processingTime * 1000, 2),
            'success' => $success,
            'credits_used' => $creditsUsed,
            'error' => $error,
            'timestamp' => now()->toISOString(),
        ];

        // Store in cache for real-time monitoring
        $key = "ai_metrics:" . date('Y-m-d-H');
        $existing = Cache::get($key, []);
        $existing[] = $metrics;
        Cache::put($key, $existing, 3600);

        // Log for permanent storage
        Log::channel('ai')->info('AI Analysis', $metrics);

        // Update daily stats
        $this->updateDailyStats('ai_analysis', $success ? 1 : 0, $success ? 0 : 1);
        $this->updateDailyStats('credits_used', $creditsUsed);
    }

    /**
     * Track user actions for analytics
     */
    public function trackUserAction(string $action, array $metadata = []): void
    {
        $data = array_merge([
            'user_id' => auth()->id(),
            'org_id' => auth()->user()?->org_id,
            'action' => $action,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'timestamp' => now()->toISOString(),
        ], $metadata);

        // Store in cache for real-time analytics
        $key = "user_actions:" . date('Y-m-d-H');
        $existing = Cache::get($key, []);
        $existing[] = $data;
        Cache::put($key, $existing, 3600);

        // Log for permanent storage
        Log::channel('analytics')->info('User Action', $data);
    }

    /**
     * Track system performance metrics
     */
    public function trackPerformanceMetric(string $operation, float $duration, array $metadata = []): void
    {
        $data = array_merge([
            'operation' => $operation,
            'duration_ms' => round($duration * 1000, 2),
            'timestamp' => now()->toISOString(),
        ], $metadata);

        // Store in cache for real-time monitoring
        $key = "performance:" . date('Y-m-d-H');
        $existing = Cache::get($key, []);
        $existing[] = $data;
        Cache::put($key, $existing, 3600);

        // Log slow operations
        if ($duration > 5.0) { // Operations taking longer than 5 seconds
            Log::warning('Slow Operation Detected', $data);
        }
    }

    /**
     * Track errors with context
     */
    public function trackError(\Throwable $exception, array $context = []): void
    {
        $errorData = [
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'user_id' => auth()->id(),
            'org_id' => auth()->user()?->org_id,
            'url' => request()->url(),
            'method' => request()->method(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'timestamp' => now()->toISOString(),
        ];

        $errorData = array_merge($errorData, $context);

        // Store in cache for real-time error tracking
        $key = "errors:" . date('Y-m-d-H');
        $existing = Cache::get($key, []);
        $existing[] = $errorData;
        Cache::put($key, $existing, 3600);

        // Log error
        Log::error('Application Error', $errorData);

        // Update error counters
        $this->updateDailyStats('errors', 1);

        // Send to external monitoring if configured
        $this->sendToExternalMonitoring($errorData);
    }

    /**
     * Get real-time metrics for monitoring dashboard
     */
    public function getRealTimeMetrics(): array
    {
        $currentHour = date('Y-m-d-H');
        
        return [
            'ocr_metrics' => Cache::get("ocr_metrics:$currentHour", []),
            'ai_metrics' => Cache::get("ai_metrics:$currentHour", []),
            'user_actions' => Cache::get("user_actions:$currentHour", []),
            'performance' => Cache::get("performance:$currentHour", []),
            'errors' => Cache::get("errors:$currentHour", []),
            'system_stats' => $this->getSystemStats(),
        ];
    }

    /**
     * Get daily statistics summary
     */
    public function getDailyStats(?string $date = null): array
    {
        $date = $date ?? now()->format('Y-m-d');
        
        return [
            'ocr_processing' => Cache::get("daily_stats:ocr_processing:$date", ['success' => 0, 'failed' => 0]),
            'ai_analysis' => Cache::get("daily_stats:ai_analysis:$date", ['success' => 0, 'failed' => 0]),
            'credits_used' => Cache::get("daily_stats:credits_used:$date", 0),
            'errors' => Cache::get("daily_stats:errors:$date", 0),
            'contracts_created' => Contract::whereDate('created_at', $date)->count(),
            'audit_events' => AuditLog::whereDate('created_at', $date)->count(),
        ];
    }

    /**
     * Get system performance statistics
     */
    public function getSystemStats(): array
    {
        return [
            'memory_usage' => [
                'current' => memory_get_usage(true),
                'peak' => memory_get_peak_usage(true),
                'limit' => $this->parseBytes(ini_get('memory_limit')),
            ],
            'database' => [
                'connections' => DB::getConnections(),
                'query_count' => $this->getQueryCount(),
            ],
            'queue' => [
                'pending' => Queue::size(),
                'failed' => Queue::size('failed'),
            ],
            'cache' => [
                'hits' => $this->getCacheHits(),
                'misses' => $this->getCacheMisses(),
            ],
        ];
    }

    /**
     * Generate monitoring report
     */
    public function generateReport(string $period = '24h'): array
    {
        $endTime = now();
        $startTime = match($period) {
            '1h' => $endTime->copy()->subHour(),
            '24h' => $endTime->copy()->subDay(),
            '7d' => $endTime->copy()->subWeek(),
            '30d' => $endTime->copy()->subMonth(),
            default => $endTime->copy()->subDay(),
        };

        return [
            'period' => $period,
            'start_time' => $startTime->toISOString(),
            'end_time' => $endTime->toISOString(),
            'metrics' => $this->getMetricsForPeriod($startTime, $endTime),
            'alerts' => $this->getAlertsForPeriod($startTime, $endTime),
            'performance' => $this->getPerformanceForPeriod($startTime, $endTime),
            'errors' => $this->getErrorsForPeriod($startTime, $endTime),
        ];
    }

    /**
     * Update daily statistics
     */
    private function updateDailyStats(string $metric, int $successValue = 0, int $failedValue = 0): void
    {
        $date = now()->format('Y-m-d');
        $key = "daily_stats:$metric:$date";

        if (in_array($metric, ['ocr_processing', 'ai_analysis'])) {
            $current = Cache::get($key, ['success' => 0, 'failed' => 0]);
            $current['success'] += $successValue;
            $current['failed'] += $failedValue;
            Cache::put($key, $current, 86400); // Store for 24 hours
        } else {
            $current = Cache::get($key, 0);
            $current += $successValue;
            Cache::put($key, $current, 86400);
        }
    }

    /**
     * Send critical errors to external monitoring
     */
    private function sendToExternalMonitoring(array $errorData): void
    {
        // This could integrate with Sentry, Bugsnag, etc.
        if (config('monitoring.external.enabled', false)) {
            // Implementation depends on chosen service
            Log::info('Sending error to external monitoring', $errorData);
        }
    }

    private function getQueryCount(): int
    {
        // This would need to be implemented based on your monitoring setup
        return DB::getQueryLog() ? count(DB::getQueryLog()) : 0;
    }

    private function getCacheHits(): int
    {
        // Implementation depends on cache driver and monitoring setup
        return 0;
    }

    private function getCacheMisses(): int
    {
        // Implementation depends on cache driver and monitoring setup
        return 0;
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

    private function getMetricsForPeriod($startTime, $endTime): array
    {
        // Implementation for retrieving historical metrics
        return [];
    }

    private function getAlertsForPeriod($startTime, $endTime): array
    {
        // Implementation for retrieving alerts in period
        return [];
    }

    private function getPerformanceForPeriod($startTime, $endTime): array
    {
        // Implementation for retrieving performance metrics
        return [];
    }

    private function getErrorsForPeriod($startTime, $endTime): array
    {
        // Implementation for retrieving errors in period
        return [];
    }
}