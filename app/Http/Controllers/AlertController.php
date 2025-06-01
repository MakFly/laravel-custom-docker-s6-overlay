<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Contract;
use App\Services\DiscordWebhookService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlertController extends Controller
{
    protected $discordService;

    public function __construct(DiscordWebhookService $discordService)
    {
        $this->discordService = $discordService;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        $alerts = Alert::with('contract')
            ->whereHas('contract', function ($query) use ($orgId) {
                $query->where('org_id', $orgId);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        // Statistics
        $stats = [
            'total_alerts' => Alert::whereHas('contract', function ($query) use ($orgId) {
                $query->where('org_id', $orgId);
            })->count(),
            'active_alerts' => Alert::whereHas('contract', function ($query) use ($orgId) {
                $query->where('org_id', $orgId);
            })->where('status', 'active')->count(),
            'sent_today' => Alert::whereHas('contract', function ($query) use ($orgId) {
                $query->where('org_id', $orgId);
            })->whereDate('last_sent_at', today())->count(),
        ];

        return Inertia::render('Alerts/Index', [
            'alerts' => $alerts,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'contract_id' => 'required|exists:contracts,id',
            'type' => 'required|in:renewal,expiry,custom',
            'trigger_days' => 'required|integer|min:1|max:365',
            'notification_channels' => 'required|array',
            'notification_channels.*' => 'in:email,discord,sms',
            'discord_webhook_url' => 'nullable|url',
        ]);

        $user = $request->user();
        $contract = Contract::where('id', $request->contract_id)
            ->where('org_id', $user->org_id)
            ->firstOrFail();

        $alert = Alert::create([
            'contract_id' => $contract->id,
            'type' => $request->type,
            'trigger_days' => $request->trigger_days,
            'status' => 'active',
            'notification_channels' => $request->notification_channels,
            'discord_webhook_url' => $request->discord_webhook_url,
        ]);

        return redirect()->back()->with('success', 'Alerte créée avec succès !');
    }

    public function update(Request $request, Alert $alert)
    {
        // Ensure alert belongs to user's org
        $alert->load('contract');
        if ($alert->contract->org_id !== $request->user()->org_id) {
            abort(403);
        }

        $request->validate([
            'status' => 'required|in:active,inactive',
            'notification_channels' => 'array',
            'notification_channels.*' => 'in:email,discord,sms',
            'discord_webhook_url' => 'nullable|url',
        ]);

        $alert->update([
            'status' => $request->status,
            'notification_channels' => $request->notification_channels ?? [],
            'discord_webhook_url' => $request->discord_webhook_url,
        ]);

        return redirect()->back()->with('success', 'Alerte mise à jour avec succès !');
    }

    public function destroy(Alert $alert, Request $request)
    {
        // Ensure alert belongs to user's org
        $alert->load('contract');
        if ($alert->contract->org_id !== $request->user()->org_id) {
            abort(403);
        }

        $alert->delete();

        return redirect()->back()->with('success', 'Alerte supprimée avec succès !');
    }

    public function testDiscord(Request $request, Alert $alert)
    {
        // Ensure alert belongs to user's org
        $alert->load('contract');
        if ($alert->contract->org_id !== $request->user()->org_id) {
            abort(403);
        }

        $success = $this->discordService->sendContractAlert($alert, $alert->contract);

        if ($success) {
            $alert->update(['last_sent_at' => now()]);
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

    public function sendMonthlyReport(Request $request)
    {
        $user = $request->user();
        $orgId = $user->org_id;

        // Get contracts expiring this month
        $expiringContracts = Contract::where('org_id', $orgId)
            ->where('status', 'active')
            ->whereNotNull('next_renewal_date')
            ->whereBetween('next_renewal_date', [
                now()->startOfMonth(),
                now()->endOfMonth()
            ])
            ->get()
            ->toArray();

        $success = $this->discordService->sendMonthlyExpiryReport($expiringContracts);

        if ($success) {
            return response()->json([
                'message' => 'Rapport mensuel envoyé avec succès !',
                'success' => true
            ]);
        }

        return response()->json([
            'message' => 'Erreur lors de l\'envoi du rapport mensuel',
            'success' => false
        ], 400);
    }

    public function toggleStatus(Request $request, Alert $alert)
    {
        // Ensure alert belongs to user's org
        $alert->load('contract');
        if ($alert->contract->org_id !== $request->user()->org_id) {
            abort(403);
        }

        $newStatus = $alert->status === 'active' ? 'inactive' : 'active';
        $alert->update(['status' => $newStatus]);

        return response()->json([
            'message' => 'Statut de l\'alerte mis à jour',
            'status' => $newStatus,
            'success' => true
        ]);
    }
}
