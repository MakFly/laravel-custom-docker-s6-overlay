<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Models\Contract;

class ErrorRecoveryService
{
    /**
     * Attempt to recover from failed OCR processing
     */
    public function recoverFailedOcr(Contract $contract): bool
    {
        Log::info("Attempting OCR recovery for contract {$contract->id}");

        try {
            // Reset OCR status
            $contract->update([
                'ocr_status' => 'pending',
                'ocr_raw_text' => null,
                'processing_mode' => 'enhanced', // Try enhanced mode
            ]);

            // Re-queue OCR job with different strategy
            \App\Jobs\ProcessEnhancedContractOCR::dispatch($contract)
                ->delay(now()->addMinutes(2)); // Delay to avoid immediate retry

            Log::info("OCR recovery initiated for contract {$contract->id}");
            return true;

        } catch (\Exception $e) {
            Log::error("OCR recovery failed for contract {$contract->id}", [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Attempt to recover from failed AI analysis
     */
    public function recoverFailedAiAnalysis(Contract $contract): bool
    {
        Log::info("Attempting AI analysis recovery for contract {$contract->id}");

        try {
            // Check if we have OCR text to work with
            if (empty($contract->ocr_raw_text)) {
                Log::warning("No OCR text available for AI recovery on contract {$contract->id}");
                return false;
            }

            // Check circuit breaker status
            $circuitBreaker = new CircuitBreakerService('openai');
            if (!$circuitBreaker->isAvailable()) {
                Log::info("AI service unavailable, scheduling retry for contract {$contract->id}");
                
                // Schedule retry when service is likely to be available
                \App\Jobs\AnalyzeContractWithAI::dispatch($contract)
                    ->delay(now()->addMinutes(10));
                
                return true;
            }

            // Reset AI status and retry
            $contract->update([
                'ai_status' => 'pending',
                'ai_analysis' => null,
            ]);

            // Re-queue AI analysis
            \App\Jobs\AnalyzeContractWithAI::dispatch($contract)
                ->delay(now()->addMinutes(1));

            Log::info("AI analysis recovery initiated for contract {$contract->id}");
            return true;

        } catch (\Exception $e) {
            Log::error("AI analysis recovery failed for contract {$contract->id}", [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Recover stuck contracts in processing state
     */
    public function recoverStuckContracts(): int
    {
        $recovered = 0;
        $cutoffTime = now()->subHours(2); // Consider stuck after 2 hours

        // Find contracts stuck in processing
        $stuckContracts = Contract::where(function ($query) use ($cutoffTime) {
            $query->where('ocr_status', 'processing')
                  ->where('updated_at', '<', $cutoffTime);
        })->orWhere(function ($query) use ($cutoffTime) {
            $query->where('ai_status', 'processing')
                  ->where('updated_at', '<', $cutoffTime);
        })->get();

        foreach ($stuckContracts as $contract) {
            Log::warning("Found stuck contract {$contract->id}", [
                'ocr_status' => $contract->ocr_status,
                'ai_status' => $contract->ai_status,
                'last_updated' => $contract->updated_at,
            ]);

            try {
                // Reset processing status
                $updates = [];
                
                if ($contract->ocr_status === 'processing') {
                    $updates['ocr_status'] = 'failed';
                    
                    // Attempt recovery
                    if ($this->recoverFailedOcr($contract)) {
                        $recovered++;
                    }
                }

                if ($contract->ai_status === 'processing') {
                    $updates['ai_status'] = 'failed';
                    
                    // Attempt recovery
                    if ($this->recoverFailedAiAnalysis($contract)) {
                        $recovered++;
                    }
                }

                if (!empty($updates)) {
                    $contract->update($updates);
                }

            } catch (\Exception $e) {
                Log::error("Failed to recover stuck contract {$contract->id}", [
                    'error' => $e->getMessage()
                ]);
            }
        }

        if ($recovered > 0) {
            Log::info("Recovered {$recovered} stuck contracts");
        }

        return $recovered;
    }

    /**
     * Cleanup failed jobs and retry important ones
     */
    public function cleanupFailedJobs(): int
    {
        $cleaned = 0;
        $retried = 0;

        try {
            // Get failed jobs from the last 24 hours
            $failedJobs = DB::table('failed_jobs')
                ->where('failed_at', '>', now()->subDay())
                ->get();

            foreach ($failedJobs as $failedJob) {
                $payload = json_decode($failedJob->payload, true);
                $jobClass = $payload['displayName'] ?? 'Unknown';

                // Retry critical jobs
                if ($this->shouldRetryJob($jobClass, $failedJob)) {
                    Log::info("Retrying failed job {$failedJob->id}: {$jobClass}");
                    
                    // Delete from failed jobs table and re-queue
                    DB::table('failed_jobs')->where('id', $failedJob->id)->delete();
                    
                    // Re-create and dispatch the job
                    $this->recreateJob($payload);
                    
                    $retried++;
                } elseif ($this->shouldCleanupJob($failedJob)) {
                    // Clean up old failed jobs
                    DB::table('failed_jobs')->where('id', $failedJob->id)->delete();
                    $cleaned++;
                }
            }

            Log::info("Job cleanup completed", [
                'cleaned' => $cleaned,
                'retried' => $retried
            ]);

        } catch (\Exception $e) {
            Log::error("Failed job cleanup failed", ['error' => $e->getMessage()]);
        }

        return $cleaned + $retried;
    }

    /**
     * Check database connectivity and repair if needed
     */
    public function checkAndRepairDatabase(): bool
    {
        try {
            // Test basic connectivity
            DB::connection()->getPdo();
            
            // Test a simple query
            DB::table('users')->count();
            
            Log::info("Database connectivity check passed");
            return true;

        } catch (\Exception $e) {
            Log::error("Database connectivity check failed", [
                'error' => $e->getMessage()
            ]);

            // Attempt to reconnect
            try {
                DB::purge();
                DB::reconnect();
                
                // Test again
                DB::table('users')->count();
                
                Log::info("Database reconnection successful");
                return true;
                
            } catch (\Exception $reconnectError) {
                Log::critical("Database reconnection failed", [
                    'error' => $reconnectError->getMessage()
                ]);
                return false;
            }
        }
    }

    /**
     * Recover orphaned files
     */
    public function recoverOrphanedFiles(): int
    {
        $recovered = 0;

        try {
            // Find contracts with missing files
            $contractsWithMissingFiles = Contract::whereNotNull('file_path')
                ->get()
                ->filter(function ($contract) {
                    return !\Storage::disk('private')->exists($contract->file_path);
                });

            foreach ($contractsWithMissingFiles as $contract) {
                Log::warning("Found contract with missing file", [
                    'contract_id' => $contract->id,
                    'file_path' => $contract->file_path
                ]);

                // Mark for re-upload or delete if too old
                if ($contract->created_at->lt(now()->subDays(7))) {
                    // Old contract, mark as file missing
                    $contract->update([
                        'status' => 'file_missing',
                        'ocr_status' => 'failed',
                        'ai_status' => 'failed'
                    ]);
                } else {
                    // Recent contract, might be recoverable
                    $contract->update(['status' => 'file_missing']);
                }

                $recovered++;
            }

            Log::info("Orphaned file recovery completed", ['recovered' => $recovered]);

        } catch (\Exception $e) {
            Log::error("Orphaned file recovery failed", ['error' => $e->getMessage()]);
        }

        return $recovered;
    }

    /**
     * Determine if a failed job should be retried
     */
    private function shouldRetryJob(string $jobClass, object $failedJob): bool
    {
        $criticalJobs = [
            'ProcessContractOCR',
            'ProcessEnhancedContractOCR',
            'AnalyzeContractWithAI',
            'CreateContractAlerts'
        ];

        // Only retry critical jobs that failed recently
        $isRecent = strtotime($failedJob->failed_at) > strtotime('-6 hours');
        $isCritical = collect($criticalJobs)->contains(fn($job) => str_contains($jobClass, $job));

        return $isRecent && $isCritical;
    }

    /**
     * Determine if a failed job should be cleaned up
     */
    private function shouldCleanupJob(object $failedJob): bool
    {
        // Clean up jobs older than 3 days
        return strtotime($failedJob->failed_at) < strtotime('-3 days');
    }

    /**
     * Recreate a job from failed job payload
     */
    private function recreateJob(array $payload): void
    {
        try {
            $command = unserialize($payload['data']['command']);
            
            // Dispatch with delay to avoid immediate re-failure
            dispatch($command)->delay(now()->addMinutes(5));
            
        } catch (\Exception $e) {
            Log::error("Failed to recreate job", [
                'error' => $e->getMessage(),
                'payload' => $payload
            ]);
        }
    }

    /**
     * Run comprehensive system recovery
     */
    public function runSystemRecovery(): array
    {
        Log::info("Starting comprehensive system recovery");

        $results = [
            'database_check' => $this->checkAndRepairDatabase(),
            'stuck_contracts' => $this->recoverStuckContracts(),
            'failed_jobs' => $this->cleanupFailedJobs(),
            'orphaned_files' => $this->recoverOrphanedFiles(),
        ];

        Log::info("System recovery completed", $results);

        return $results;
    }
}