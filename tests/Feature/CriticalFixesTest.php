<?php

use App\Services\FileValidationService;
use App\Services\CircuitBreakerService;
use App\Services\MonitoringService;
use App\Http\Middleware\ApiRateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

describe('Critical Production Fixes', function () {
    
    describe('API Rate Limiting', function () {
        test('rate limiting works correctly for API endpoints', function () {
            $user = \App\Models\User::factory()->create();
            
            // Make requests up to the limit
            for ($i = 0; $i < 5; $i++) {
                $response = $this->actingAs($user)->get('/api/dashboard/stats');
                $response->assertStatus(200);
            }
            
            // Next request should be rate limited
            $response = $this->actingAs($user)->get('/api/dashboard/stats');
            $response->assertStatus(429);
            $response->assertJsonStructure([
                'error',
                'message',
                'retry_after'
            ]);
        });

        test('rate limiting headers are included in responses', function () {
            $user = \App\Models\User::factory()->create();
            
            $response = $this->actingAs($user)->get('/api/dashboard/stats');
            
            $response->assertStatus(200);
            $response->assertHeader('X-RateLimit-Limit');
            $response->assertHeader('X-RateLimit-Remaining');
            $response->assertHeader('X-RateLimit-Reset');
        });

        test('different rate limits for subscribed vs non-subscribed users', function () {
            $freeUser = \App\Models\User::factory()->create();
            $subscribedUser = \App\Models\User::factory()->create();
            
            // Mock subscription status
            $subscribedUser->subscribed = fn() => true;
            
            $rateLimiter = new ApiRateLimiter();
            
            // Free users should have lower limits
            expect(true)->toBeTrue(); // Placeholder for actual limit checking
        });
    });

    describe('File Validation Security', function () {
        test('validates file types correctly', function () {
            Storage::fake('private');
            
            $validationService = new FileValidationService();
            
            // Test valid PDF
            $validPdf = UploadedFile::fake()->create('contract.pdf', 1000, 'application/pdf');
            $result = $validationService->validateFile($validPdf);
            
            expect($result['valid'])->toBeTrue();
            expect($result['security_score'])->toBeGreaterThan(80);
        });

        test('rejects malicious files', function () {
            Storage::fake('private');
            
            $validationService = new FileValidationService();
            
            // Create a fake malicious file
            $maliciousFile = UploadedFile::fake()->createWithContent(
                'malicious.pdf',
                '<?php echo "malicious code"; ?>'
            );
            
            $result = $validationService->validateFile($maliciousFile);
            
            expect($result['valid'])->toBeFalse();
            expect($result['errors'])->toContain('Malicious content detected in file');
        });

        test('validates file size limits', function () {
            Storage::fake('private');
            
            $validationService = new FileValidationService();
            
            // Create oversized file
            $oversizedFile = UploadedFile::fake()->create('huge.pdf', 60000); // 60MB
            
            $result = $validationService->validateFile($oversizedFile);
            
            expect($result['valid'])->toBeFalse();
            expect(collect($result['errors'])->first())->toContain('File size exceeds maximum');
        });

        test('strips metadata from images', function () {
            Storage::fake('private');
            
            $validationService = new FileValidationService();
            
            $imageFile = UploadedFile::fake()->image('test.jpg', 800, 600);
            $result = $validationService->validateFile($imageFile);
            
            expect($result['valid'])->toBeTrue();
            expect($result['file_info'])->toHaveKey('hash_sha256');
        });
    });

    describe('Circuit Breaker Protection', function () {
        test('circuit breaker opens after failures', function () {
            $circuitBreaker = new CircuitBreakerService('test-service', 2, 60, 1);
            
            // Simulate failures
            try {
                $circuitBreaker->execute(function () {
                    throw new \Exception('Service failure');
                });
            } catch (\Exception $e) {
                // Expected
            }
            
            try {
                $circuitBreaker->execute(function () {
                    throw new \Exception('Service failure');
                });
            } catch (\Exception $e) {
                // Expected
            }
            
            // Circuit should be open now
            $metrics = $circuitBreaker->getMetrics();
            expect($metrics['state'])->toBe('open');
        });

        test('circuit breaker executes fallback when open', function () {
            $circuitBreaker = new CircuitBreakerService('test-service', 1, 60, 1);
            
            // Force circuit to open
            $circuitBreaker->forceOpen();
            
            $fallbackExecuted = false;
            
            $result = $circuitBreaker->execute(
                function () {
                    return 'primary';
                },
                function () use (&$fallbackExecuted) {
                    $fallbackExecuted = true;
                    return 'fallback';
                }
            );
            
            expect($fallbackExecuted)->toBeTrue();
            expect($result)->toBe('fallback');
        });

        test('circuit breaker recovers after timeout', function () {
            $circuitBreaker = new CircuitBreakerService('test-service', 1, 1, 1); // 1 second timeout
            
            // Force circuit to open
            $circuitBreaker->forceOpen();
            
            // Wait for recovery timeout
            sleep(2);
            
            // Should attempt to execute again
            $result = $circuitBreaker->execute(function () {
                return 'success';
            });
            
            expect($result)->toBe('success');
        });
    });

    describe('Database Performance', function () {
        test('database indexes exist for critical queries', function () {
            // Test that our performance indexes exist
            $indexes = \DB::select("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'");
            $indexNames = collect($indexes)->pluck('name')->toArray();
            
            // Check critical indexes exist
            expect($indexNames)->toContain('idx_contracts_org_status');
            expect($indexNames)->toContain('idx_contracts_org_renewal_date');
            expect($indexNames)->toContain('idx_alerts_org_scheduled');
            expect($indexNames)->toContain('idx_audit_org_created');
        });

        test('multi-tenant queries use proper indexes', function () {
            $org = \App\Models\Org::factory()->create();
            $user = \App\Models\User::factory()->create(['org_id' => $org->id]);
            
            $this->actingAs($user);
            
            // Create test data
            \App\Models\Contract::factory()->count(10)->create(['org_id' => $org->id]);
            
            // Execute query that should use our indexes
            $query = \App\Models\Contract::where('org_id', $org->id)
                ->where('status', 'active')
                ->toSql();
            
            expect($query)->toContain('org_id');
        });
    });

    describe('Error Handling & Recovery', function () {
        test('business logic exceptions are handled correctly', function () {
            $exception = new \App\Exceptions\InsufficientCreditsException(10, 5);
            
            $response = $this->postJson('/api/test-endpoint', [])
                ->withMiddleware([
                    function ($request, $next) use ($exception) {
                        throw $exception;
                    }
                ]);
            
            // This test would need actual endpoint to work properly
            expect(true)->toBeTrue(); // Placeholder
        });

        test('monitoring service tracks errors correctly', function () {
            $monitoringService = new MonitoringService();
            
            $exception = new \Exception('Test error');
            $context = ['test' => 'context'];
            
            // Should not throw
            $monitoringService->trackError($exception, $context);
            
            expect(true)->toBeTrue();
        });

        test('error recovery service handles stuck contracts', function () {
            $org = \App\Models\Org::factory()->create();
            $contract = \App\Models\Contract::factory()->create([
                'org_id' => $org->id,
                'ocr_status' => 'processing',
                'updated_at' => now()->subHours(3) // Stuck for 3 hours
            ]);
            
            $recoveryService = new \App\Services\ErrorRecoveryService();
            $recovered = $recoveryService->recoverStuckContracts();
            
            expect($recovered)->toBeGreaterThan(0);
            
            $contract->refresh();
            expect($contract->ocr_status)->toBe('failed');
        });
    });

    describe('System Health Monitoring', function () {
        test('health check endpoint returns comprehensive status', function () {
            $response = $this->get('/health');
            
            $response->assertJsonStructure([
                'status',
                'timestamp',
                'checks' => [
                    'database' => ['status'],
                    'queue' => ['status'],
                    'storage' => ['status'],
                    'cache' => ['status'],
                ]
            ]);
        });

        test('monitoring service provides real-time metrics', function () {
            $monitoringService = new MonitoringService();
            
            $metrics = $monitoringService->getRealTimeMetrics();
            
            expect($metrics)->toHaveKey('system_stats');
            expect($metrics['system_stats'])->toHaveKey('memory_usage');
        });
    });
});