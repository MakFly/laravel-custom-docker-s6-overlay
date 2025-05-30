<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\OrgController;
use App\Http\Controllers\Api\DashboardController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Routes protégées par authentication (web session + sanctum pour API)
Route::middleware(['auth'])->group(function () {
    
    // Dashboard et statistiques
    Route::prefix('dashboard')->name('api.dashboard.')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/upcoming-renewals', [DashboardController::class, 'upcomingRenewals']);
        Route::get('/recent-activity', [DashboardController::class, 'recentActivity']);
    });

    // Gestion des contrats
    Route::prefix('contracts')->name('api.contracts.')->group(function () {
        Route::get('/', [ContractController::class, 'index'])->name('index');
        Route::post('/', [ContractController::class, 'store'])->name('store');
        Route::get('/stats', [ContractController::class, 'stats'])->name('stats');
        Route::get('/upcoming-renewals', [ContractController::class, 'upcomingRenewals'])->name('upcoming-renewals');
        
        Route::get('/{contract}', [ContractController::class, 'show'])->name('show');
        Route::put('/{contract}', [ContractController::class, 'update'])->name('update');
        Route::delete('/{contract}', [ContractController::class, 'destroy'])->name('destroy');
        
        // Actions spéciales
        Route::post('/{contract}/reprocess', [ContractController::class, 'reprocess'])->name('reprocess');
        Route::post('/{contract}/reanalyze', [ContractController::class, 'reanalyze'])->name('reanalyze');
        Route::get('/{contract}/download', [ContractController::class, 'download'])->name('download');
        Route::get('/{contract}/status', [ContractController::class, 'status'])->name('status');
        Route::get('/{contract}/ocr-text', [ContractController::class, 'getOcrText'])->name('ocr-text');
        Route::get('/{contract}/ocr-metadata', [ContractController::class, 'getOcrMetadata'])->name('ocr-metadata');
        Route::get('/{contract}/analysis', [ContractController::class, 'getAnalysis'])->name('analysis');
    });

    // Gestion des alertes
    Route::prefix('alerts')->name('api.alerts.')->group(function () {
        Route::get('/', [AlertController::class, 'index'])->name('index');
        Route::get('/stats', [AlertController::class, 'stats'])->name('stats');
        Route::get('/today', [AlertController::class, 'today'])->name('today');
        Route::get('/this-week', [AlertController::class, 'thisWeek'])->name('this-week');
        
        Route::get('/{alert}', [AlertController::class, 'show'])->name('show');
        Route::delete('/{alert}', [AlertController::class, 'destroy'])->name('destroy');
        
        // Actions sur les alertes
        Route::post('/{alert}/dismiss', [AlertController::class, 'dismiss'])->name('dismiss');
        Route::post('/{alert}/snooze', [AlertController::class, 'snooze'])->name('snooze');
    });

    // Gestion de l'organisation
    Route::prefix('org')->name('api.org.')->group(function () {
        Route::get('/', [OrgController::class, 'show'])->name('show');
        Route::put('/', [OrgController::class, 'update'])->name('update');
        Route::get('/users', [OrgController::class, 'users'])->name('users');
        Route::post('/users/invite', [OrgController::class, 'inviteUser'])->name('invite-user');
        Route::get('/settings', [OrgController::class, 'getSettings'])->name('settings');
        Route::put('/settings', [OrgController::class, 'updateSettings'])->name('update-settings');
    });

    // Abonnements (Stripe Cashier) - à implémenter plus tard
    Route::prefix('subscription')->name('api.subscription.')->group(function () {
        Route::get('/', function() {
            return response()->json(['message' => 'Subscription management coming soon']);
        })->name('current');
    });

    // Routes Sanctum pour l'API externe
    Route::middleware(['auth:sanctum'])->prefix('external')->group(function () {
        Route::get('/user', function (Request $request) {
            return $request->user();
        });
    });
}); 