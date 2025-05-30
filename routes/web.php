<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\TodoController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Web\ContractController;
use Illuminate\Foundation\Application;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard', [
            'csrfToken' => csrf_token(),
        ]);
    })->name('dashboard');

    Route::get('todos', [TodoController::class, 'index'])->name('todos');

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
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
