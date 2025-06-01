<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CreditsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Obtenir les informations de crédits de l'utilisateur
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'credits_info' => $user->getAiCreditsInfo(),
            'subscription_plans' => [
                'basic' => [
                    'name' => 'Formule de base',
                    'monthly_credits' => 10,
                    'price' => 0,
                    'features' => [
                        'Analyse par pattern matching',
                        '10 analyses IA par mois',
                        'Alertes de renouvellement',
                        'Stockage illimité de contrats'
                    ]
                ],
                'premium' => [
                    'name' => 'Formule Premium',
                    'monthly_credits' => 30,
                    'price' => 19.99,
                    'features' => [
                        'Toutes les fonctionnalités de base',
                        '30 analyses IA par mois',
                        'Analyse avancée des clauses',
                        'Support prioritaire',
                        'Exports PDF personnalisés'
                    ]
                ]
            ],
            'credit_packages' => [
                ['credits' => 5, 'price' => 4.99],
                ['credits' => 10, 'price' => 8.99],
                ['credits' => 25, 'price' => 19.99],
                ['credits' => 50, 'price' => 34.99]
            ]
        ]);
    }

    /**
     * Changer le plan d'abonnement
     */
    public function changeSubscription(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'plan' => 'required|in:basic,premium'
        ]);

        $oldPlan = $user->subscription_plan;
        $newPlan = $validated['plan'];

        // Si c'est le même plan, pas de changement
        if ($oldPlan === $newPlan) {
            return response()->json([
                'message' => 'Vous êtes déjà sur ce plan',
                'credits_info' => $user->getAiCreditsInfo()
            ]);
        }

        // Upgrade vers premium
        if ($newPlan === 'premium') {
            // Ici on intégrera Stripe pour le paiement
            // Pour l'instant, simulation
            $user->upgradeSubscription('premium');
            
            return response()->json([
                'message' => 'Upgrade vers Premium effectué avec succès',
                'credits_info' => $user->fresh()->getAiCreditsInfo(),
                'plan_changed' => true
            ]);
        }

        // Downgrade vers basic
        if ($newPlan === 'basic') {
            $user->upgradeSubscription('basic');
            
            return response()->json([
                'message' => 'Plan modifié vers Basic',
                'credits_info' => $user->fresh()->getAiCreditsInfo(),
                'plan_changed' => true
            ]);
        }

        // Fallback (ne devrait jamais arriver avec la validation)
        return response()->json([
            'error' => 'Plan non reconnu',
            'credits_info' => $user->getAiCreditsInfo()
        ], 400);
    }

    /**
     * Acheter des crédits supplémentaires
     */
    public function purchaseCredits(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'credits' => 'required|integer|min:1|max:100',
            'payment_method' => 'required|string' // ID du payment method Stripe
        ]);

        $credits = $validated['credits'];
        $pricePerCredit = 0.99; // 0.99€ par crédit
        $totalPrice = $credits * $pricePerCredit;

        try {
            // Ici on intégrera Stripe pour le paiement
            // Pour l'instant, simulation
            
            // Simulation du paiement réussi
            $user->purchaseCredits($credits);
            
            return response()->json([
                'message' => "Achat de {$credits} crédits effectué avec succès",
                'credits_purchased' => $credits,
                'amount_paid' => $totalPrice,
                'credits_info' => $user->fresh()->getAiCreditsInfo(),
                'payment_successful' => true
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors du paiement',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Historique des crédits utilisés
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Pour l'instant, retourner les infos basiques
        // Plus tard, on pourra créer une table credit_transactions pour un historique détaillé
        
        return response()->json([
            'current_month' => [
                'used' => $user->ai_credits_used_this_month,
                'limit' => $user->ai_credits_monthly_limit,
                'purchased' => $user->ai_credits_purchased,
                'remaining' => $user->ai_credits_remaining
            ],
            'total_usage' => [
                'lifetime_used' => $user->ai_credits_total_used,
                'current_plan' => $user->subscription_plan,
                'member_since' => $user->created_at->format('Y-m-d')
            ],
            'next_reset' => $user->credits_reset_date->format('Y-m-d')
        ]);
    }

    /**
     * Vérifier si l'utilisateur peut utiliser l'IA
     */
    public function checkAiAvailability(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'can_use_ai' => $user->hasAiCredits(),
            'credits_remaining' => $user->ai_credits_remaining,
            'needs_upgrade' => $user->ai_credits_remaining === 0 && $user->isBasic(),
            'credits_info' => $user->getAiCreditsInfo()
        ]);
    }
}
