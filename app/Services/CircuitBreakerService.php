<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CircuitBreakerService
{
    private const STATE_CLOSED = 'closed';
    private const STATE_OPEN = 'open';
    private const STATE_HALF_OPEN = 'half_open';

    private string $serviceName;
    private int $failureThreshold;
    private int $recoveryTimeout;
    private int $successThreshold;

    public function __construct(
        string $serviceName,
        int $failureThreshold = 5,
        int $recoveryTimeout = 60,
        int $successThreshold = 3
    ) {
        $this->serviceName = $serviceName;
        $this->failureThreshold = $failureThreshold;
        $this->recoveryTimeout = $recoveryTimeout;
        $this->successThreshold = $successThreshold;
    }

    /**
     * Execute a callable with circuit breaker protection
     */
    public function execute(callable $callable, ?callable $fallback = null)
    {
        $state = $this->getState();

        if ($state === self::STATE_OPEN) {
            if ($this->shouldAttemptReset()) {
                $this->setState(self::STATE_HALF_OPEN);
                Log::info("Circuit breaker attempting reset for {$this->serviceName}");
            } else {
                return $this->handleOpenState($fallback);
            }
        }

        try {
            $result = $callable();
            $this->onSuccess();
            return $result;
        } catch (\Exception $e) {
            $this->onFailure($e);
            
            if ($fallback) {
                Log::info("Circuit breaker falling back for {$this->serviceName}", [
                    'error' => $e->getMessage()
                ]);
                return $fallback($e);
            }
            
            throw $e;
        }
    }

    /**
     * Handle success case
     */
    private function onSuccess(): void
    {
        $state = $this->getState();
        
        if ($state === self::STATE_HALF_OPEN) {
            $successes = $this->incrementSuccessCount();
            
            if ($successes >= $this->successThreshold) {
                $this->setState(self::STATE_CLOSED);
                $this->resetCounts();
                Log::info("Circuit breaker closed for {$this->serviceName} after successful recovery");
            }
        } elseif ($state === self::STATE_CLOSED) {
            $this->resetFailureCount();
        }
    }

    /**
     * Handle failure case
     */
    private function onFailure(\Exception $exception): void
    {
        $failures = $this->incrementFailureCount();
        
        Log::warning("Circuit breaker failure for {$this->serviceName}", [
            'failure_count' => $failures,
            'threshold' => $this->failureThreshold,
            'error' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine()
        ]);

        if ($failures >= $this->failureThreshold) {
            $this->setState(self::STATE_OPEN);
            $this->setLastFailureTime(now()->timestamp);
            Log::error("Circuit breaker opened for {$this->serviceName} - failure threshold exceeded");
        }
    }

    /**
     * Handle open state
     */
    private function handleOpenState(?callable $fallback)
    {
        $remainingTime = $this->getRemainingRecoveryTime();
        
        Log::info("Circuit breaker is open for {$this->serviceName}", [
            'remaining_recovery_time' => $remainingTime
        ]);

        if ($fallback) {
            return $fallback(new CircuitBreakerOpenException(
                "Circuit breaker is open for {$this->serviceName}. Retry in {$remainingTime} seconds."
            ));
        }

        throw new CircuitBreakerOpenException(
            "Circuit breaker is open for {$this->serviceName}. Service is temporarily unavailable."
        );
    }

    /**
     * Check if we should attempt to reset the circuit breaker
     */
    private function shouldAttemptReset(): bool
    {
        $lastFailureTime = $this->getLastFailureTime();
        $timeElapsed = now()->timestamp - $lastFailureTime;
        
        return $timeElapsed >= $this->recoveryTimeout;
    }

    /**
     * Get current circuit breaker state
     */
    private function getState(): string
    {
        return Cache::get($this->getStateKey(), self::STATE_CLOSED);
    }

    /**
     * Set circuit breaker state
     */
    private function setState(string $state): void
    {
        Cache::put($this->getStateKey(), $state, 3600); // 1 hour TTL
    }

    /**
     * Get failure count
     */
    private function getFailureCount(): int
    {
        return Cache::get($this->getFailureCountKey(), 0);
    }

    /**
     * Increment failure count
     */
    private function incrementFailureCount(): int
    {
        return Cache::increment($this->getFailureCountKey(), 1) ?: 1;
    }

    /**
     * Reset failure count
     */
    private function resetFailureCount(): void
    {
        Cache::forget($this->getFailureCountKey());
    }

    /**
     * Get success count
     */
    private function getSuccessCount(): int
    {
        return Cache::get($this->getSuccessCountKey(), 0);
    }

    /**
     * Increment success count
     */
    private function incrementSuccessCount(): int
    {
        return Cache::increment($this->getSuccessCountKey(), 1) ?: 1;
    }

    /**
     * Reset all counts
     */
    private function resetCounts(): void
    {
        Cache::forget($this->getFailureCountKey());
        Cache::forget($this->getSuccessCountKey());
        Cache::forget($this->getLastFailureTimeKey());
    }

    /**
     * Get last failure time
     */
    private function getLastFailureTime(): int
    {
        return Cache::get($this->getLastFailureTimeKey(), 0);
    }

    /**
     * Set last failure time
     */
    private function setLastFailureTime(int $timestamp): void
    {
        Cache::put($this->getLastFailureTimeKey(), $timestamp, 3600);
    }

    /**
     * Get remaining recovery time
     */
    private function getRemainingRecoveryTime(): int
    {
        $lastFailureTime = $this->getLastFailureTime();
        $timeElapsed = now()->timestamp - $lastFailureTime;
        return max(0, $this->recoveryTimeout - $timeElapsed);
    }

    /**
     * Get circuit breaker metrics
     */
    public function getMetrics(): array
    {
        return [
            'service_name' => $this->serviceName,
            'state' => $this->getState(),
            'failure_count' => $this->getFailureCount(),
            'success_count' => $this->getSuccessCount(),
            'failure_threshold' => $this->failureThreshold,
            'success_threshold' => $this->successThreshold,
            'recovery_timeout' => $this->recoveryTimeout,
            'last_failure_time' => $this->getLastFailureTime(),
            'remaining_recovery_time' => $this->getRemainingRecoveryTime(),
        ];
    }

    /**
     * Force reset the circuit breaker
     */
    public function forceReset(): void
    {
        $this->setState(self::STATE_CLOSED);
        $this->resetCounts();
        Log::info("Circuit breaker force reset for {$this->serviceName}");
    }

    /**
     * Force open the circuit breaker
     */
    public function forceOpen(): void
    {
        $this->setState(self::STATE_OPEN);
        $this->setLastFailureTime(now()->timestamp);
        Log::warning("Circuit breaker force opened for {$this->serviceName}");
    }

    /**
     * Check if circuit breaker is available
     */
    public function isAvailable(): bool
    {
        $state = $this->getState();
        
        if ($state === self::STATE_CLOSED || $state === self::STATE_HALF_OPEN) {
            return true;
        }
        
        return $this->shouldAttemptReset();
    }

    /**
     * Cache key generators
     */
    private function getStateKey(): string
    {
        return "circuit_breaker:state:{$this->serviceName}";
    }

    private function getFailureCountKey(): string
    {
        return "circuit_breaker:failures:{$this->serviceName}";
    }

    private function getSuccessCountKey(): string
    {
        return "circuit_breaker:successes:{$this->serviceName}";
    }

    private function getLastFailureTimeKey(): string
    {
        return "circuit_breaker:last_failure:{$this->serviceName}";
    }
}

/**
 * Exception thrown when circuit breaker is open
 */
class CircuitBreakerOpenException extends \Exception
{
    //
}