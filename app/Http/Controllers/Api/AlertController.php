<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlertResource;
use App\Models\Alert;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Liste des alertes de l'utilisateur
     */
    public function index(Request $request)
    {
        $query = Alert::whereHas('contract', function($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->with(['contract:id,title,type,next_renewal_date'])
            ->orderBy('scheduled_for');

        // Filtres
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('due')) {
            $query->due();
        }

        $alerts = $query->paginate($request->get('per_page', 15));

        return AlertResource::collection($alerts);
    }

    /**
     * Afficher une alerte spécifique
     */
    public function show(Alert $alert)
    {
        $this->authorize('view', $alert);
        
        return new AlertResource($alert->load('contract'));
    }

    /**
     * Marquer une alerte comme lue/envoyée
     */
    public function dismiss(Alert $alert)
    {
        $this->authorize('update', $alert);

        $alert->markAsSent();

        return response()->json(['message' => 'Alerte marquée comme lue']);
    }

    /**
     * Reporter une alerte
     */
    public function snooze(Request $request, Alert $alert)
    {
        $this->authorize('update', $alert);

        $validated = $request->validate([
            'until' => 'required|date|after:now',
        ]);

        $alert->update([
            'scheduled_for' => $validated['until'],
        ]);

        return response()->json(['message' => 'Alerte reportée']);
    }

    /**
     * Supprimer une alerte
     */
    public function destroy(Alert $alert)
    {
        $this->authorize('delete', $alert);

        $alert->delete();

        return response()->json(['message' => 'Alerte supprimée']);
    }

    /**
     * Statistiques des alertes
     */
    public function stats(Request $request)
    {
        $userId = $request->user()->id;

        $stats = [
            'total_alerts' => Alert::whereHas('contract', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->count(),
            
            'pending_alerts' => Alert::whereHas('contract', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->where('status', 'pending')->count(),
            
            'due_alerts' => Alert::whereHas('contract', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->due()->count(),
            
            'renewal_warnings' => Alert::whereHas('contract', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->where('type', 'renewal_warning')->where('status', 'pending')->count(),
            
            'notice_deadlines' => Alert::whereHas('contract', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->where('type', 'notice_deadline')->where('status', 'pending')->count(),
            
            'expired_contracts' => Alert::whereHas('contract', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->where('type', 'contract_expired')->where('status', 'pending')->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Alertes dues aujourd'hui
     */
    public function today(Request $request)
    {
        $alerts = Alert::whereHas('contract', function($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->scheduledFor(today())
            ->where('status', 'pending')
            ->with(['contract:id,title,type,next_renewal_date'])
            ->orderBy('scheduled_for')
            ->get();

        return AlertResource::collection($alerts);
    }

    /**
     * Alertes de la semaine
     */
    public function thisWeek(Request $request)
    {
        $alerts = Alert::whereHas('contract', function($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->whereBetween('scheduled_for', [now()->startOfWeek(), now()->endOfWeek()])
            ->where('status', 'pending')
            ->with(['contract:id,title,type,next_renewal_date'])
            ->orderBy('scheduled_for')
            ->get();

        return AlertResource::collection($alerts);
    }
}
