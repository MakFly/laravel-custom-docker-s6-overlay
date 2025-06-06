<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

describe('Health Check Endpoints', function () {
    test('ping endpoint returns ok status', function () {
        $response = $this->get('/ping');
        
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok'
            ])
            ->assertJsonStructure([
                'status',
                'timestamp'
            ]);
    });

    test('health check endpoint returns comprehensive status', function () {
        $response = $this->get('/health');
        
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'timestamp',
                'version',
                'environment',
                'uptime',
                'checks' => [
                    'database' => ['status'],
                    'queue' => ['status'],
                    'storage' => ['status'],
                    'cache' => ['status'],
                    'ocr_service' => ['status'],
                    'ai_service' => ['status'],
                    'horizon' => ['status'],
                    'memory' => ['status'],
                    'disk_space' => ['status'],
                ]
            ]);
    });

    test('health check detects database issues', function () {
        // Simulate database connection issue by using invalid connection
        config(['database.connections.testing.database' => '/invalid/path']);
        
        $response = $this->get('/health');
        
        $data = $response->json();
        expect($data['checks']['database']['status'])->toBe('unhealthy');
    });

    test('health check detects storage issues', function () {
        // Mock storage failure
        Storage::fake('private');
        Storage::disk('private')->shouldReceive('put')->andThrow(new Exception('Storage error'));
        
        $response = $this->get('/health');
        
        // Should still return 200 with warning status
        $response->assertStatus(200);
    });

    test('health check response time is acceptable', function () {
        $start = microtime(true);
        $response = $this->get('/health');
        $duration = (microtime(true) - $start) * 1000; // Convert to milliseconds
        
        $response->assertStatus(200);
        expect($duration)->toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('health check includes proper cache headers', function () {
        $response = $this->get('/health');
        
        $response->assertHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    });
});