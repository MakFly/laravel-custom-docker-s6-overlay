<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContractResource;
use App\Http\Resources\AlertResource;
use App\Models\Contract;
use App\Models\Alert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Statistiques générales du dashboard
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;
        
        // Statistiques des contrats
        $contractStats = [
            'total' => Contract::where('org_id', $orgId)->count(),
            'active' => Contract::where('org_id', $orgId)->where('status', 'active')->count(),
            'professional' => Contract::where('org_id', $orgId)->where('type', 'pro')->count(),
            'personal' => Contract::where('org_id', $orgId)->where('type', 'perso')->count(),
            'with_tacit_renewal' => Contract::where('org_id', $orgId)->where('is_tacit_renewal', true)->count(),
            'expiring_soon' => Contract::where('org_id', $orgId)->expiringSoon(30)->count(),
            'expiring_this_week' => Contract::where('org_id', $orgId)->expiringSoon(7)->count(),
            'pending_ocr' => Contract::where('org_id', $orgId)->where('ocr_status', 'pending')->count(),
            'failed_ocr' => Contract::where('org_id', $orgId)->where('ocr_status', 'failed')->count(),
        ];

        // Montants
        $amounts = [
            'total_active' => Contract::where('org_id', $orgId)->where('status', 'active')->sum('amount_cents') / 100,
            'monthly_professional' => Contract::where('org_id', $orgId)->where('type', 'pro')
                ->where('status', 'active')
                ->sum('amount_cents') / 100,
            'monthly_personal' => Contract::where('org_id', $orgId)->where('type', 'perso')
                ->where('status', 'active')
                ->sum('amount_cents') / 100,
        ];

        // Statistiques des alertes
        $alertStats = [
            'total_pending' => Alert::whereHas('contract', function($q) use ($orgId) {
                $q->where('org_id', $orgId);
            })->where('status', 'pending')->count(),
            
            'due_today' => Alert::whereHas('contract', function($q) use ($orgId) {
                $q->where('org_id', $orgId);
            })->scheduledFor(today())->where('status', 'pending')->count(),
            
            'due_this_week' => Alert::whereHas('contract', function($q) use ($orgId) {
                $q->where('org_id', $orgId);
            })->whereBetween('scheduled_for', [now()->startOfWeek(), now()->endOfWeek()])
                ->where('status', 'pending')->count(),
            
            'renewal_warnings' => Alert::whereHas('contract', function($q) use ($orgId) {
                $q->where('org_id', $orgId);
            })->where('type', 'renewal_warning')->where('status', 'pending')->count(),
            
            'notice_deadlines' => Alert::whereHas('contract', function($q) use ($orgId) {
                $q->where('org_id', $orgId);
            })->where('type', 'notice_deadline')->where('status', 'pending')->count(),
        ];

        // Répartition par catégorie
        $categoryStats = Contract::select('category', DB::raw('count(*) as count'))
            ->where('org_id', $orgId)
            ->groupBy('category')
            ->orderBy('count', 'desc')
            ->get()
            ->pluck('count', 'category');

        return response()->json([
            'contracts' => $contractStats,
            'amounts' => $amounts,
            'alerts' => $alertStats,
            'categories' => $categoryStats,
            'organization' => [
                'name' => $user->org->name,
                'users_count' => $user->org->getUsersCount(),
                'subscription_plan' => $user->org->subscription_plan,
                'is_on_trial' => $user->org->isOnTrial(),
            ],
        ]);
    }

    /**
     * Contrats arrivant à échéance
     */
    public function upcomingRenewals(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;
        $days = $request->get('days', 90);
        $limit = $request->get('limit', 10);

        $contracts = Contract::where('org_id', $orgId)
            ->expiringSoon($days)
            ->with(['alerts' => function($query) {
                $query->where('status', 'pending')->orderBy('scheduled_for');
            }])
            ->orderBy('next_renewal_date')
            ->limit($limit)
            ->get();

        return ContractResource::collection($contracts);
    }

    /**
     * Activité récente
     */
    public function recentActivity(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;
        $limit = $request->get('limit', 20);

        $activities = collect();

        // Contrats récents
        $recentContracts = Contract::where('org_id', $orgId)
            ->with(['user:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($contract) {
                return [
                    'type' => 'contract_created',
                    'title' => "Nouveau contrat: {$contract->title}",
                    'description' => "Contrat {$contract->type} créé par {$contract->user->name}",
                    'timestamp' => $contract->created_at,
                    'meta' => [
                        'contract_id' => $contract->id,
                        'contract_type' => $contract->type,
                        'user_name' => $contract->user->name,
                    ],
                ];
            });

        // Alertes récentes
        $recentAlerts = Alert::whereHas('contract', function($q) use ($orgId) {
                $q->where('org_id', $orgId);
            })
            ->with(['contract:id,title,type'])
            ->where('status', 'sent')
            ->orderBy('sent_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($alert) {
                return [
                    'type' => 'alert_sent',
                    'title' => $alert->getTypeLabel(),
                    'description' => "Alerte envoyée pour {$alert->contract->title}",
                    'timestamp' => $alert->sent_at,
                    'meta' => [
                        'alert_id' => $alert->id,
                        'alert_type' => $alert->type,
                        'contract_id' => $alert->contract_id,
                        'contract_title' => $alert->contract->title,
                    ],
                ];
            });

        // OCR terminés récemment
        $recentOcrCompleted = Contract::where('org_id', $orgId)
            ->where('ocr_status', 'completed')
            ->where('updated_at', '>=', now()->subDays(7))
            ->with(['user:id,name'])
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($contract) {
                return [
                    'type' => 'ocr_completed',
                    'title' => "OCR terminé: {$contract->title}",
                    'description' => "Traitement OCR terminé avec succès",
                    'timestamp' => $contract->updated_at,
                    'meta' => [
                        'contract_id' => $contract->id,
                        'contract_title' => $contract->title,
                        'has_ai_analysis' => !empty($contract->ai_analysis),
                    ],
                ];
            });

        // Fusionner et trier par timestamp
        $activities = $activities
            ->concat($recentContracts)
            ->concat($recentAlerts)
            ->concat($recentOcrCompleted)
            ->sortByDesc('timestamp')
            ->take($limit)
            ->values();

        return response()->json([
            'activities' => $activities,
            'total' => $activities->count(),
        ]);
    }

    /**
     * Résumé de la semaine
     */
    public function weeklySummary(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();

        $summary = [
            'contracts_created' => Contract::where('org_id', $orgId)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])->count(),
            'alerts_sent' => Alert::whereHas('contract', function($q) use ($orgId) {
                $q->where('org_id', $orgId);
            })->whereBetween('sent_at', [$startOfWeek, $endOfWeek])->count(),
            'ocr_processed' => Contract::where('org_id', $orgId)
                ->where('ocr_status', 'completed')
                ->whereBetween('updated_at', [$startOfWeek, $endOfWeek])->count(),
            'upcoming_renewals' => Contract::where('org_id', $orgId)
                ->whereBetween('next_renewal_date', [
                    $endOfWeek, 
                    $endOfWeek->copy()->addDays(30)
                ])->count(),
        ];

        return response()->json($summary);
    }
}
