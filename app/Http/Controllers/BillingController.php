<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Get user's subscriptions
        $subscriptions = $user->subscriptions()->with('items')->get();
        
        // Check if user has active subscription
        $hasActiveSubscription = $user->subscribed('default');
        
        // Get subscription info
        $subscriptionInfo = null;
        if ($hasActiveSubscription) {
            $subscription = $user->subscription('default');
            $subscriptionInfo = [
                'id' => $subscription->stripe_id,
                'status' => $subscription->stripe_status,
                'current_period_end' => $subscription->ends_at ? $subscription->ends_at->format('d/m/Y') : null,
                'trial_ends_at' => $subscription->trial_ends_at ? $subscription->trial_ends_at->format('d/m/Y') : null,
                'on_trial' => $subscription->onTrial(),
                'cancelled' => $subscription->cancelled(),
                'ended' => $subscription->ended(),
                'on_grace_period' => $subscription->onGracePeriod(),
            ];
        }

        return Inertia::render('Billing/Index', [
            'has_active_subscription' => $hasActiveSubscription,
            'subscription_info' => $subscriptionInfo,
            'subscriptions' => $subscriptions,
            'stripe_key' => config('cashier.key'),
        ]);
    }

    public function subscribe(Request $request)
    {
        $request->validate([
            'plan' => 'required|in:starter_monthly,starter_yearly,pro_monthly,pro_yearly,enterprise_monthly,enterprise_yearly',
            'payment_method' => 'required|string',
        ]);

        $user = $request->user();
        
        // Define price IDs from environment variables
        $priceIds = [
            'starter_monthly' => env('STRIPE_PRICE_STARTER_MONTHLY'),
            'starter_yearly' => env('STRIPE_PRICE_STARTER_YEARLY'),
            'pro_monthly' => env('STRIPE_PRICE_PRO_MONTHLY'),
            'pro_yearly' => env('STRIPE_PRICE_PRO_YEARLY'),
            'enterprise_monthly' => env('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
            'enterprise_yearly' => env('STRIPE_PRICE_ENTERPRISE_YEARLY'),
        ];

        try {
            // Create customer if doesn't exist
            if (!$user->hasStripeId()) {
                $user->createAsStripeCustomer();
            }

            // Add payment method
            $user->addPaymentMethod($request->payment_method);
            $user->updateDefaultPaymentMethod($request->payment_method);

            // Determine trial days based on plan
            $trialDays = str_contains($request->plan, 'yearly') ? 14 : 7;
            
            // Create subscription with trial
            $subscription = $user->newSubscription('default', $priceIds[$request->plan])
                ->trialDays($trialDays)
                ->create($request->payment_method);

            return response()->json([
                'success' => true,
                'message' => 'Abonnement créé avec succès !',
                'subscription_id' => $subscription->stripe_id
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'abonnement: ' . $e->getMessage()
            ], 400);
        }
    }

    public function cancel(Request $request)
    {
        $user = $request->user();
        
        if (!$user->subscribed('default')) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun abonnement actif trouvé'
            ], 400);
        }

        try {
            // Cancel at period end (grace period)
            $user->subscription('default')->cancel();

            return response()->json([
                'success' => true,
                'message' => 'Abonnement annulé. Vous conservez l\'accès jusqu\'à la fin de votre période de facturation.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'annulation: ' . $e->getMessage()
            ], 400);
        }
    }

    public function resume(Request $request)
    {
        $user = $request->user();
        
        if (!$user->subscription('default') || !$user->subscription('default')->onGracePeriod()) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun abonnement à reprendre'
            ], 400);
        }

        try {
            $user->subscription('default')->resume();

            return response()->json([
                'success' => true,
                'message' => 'Abonnement repris avec succès !'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la reprise: ' . $e->getMessage()
            ], 400);
        }
    }

    public function portal(Request $request)
    {
        $user = $request->user();

        if (!$user->hasStripeId()) {
            return redirect()->route('billing.index')->with('error', 'Aucun compte de facturation trouvé.');
        }

        try {
            return $user->redirectToBillingPortal(route('billing.index'));
        } catch (\Exception $e) {
            return redirect()->route('billing.index')->with('error', 'Erreur lors de l\'accès au portail de facturation.');
        }
    }

    public function updatePaymentMethod(Request $request)
    {
        $request->validate([
            'payment_method' => 'required|string',
        ]);

        $user = $request->user();

        try {
            $user->updateDefaultPaymentMethod($request->payment_method);

            return response()->json([
                'success' => true,
                'message' => 'Méthode de paiement mise à jour avec succès !'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
            ], 400);
        }
    }

    public function invoices(Request $request)
    {
        $user = $request->user();
        
        if (!$user->hasStripeId()) {
            return Inertia::render('Billing/Invoices', [
                'invoices' => []
            ]);
        }

        try {
            $invoices = $user->invoices();
            
            $formattedInvoices = collect($invoices)->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'date' => $invoice->date()->format('d/m/Y'),
                    'total' => $invoice->total(),
                    'currency' => strtoupper($invoice->currency),
                    'status' => $invoice->status,
                    'download_url' => route('billing.invoice.download', $invoice->id),
                ];
            });

            return Inertia::render('Billing/Invoices', [
                'invoices' => $formattedInvoices
            ]);

        } catch (\Exception $e) {
            return Inertia::render('Billing/Invoices', [
                'invoices' => [],
                'error' => 'Erreur lors du chargement des factures'
            ]);
        }
    }

    public function downloadInvoice(Request $request, $invoiceId)
    {
        $user = $request->user();

        try {
            return $user->downloadInvoice($invoiceId, [
                'vendor' => 'Préavis',
                'product' => 'Abonnement Préavis',
            ]);
        } catch (\Exception $e) {
            return redirect()->route('billing.invoices')->with('error', 'Facture introuvable');
        }
    }

    public function webhook(Request $request)
    {
        // Handle Stripe webhooks
        $payload = $request->getContent();
        $sig_header = $request->header('stripe-signature');
        $endpoint_secret = config('cashier.webhook.secret');

        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload, $sig_header, $endpoint_secret
            );
        } catch (\UnexpectedValueException $e) {
            return response('Invalid payload', 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            return response('Invalid signature', 400);
        }

        // Handle the event
        switch ($event['type']) {
            case 'customer.subscription.deleted':
                // Handle subscription deletion
                break;
            case 'invoice.payment_failed':
                // Handle failed payment
                break;
            default:
                // Unexpected event type
                break;
        }

        return response('Webhook handled', 200);
    }
}
