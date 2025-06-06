<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * Creates the application.
     *
     * @return \Illuminate\Foundation\Application
     */
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();
        
        // Configure test environment
        config([
            'app.url' => 'http://localhost:8000',
            'session.driver' => 'array',
            'cache.default' => 'array',
            'inertia.testing.ensure_pages_exist' => false,
            'app.debug' => false,
        ]);
        
        // Disable Inertia SSR for tests and use simple template
        config([
            'inertia.ssr.enabled' => false,
        ]);
        
        // Override Inertia root view for testing if Inertia is available
        if ($this->app->bound('inertia')) {
            $this->app['inertia']->setRootView('app-test');
        }
    }
}
