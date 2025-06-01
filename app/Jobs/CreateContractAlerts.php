<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Models\Alert;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CreateContractAlerts implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    public function __construct(
        public Contract $contract
    ) {}

    public function handle(): void
    {
        if (!$this->contract->next_renewal_date) {
            Log::info("No renewal date set for contract, skipping alert creation", [
                'contract_id' => $this->contract->id
            ]);
            return;
        }

        // Nettoyer les alertes existantes pour éviter les doublons lors du retraitement
        Alert::where('contract_id', $this->contract->id)->delete();
        
        Log::info("Cleaned existing alerts for contract before creating new ones", [
            'contract_id' => $this->contract->id
        ]);

        $renewalDate = Carbon::parse($this->contract->next_renewal_date);
        $now = now();

        // Ne créer des alertes que si la date de renouvellement est dans le futur
        if ($renewalDate->isPast()) {
            Log::info("Contract renewal date is in the past, skipping alert creation", [
                'contract_id' => $this->contract->id,
                'renewal_date' => $renewalDate->toDateString()
            ]);
            return;
        }

        $alertsToCreate = [
            [
                'type' => 'renewal_warning',
                'days_before' => 90,
                'message' => "Votre contrat \"{$this->contract->title}\" arrive à échéance dans 3 mois"
            ],
            [
                'type' => 'renewal_warning', 
                'days_before' => 30,
                'message' => "Votre contrat \"{$this->contract->title}\" arrive à échéance dans 1 mois"
            ],
            [
                'type' => 'notice_deadline',
                'days_before' => $this->contract->notice_period_days,
                'message' => "Attention ! Dernier délai pour résilier le contrat \"{$this->contract->title}\" avant renouvellement automatique"
            ],
            [
                'type' => 'renewal_warning',
                'days_before' => 7,
                'message' => "Votre contrat \"{$this->contract->title}\" arrive à échéance dans 1 semaine"
            ],
            [
                'type' => 'contract_expired',
                'days_before' => 0,
                'message' => "Le contrat \"{$this->contract->title}\" a expiré aujourd'hui"
            ]
        ];

        foreach ($alertsToCreate as $alertData) {
            $scheduledFor = $renewalDate->copy()->subDays($alertData['days_before']);
            
            // Pour les alertes d'expiration, ne les créer que si c'est pour aujourd'hui ou plus tard
            if ($alertData['type'] === 'contract_expired' && !$renewalDate->isToday() && !$renewalDate->isPast()) {
                continue;
            }
            
            // Ne pas créer d'alertes pour des dates passées (sauf expiration le jour même)
            if ($scheduledFor->isPast() && !($alertData['type'] === 'contract_expired' && $renewalDate->isToday())) {
                continue;
            }

            // Vérifier si une alerte similaire existe déjà
            $existingAlert = Alert::where('contract_id', $this->contract->id)
                ->where('type', $alertData['type'])
                ->where('scheduled_for', $scheduledFor->toDateString())
                ->first();

            if (!$existingAlert) {
                Alert::create([
                    'contract_id' => $this->contract->id,
                    'type' => $alertData['type'],
                    'scheduled_for' => $scheduledFor,
                    'status' => 'pending',
                    'notification_method' => 'email',
                    'message' => $alertData['message'],
                ]);

                Log::info("Created alert for contract", [
                    'contract_id' => $this->contract->id,
                    'alert_type' => $alertData['type'],
                    'scheduled_for' => $scheduledFor->toDateString()
                ]);
            }
        }

        // Nettoyer les alertes incorrectes : supprimer les alertes "contract_expired" 
        // pour des contrats qui n'ont pas encore expiré
        Alert::where('contract_id', $this->contract->id)
            ->where('type', 'contract_expired')
            ->where('status', 'pending')
            ->whereDate('scheduled_for', '>', $renewalDate->toDateString())
            ->delete();

        // Marquer les anciennes alertes comme obsolètes si la date de renouvellement a changé
        Alert::where('contract_id', $this->contract->id)
            ->where('status', 'pending')
            ->where('scheduled_for', '<', $now)
            ->update(['status' => 'expired']);

        Log::info("Alert creation completed for contract", [
            'contract_id' => $this->contract->id,
            'renewal_date' => $renewalDate->toDateString()
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("Alert creation failed for contract", [
            'contract_id' => $this->contract->id,
            'error' => $exception->getMessage()
        ]);
    }
}
