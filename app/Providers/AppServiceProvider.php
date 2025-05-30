<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Configuration Horizon
        Horizon::auth(function ($request) {
            // En dev, accès libre
            if (app()->environment('local')) {
                return true;
            }
            
            // En production, seuls les admins
            return $request->user() && $request->user()->role === 'admin';
        });
    }
}
