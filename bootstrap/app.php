<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            \Spatie\Csp\AddCspHeaders::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Add session middleware to API routes for web session authentication
        $middleware->api(append: [
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
        ]);

        // Register custom middleware aliases
        $middleware->alias([
            'api.rate.limit' => \App\Http\Middleware\ApiRateLimiter::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Custom exception handling
        $exceptions->renderable(function (App\Exceptions\BusinessLogicException $e, $request) {
            if ($request->expectsJson()) {
                return $e->render($request);
            }
            
            return redirect()->back()
                ->withErrors(['error' => $e->getUserMessage()])
                ->withInput();
        });

        $exceptions->renderable(function (App\Exceptions\InsufficientCreditsException $e, $request) {
            return $e->render($request);
        });

        $exceptions->renderable(function (App\Exceptions\OrganizationAccessException $e, $request) {
            return $e->render($request);
        });

        // Handle service unavailable exceptions
        $exceptions->renderable(function (App\Services\CircuitBreakerOpenException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'service_unavailable',
                    'message' => 'Le service est temporairement indisponible. Veuillez réessayer dans quelques minutes.',
                    'retry_after' => 300
                ], 503);
            }
            
            return redirect()->back()
                ->withErrors(['error' => 'Service temporairement indisponible'])
                ->withInput();
        });

        // Enhanced error reporting
        $exceptions->reportable(function (Throwable $e) {
            // Log additional context for debugging
            $context = [
                'user_id' => auth()->id(),
                'org_id' => auth()->user()?->org_id,
                'url' => request()->url(),
                'method' => request()->method(),
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ];

            if ($e instanceof App\Exceptions\BusinessLogicException && $e->shouldReport()) {
                Log::error('Business Logic Exception', array_merge($context, [
                    'exception' => $e->getMessage(),
                    'business_context' => $e->getContext(),
                ]));
            }

            // Send critical errors to monitoring service
            if (app()->bound(App\Services\MonitoringService::class)) {
                app(App\Services\MonitoringService::class)->trackError($e, $context);
            }
        });
    })->create();
