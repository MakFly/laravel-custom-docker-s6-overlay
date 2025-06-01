<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Alert;
use App\Models\Contract;

class DiscordWebhookService
{
    private string $defaultWebhookUrl;

    public function __construct()
    {
        $this->defaultWebhookUrl = 'https://discord.com/api/webhooks/1378712052591497216/Sc5HxGUp3m5_qtEWLyL5U6Vp3LEWr8M95KLZiR4__hxebuMsK-uEUyMbl6pAAvjhd_ZM';
    }

    /**
     * Send contract alert to Discord
     */
    public function sendContractAlert(Alert $alert, Contract $contract, ?string $customWebhook = null): bool
    {
        $webhookUrl = $customWebhook ?? $alert->discord_webhook_url ?? $this->defaultWebhookUrl;

        if (!$webhookUrl) {
            Log::warning('No Discord webhook URL configured for alert', ['alert_id' => $alert->id]);
            return false;
        }

        $embed = $this->buildContractAlertEmbed($alert, $contract);
        
        try {
            $response = Http::post($webhookUrl, [
                'embeds' => [$embed],
                'username' => 'Captain Hook Préavis',
                'avatar_url' => 'https://cdn.discordapp.com/avatars/BOT_ID/avatar.png', // Optional
            ]);

            if ($response->successful()) {
                Log::info('Discord alert sent successfully', [
                    'alert_id' => $alert->id,
                    'contract_id' => $contract->id,
                ]);
                return true;
            } else {
                Log::error('Discord webhook failed', [
                    'alert_id' => $alert->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Discord webhook exception', [
                'alert_id' => $alert->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Send monthly expiring contracts summary
     */
    public function sendMonthlyExpiryReport(array $contracts, ?string $customWebhook = null): bool
    {
        $webhookUrl = $customWebhook ?? $this->defaultWebhookUrl;

        if (empty($contracts)) {
            return true; // No contracts to report
        }

        $embed = $this->buildMonthlyReportEmbed($contracts);
        
        try {
            $response = Http::post($webhookUrl, [
                'embeds' => [$embed],
                'username' => 'Captain Hook Préavis',
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Discord monthly report failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Build contract alert embed
     */
    private function buildContractAlertEmbed(Alert $alert, Contract $contract): array
    {
        $daysUntilExpiry = now()->diffInDays($contract->next_renewal_date, false);
        $urgencyColor = $this->getUrgencyColor($daysUntilExpiry);
        
        return [
            'title' => '🚨 Alerte Contrat - ' . $contract->title,
            'description' => $this->getAlertDescription($alert, $contract),
            'color' => $urgencyColor,
            'fields' => [
                [
                    'name' => '📋 Détails du contrat',
                    'value' => "**Type:** " . ($contract->type === 'pro' ? 'Professionnel' : 'Personnel') . "\n" .
                              "**Catégorie:** " . ucfirst($contract->category) . "\n" .
                              "**Montant:** " . ($contract->amount ? number_format($contract->amount, 2) . '€' : 'N/A'),
                    'inline' => true,
                ],
                [
                    'name' => '⏰ Échéances',
                    'value' => "**Renouvellement:** " . $contract->next_renewal_date->format('d/m/Y') . "\n" .
                              "**Dans:** " . abs($daysUntilExpiry) . " jour(s)" . "\n" .
                              "**Préavis:** " . ($contract->notice_period_days ? $contract->notice_period_days . ' jours' : 'Non défini'),
                    'inline' => true,
                ],
                [
                    'name' => '🎯 Actions recommandées',
                    'value' => $this->getRecommendedActions($daysUntilExpiry, $contract),
                    'inline' => false,
                ],
            ],
            'footer' => [
                'text' => 'Préavis • ' . now()->format('d/m/Y H:i'),
            ],
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * Build monthly report embed
     */
    private function buildMonthlyReportEmbed(array $contracts): array
    {
        $totalAmount = collect($contracts)->sum('amount');
        $categoryCounts = collect($contracts)->groupBy('category')->map->count();
        
        return [
            'title' => '📊 Rapport Mensuel - Contrats Expirant',
            'description' => sprintf(
                '**%d contrat(s)** expire(nt) ce mois pour un total de **%s€**',
                count($contracts),
                number_format($totalAmount, 2)
            ),
            'color' => 16776960, // Yellow
            'fields' => [
                [
                    'name' => '📈 Répartition par catégorie',
                    'value' => $categoryCounts->map(function ($count, $category) {
                        return "**" . ucfirst($category) . ":** {$count}";
                    })->implode("\n") ?: 'Aucune catégorie',
                    'inline' => true,
                ],
                [
                    'name' => '⚠️ Actions urgentes',
                    'value' => $this->getUrgentActions($contracts),
                    'inline' => false,
                ],
            ],
            'footer' => [
                'text' => 'Rapport généré automatiquement • Préavis',
            ],
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * Get urgency color based on days until expiry
     */
    private function getUrgencyColor(int $daysUntilExpiry): int
    {
        if ($daysUntilExpiry <= 7) {
            return 16711680; // Red
        } elseif ($daysUntilExpiry <= 30) {
            return 16776960; // Yellow  
        } else {
            return 3447003; // Blue
        }
    }

    /**
     * Get alert description
     */
    private function getAlertDescription(Alert $alert, Contract $contract): string
    {
        $daysUntilExpiry = now()->diffInDays($contract->next_renewal_date, false);
        
        if ($daysUntilExpiry <= 0) {
            return "⚠️ **URGENT:** Ce contrat a expiré ou expire aujourd'hui !";
        } elseif ($daysUntilExpiry <= 7) {
            return "🔥 **ATTENTION:** Ce contrat expire dans moins d'une semaine !";
        } elseif ($daysUntilExpiry <= 30) {
            return "⏰ Ce contrat expire dans moins d'un mois. Pensez à vérifier les conditions.";
        } else {
            return "📅 Rappel: Ce contrat approche de son échéance.";
        }
    }

    /**
     * Get recommended actions
     */
    private function getRecommendedActions(int $daysUntilExpiry, Contract $contract): string
    {
        if ($daysUntilExpiry <= 7) {
            return "• 🚨 **Action immédiate requise**\n" .
                   "• 📞 Contacter le fournisseur\n" .
                   "• 📄 Préparer la résiliation si nécessaire";
        } elseif ($daysUntilExpiry <= 30) {
            return "• 📋 Vérifier les conditions de renouvellement\n" .
                   "• 💰 Comparer les offres concurrentes\n" .
                   "• 📅 Planifier la résiliation/négociation";
        } else {
            return "• 📝 Ajouter un rappel dans votre agenda\n" .
                   "• 🔍 Surveiller les évolutions du marché\n" .
                   "• 📊 Préparer l'analyse de performance";
        }
    }

    /**
     * Get urgent actions for monthly report
     */
    private function getUrgentActions(array $contracts): string
    {
        $urgentContracts = collect($contracts)->filter(function ($contract) {
            $renewalDate = isset($contract['next_renewal_date']) 
                ? (is_string($contract['next_renewal_date']) ? \Carbon\Carbon::parse($contract['next_renewal_date']) : $contract['next_renewal_date'])
                : null;
            return $renewalDate && now()->diffInDays($renewalDate, false) <= 7;
        })->count();

        if ($urgentContracts > 0) {
            return sprintf(
                "🚨 **%d contrat(s) urgent(s)** nécessitent une attention immédiate !\n" .
                "📞 Contactez les fournisseurs dès maintenant",
                $urgentContracts
            );
        }

        return "✅ Aucune action urgente requise.\n📅 Continuez à surveiller les échéances.";
    }

    /**
     * Test webhook connection
     */
    public function testWebhook(?string $webhookUrl = null): bool
    {
        $url = $webhookUrl ?? $this->defaultWebhookUrl;
        
        try {
            $response = Http::post($url, [
                'content' => '🧪 **Test de connexion Préavis**\n\nCe message confirme que votre webhook Discord fonctionne correctement !',
                'username' => 'Captain Hook Préavis',
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Discord webhook test failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
} 