<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimiter
{
    /**
     * Handle an incoming request with sophisticated rate limiting
     */
    public function handle(Request $request, Closure $next, string $limits = 'api'): Response
    {
        $limits = $this->resolveLimits($limits, $request);
        
        foreach ($limits as $limit) {
            $key = $this->resolveRequestSignature($request, $limit['name']);
            
            if (RateLimiter::tooManyAttempts($key, $limit['max_attempts'])) {
                $this->logRateLimitExceeded($request, $limit);
                
                return $this->buildRateLimitResponse(
                    $key, 
                    $limit['max_attempts'],
                    $limit['decay_minutes']
                );
            }
            
            RateLimiter::hit($key, $limit['decay_minutes'] * 60);
        }

        $response = $next($request);
        
        // Add rate limit headers to response
        return $this->addRateLimitHeaders($response, $limits[0], $request);
    }

    /**
     * Resolve rate limits based on endpoint and user type
     */
    private function resolveLimits(string $limitsName, Request $request): array
    {
        $user = $request->user();
        $isSubscribed = $user?->subscribed('default') ?? false;
        
        return match($limitsName) {
            'api' => [
                [
                    'name' => 'api_general',
                    'max_attempts' => $isSubscribed ? 300 : 100,
                    'decay_minutes' => 60
                ]
            ],
            'file_upload' => [
                [
                    'name' => 'file_upload_per_user',
                    'max_attempts' => $isSubscribed ? 20 : 5,
                    'decay_minutes' => 60
                ],
                [
                    'name' => 'file_upload_per_org',
                    'max_attempts' => $isSubscribed ? 100 : 25,
                    'decay_minutes' => 60
                ]
            ],
            'ai_analysis' => [
                [
                    'name' => 'ai_per_user',
                    'max_attempts' => $isSubscribed ? 50 : 10,
                    'decay_minutes' => 60
                ],
                [
                    'name' => 'ai_per_org',
                    'max_attempts' => $isSubscribed ? 200 : 50,
                    'decay_minutes' => 60
                ]
            ],
            'ocr_processing' => [
                [
                    'name' => 'ocr_per_user',
                    'max_attempts' => $isSubscribed ? 100 : 20,
                    'decay_minutes' => 60
                ]
            ],
            'auth' => [
                [
                    'name' => 'login_attempts',
                    'max_attempts' => 5,
                    'decay_minutes' => 15
                ]
            ],
            'sensitive' => [
                [
                    'name' => 'sensitive_per_ip',
                    'max_attempts' => 10,
                    'decay_minutes' => 60
                ]
            ],
            default => [
                [
                    'name' => 'default',
                    'max_attempts' => 60,
                    'decay_minutes' => 60
                ]
            ]
        };
    }

    /**
     * Resolve the rate limiting signature for the request
     */
    private function resolveRequestSignature(Request $request, string $limitName): string
    {
        $user = $request->user();
        
        return match($limitName) {
            'api_general' => 'api_general:' . ($user?->id ?? $request->ip()),
            'file_upload_per_user' => 'file_upload_user:' . ($user?->id ?? $request->ip()),
            'file_upload_per_org' => 'file_upload_org:' . ($user?->org_id ?? 'guest'),
            'ai_per_user' => 'ai_user:' . ($user?->id ?? $request->ip()),
            'ai_per_org' => 'ai_org:' . ($user?->org_id ?? 'guest'),
            'ocr_per_user' => 'ocr_user:' . ($user?->id ?? $request->ip()),
            'login_attempts' => 'login:' . $request->ip(),
            'sensitive_per_ip' => 'sensitive:' . $request->ip(),
            default => 'default:' . ($user?->id ?? $request->ip())
        };
    }

    /**
     * Build the rate limit exceeded response
     */
    private function buildRateLimitResponse(string $key, int $maxAttempts, int $decayMinutes): Response
    {
        $retryAfter = RateLimiter::availableIn($key);
        
        return response()->json([
            'error' => 'Rate limit exceeded',
            'message' => 'Too many requests. Please try again later.',
            'retry_after' => $retryAfter,
            'max_attempts' => $maxAttempts,
            'time_window' => $decayMinutes . ' minutes'
        ], 429, [
            'Retry-After' => $retryAfter,
            'X-RateLimit-Limit' => $maxAttempts,
            'X-RateLimit-Remaining' => 0,
            'X-RateLimit-Reset' => now()->addSeconds($retryAfter)->getTimestamp()
        ]);
    }

    /**
     * Add rate limit headers to successful responses
     */
    private function addRateLimitHeaders(Response $response, array $limit, Request $request): Response
    {
        $key = $this->resolveRequestSignature($request, $limit['name']);
        $remaining = $limit['max_attempts'] - RateLimiter::attempts($key);
        $retryAfter = RateLimiter::availableIn($key);
        
        $response->headers->add([
            'X-RateLimit-Limit' => $limit['max_attempts'],
            'X-RateLimit-Remaining' => max(0, $remaining),
            'X-RateLimit-Reset' => now()->addMinutes($limit['decay_minutes'])->getTimestamp()
        ]);
        
        return $response;
    }

    /**
     * Log rate limit exceeded events for monitoring
     */
    private function logRateLimitExceeded(Request $request, array $limit): void
    {
        Log::channel('security')->warning('Rate limit exceeded', [
            'ip' => $request->ip(),
            'user_id' => $request->user()?->id,
            'org_id' => $request->user()?->org_id,
            'endpoint' => $request->getPathInfo(),
            'method' => $request->getMethod(),
            'limit_name' => $limit['name'],
            'max_attempts' => $limit['max_attempts'],
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toISOString()
        ]);
    }
}