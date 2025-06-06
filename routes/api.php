<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\OrgController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ErrorController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Routes protégées par authentication (web session + sanctum pour API)
Route::middleware(['auth', 'api.rate.limit:api'])->group(function () {
    
    // Dashboard et statistiques
    Route::prefix('dashboard')->name('api.dashboard.')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/upcoming-renewals', [DashboardController::class, 'upcomingRenewals']);
        Route::get('/recent-activity', [DashboardController::class, 'recentActivity']);
    });

    // Gestion des contrats
    Route::prefix('contracts')->name('api.contracts.')->group(function () {
        Route::get('/', [ContractController::class, 'index'])->name('index');
        Route::post('/', [ContractController::class, 'store'])->middleware('api.rate.limit:file_upload')->name('store');
        Route::get('/stats', [ContractController::class, 'stats'])->name('stats');
        Route::get('/upcoming-renewals', [ContractController::class, 'upcomingRenewals'])->name('upcoming-renewals');
        
        Route::get('/{contract}', [ContractController::class, 'show'])->name('show');
        Route::put('/{contract}', [ContractController::class, 'update'])->name('update');
        Route::delete('/{contract}', [ContractController::class, 'destroy'])->name('destroy');
        
        // Actions spéciales
        Route::post('/{contract}/reprocess', [ContractController::class, 'reprocess'])->name('reprocess');
        Route::post('/{contract}/reanalyze', [ContractController::class, 'reanalyze'])->middleware('api.rate.limit:ai_analysis')->name('reanalyze');
        Route::post('/{contract}/force-reanalyze', [ContractController::class, 'forceReanalyze'])->middleware('api.rate.limit:ai_analysis')->name('force-reanalyze');
        Route::get('/{contract}/download', [ContractController::class, 'download'])->name('download');
        Route::get('/{contract}/view', [ContractController::class, 'view'])->name('view');
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

    // Gestion des crédits et abonnements
    Route::prefix('credits')->name('api.credits.')->group(function () {
        Route::get('/', [App\Http\Controllers\Api\CreditsController::class, 'index'])->name('index');
        Route::get('/history', [App\Http\Controllers\Api\CreditsController::class, 'history'])->name('history');
        Route::get('/check-ai', [App\Http\Controllers\Api\CreditsController::class, 'checkAiAvailability'])->name('check-ai');
        Route::post('/change-subscription', [App\Http\Controllers\Api\CreditsController::class, 'changeSubscription'])->name('change-subscription');
        Route::post('/purchase', [App\Http\Controllers\Api\CreditsController::class, 'purchaseCredits'])->name('purchase');
    });

    // Logging des erreurs client
    Route::post('/errors', [ErrorController::class, 'store'])->name('api.errors.store');

    // Routes Sanctum pour l'API externe
    Route::middleware(['auth:sanctum'])->prefix('external')->group(function () {
        Route::get('/user', function (Request $request) {
            return $request->user();
        });
    });
}); 