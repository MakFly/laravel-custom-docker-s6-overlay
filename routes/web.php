<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\TodoController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Web\ContractController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AlertController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\HealthController;
use Illuminate\Foundation\Application;

Route::get('/', function () {
    return Inertia::render('Landing');
})->name('home');

Route::get('/pricing', function () {
    return Inertia::render('Pricing');
})->name('pricing');

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard with real stats
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/dashboard/test-discord', [DashboardController::class, 'testDiscord'])->name('dashboard.test-discord');

    Route::get('todos', [TodoController::class, 'index'])->name('todos');

    // Contracts routes
    Route::prefix('contracts')->name('contracts.')->group(function () {
        Route::get('/', [ContractController::class, 'index'])->name('index');
        Route::get('/create', [ContractController::class, 'create'])->name('create');
        Route::post('/', [ContractController::class, 'store'])->name('store');
        Route::get('/upload', [ContractController::class, 'upload'])->name('upload');
        Route::get('/{contract}', [ContractController::class, 'show'])->name('show');
        Route::get('/{contract}/edit', [ContractController::class, 'edit'])->name('edit');
        Route::put('/{contract}', [ContractController::class, 'update'])->name('update');
        Route::delete('/{contract}', [ContractController::class, 'destroy'])->name('destroy');
        Route::get('/{contract}/ocr', [ContractController::class, 'ocrResults'])->name('ocr');
        Route::get('/{contract}/analysis', [ContractController::class, 'analysis'])->name('analysis');
    });

    // Alerts management
    Route::prefix('alerts')->name('alerts.')->group(function () {
        Route::get('/', [AlertController::class, 'index'])->name('index');
        Route::post('/', [AlertController::class, 'store'])->name('store');
        Route::put('/{alert}', [AlertController::class, 'update'])->name('update');
        Route::delete('/{alert}', [AlertController::class, 'destroy'])->name('destroy');
        Route::post('/{alert}/test-discord', [AlertController::class, 'testDiscord'])->name('test-discord');
        Route::post('/{alert}/toggle-status', [AlertController::class, 'toggleStatus'])->name('toggle-status');
        Route::post('/monthly-report', [AlertController::class, 'sendMonthlyReport'])->name('monthly-report');
    });

    // Billing & Subscription management
    Route::prefix('billing')->name('billing.')->group(function () {
        Route::get('/', [BillingController::class, 'index'])->name('index');
        Route::post('/subscribe', [BillingController::class, 'subscribe'])->name('subscribe');
        Route::post('/cancel', [BillingController::class, 'cancel'])->name('cancel');
        Route::post('/resume', [BillingController::class, 'resume'])->name('resume');
        Route::get('/portal', [BillingController::class, 'portal'])->name('portal');
        Route::post('/update-payment-method', [BillingController::class, 'updatePaymentMethod'])->name('update-payment-method');
        Route::get('/invoices', [BillingController::class, 'invoices'])->name('invoices');
        Route::get('/invoice/{invoice}/download', [BillingController::class, 'downloadInvoice'])->name('invoice.download');
    });
});

// Stripe webhook (public route for Stripe to call)
Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');

// Health checks (public routes for monitoring)
Route::get('/health', [HealthController::class, 'check'])->name('health.check');
Route::get('/ping', [HealthController::class, 'ping'])->name('health.ping');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
