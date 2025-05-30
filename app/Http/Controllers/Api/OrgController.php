<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Org;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OrgController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Afficher l'organisation de l'utilisateur
     */
    public function show(Request $request)
    {
        $org = $request->user()->org;
        
        return response()->json([
            'id' => $org->id,
            'name' => $org->name,
            'slug' => $org->slug,
            'settings' => $org->settings,
            'subscription_plan' => $org->subscription_plan,
            'trial_ends_at' => $org->trial_ends_at?->format('Y-m-d H:i:s'),
            'is_on_trial' => $org->isOnTrial(),
            'has_active_subscription' => $org->hasActiveSubscription(),
            'contracts_count' => $org->getContractsCount(),
            'users_count' => $org->getUsersCount(),
            'created_at' => $org->created_at->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Mettre à jour l'organisation
     */
    public function update(Request $request)
    {
        $this->authorize('update', $request->user()->org);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'settings' => 'sometimes|array',
        ]);

        $org = $request->user()->org;
        $org->update($validated);

        return response()->json([
            'message' => 'Organisation mise à jour',
            'org' => [
                'id' => $org->id,
                'name' => $org->name,
                'settings' => $org->settings,
            ],
        ]);
    }

    /**
     * Liste des utilisateurs de l'organisation
     */
    public function users(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $users = $request->user()->org->users()
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }

    /**
     * Inviter un utilisateur dans l'organisation
     */
    public function inviteUser(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,user,viewer',
        ]);

        // Créer un token d'invitation
        $token = Str::random(32);
        
        // Créer l'utilisateur avec un password temporaire
        $user = User::create([
            'name' => 'Utilisateur invité',
            'email' => $validated['email'],
            'password' => Hash::make(Str::random(16)),
            'org_id' => $request->user()->org_id,
            'role' => $validated['role'],
        ]);

        // TODO: Envoyer l'email d'invitation
        // Mail::to($validated['email'])->send(new OrgInvitationMail($request->user()->org, $token));

        return response()->json([
            'message' => 'Invitation envoyée',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * Obtenir les paramètres de l'organisation
     */
    public function getSettings(Request $request)
    {
        $org = $request->user()->org;
        
        return response()->json([
            'settings' => $org->settings ?? [],
            'defaults' => [
                'timezone' => 'Europe/Paris',
                'language' => 'fr',
                'notifications' => [
                    'email' => true,
                    'sms' => false,
                    'push' => true,
                ],
                'alert_timing' => [
                    'renewal_warning_days' => [90, 30, 7],
                    'notice_deadline_days' => [30, 7, 1],
                ],
                'ocr' => [
                    'auto_process' => true,
                    'languages' => ['fra', 'eng'],
                ],
                'ai_analysis' => [
                    'auto_analyze' => true,
                    'confidence_threshold' => 0.7,
                ],
            ],
        ]);
    }

    /**
     * Mettre à jour les paramètres
     */
    public function updateSettings(Request $request)
    {
        $this->authorize('update', $request->user()->org);

        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.timezone' => 'sometimes|string|in:Europe/Paris,Europe/London,America/New_York',
            'settings.language' => 'sometimes|string|in:fr,en',
            'settings.notifications' => 'sometimes|array',
            'settings.notifications.email' => 'sometimes|boolean',
            'settings.notifications.sms' => 'sometimes|boolean',
            'settings.notifications.push' => 'sometimes|boolean',
            'settings.alert_timing' => 'sometimes|array',
            'settings.ocr' => 'sometimes|array',
            'settings.ai_analysis' => 'sometimes|array',
        ]);

        $org = $request->user()->org;
        $currentSettings = $org->settings ?? [];
        $newSettings = array_merge($currentSettings, $validated['settings']);
        
        $org->update(['settings' => $newSettings]);

        return response()->json([
            'message' => 'Paramètres mis à jour',
            'settings' => $newSettings,
        ]);
    }
}
