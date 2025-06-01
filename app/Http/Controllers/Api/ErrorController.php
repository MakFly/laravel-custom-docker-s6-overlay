<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ErrorController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Log client-side errors
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'error.message' => 'required|string',
            'error.stack' => 'nullable|string',
            'error.name' => 'nullable|string',
            'errorInfo.componentStack' => 'nullable|string',
            'url' => 'required|url',
            'userAgent' => 'required|string',
            'timestamp' => 'required|date',
        ]);

        $user = $request->user();
        
        // Log l'erreur avec contexte utilisateur
        Log::error('Client-side React Error', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'org_id' => $user->org_id,
            'error_message' => $validated['error']['message'],
            'error_stack' => $validated['error']['stack'] ?? null,
            'error_name' => $validated['error']['name'] ?? null,
            'component_stack' => $validated['errorInfo']['componentStack'] ?? null,
            'url' => $validated['url'],
            'user_agent' => $validated['userAgent'],
            'timestamp' => $validated['timestamp'],
            'ip_address' => $request->ip(),
            'session_id' => session()->getId(),
        ]);

        return response()->json([
            'message' => 'Error logged successfully',
            'logged_at' => now()->toISOString(),
        ]);
    }
} 