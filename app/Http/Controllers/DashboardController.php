<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Alert;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        // Calculate dashboard statistics
        $stats = $this->getDashboardStats($orgId);
        
        // Get recent alerts (last 5)
        $recentAlerts = Alert::with('contract')
            ->whereHas('contract', function ($query) use ($orgId) {
                $query->where('org_id', $orgId);
            })
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Get contracts expiring in next 30 days
        $expiringContracts = Contract::where('org_id', $orgId)
            ->where('status', 'active')
            ->whereNotNull('next_renewal_date')
            ->whereBetween('next_renewal_date', [
                now(),
                now()->addDays(30)
            ])
            ->orderBy('next_renewal_date', 'asc')
            ->limit(10)
            ->get();

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'recent_alerts' => $recentAlerts,
            'expiring_contracts' => $expiringContracts,
        ]);
    }

    private function getDashboardStats($orgId)
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // Total contracts
        $totalContracts = Contract::where('org_id', $orgId)->count();

        // Active contracts
        $activeContracts = Contract::where('org_id', $orgId)
            ->where('status', 'active')
            ->count();

        // Contracts expiring this month
        $expiringThisMonth = Contract::where('org_id', $orgId)
            ->where('status', 'active')
            ->whereNotNull('next_renewal_date')
            ->whereBetween('next_renewal_date', [$startOfMonth, $endOfMonth])
            ->count();

        // Active alerts
        $activeAlerts = Alert::whereHas('contract', function ($query) use ($orgId) {
                $query->where('org_id', $orgId);
            })
            ->where('status', 'active')
            ->count();

        // Total value of active contracts
        $totalValue = Contract::where('org_id', $orgId)
            ->where('status', 'active')
            ->sum('amount');

        // Contracts processed today (OCR completed)
        $contractsProcessedToday = Contract::where('org_id', $orgId)
            ->where('ocr_status', 'completed')
            ->whereDate('updated_at', $now->toDateString())
            ->count();

        return [
            'total_contracts' => $totalContracts,
            'active_contracts' => $activeContracts,
            'expiring_this_month' => $expiringThisMonth,
            'active_alerts' => $activeAlerts,
            'total_value' => $totalValue,
            'contracts_processed_today' => $contractsProcessedToday,
        ];
    }

    public function testDiscord(Request $request)
    {
        $discordService = app(\App\Services\DiscordWebhookService::class);
        
        $success = $discordService->testWebhook();
        
        if ($success) {
            return response()->json([
                'message' => 'Test Discord envoyé avec succès !',
                'success' => true
            ]);
        }
        
        return response()->json([
            'message' => 'Erreur lors de l\'envoi du test Discord',
            'success' => false
        ], 400);
    }
}
