<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\Contract;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CleanIncorrectAlerts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'alerts:clean-incorrect {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up incorrectly created alerts that mark future contracts as expired';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Recherche des alertes incorrectes...');

        // Trouver les alertes "contract_expired" pour des contrats qui n'ont pas encore expiré
        $incorrectAlerts = Alert::join('contracts', 'alerts.contract_id', '=', 'contracts.id')
            ->where('alerts.type', 'contract_expired')
            ->where('alerts.status', 'pending')
            ->whereColumn('contracts.next_renewal_date', '>', now())
            ->select('alerts.*', 'contracts.title as contract_title', 'contracts.next_renewal_date')
            ->get();

        if ($incorrectAlerts->isEmpty()) {
            $this->info('✅ Aucune alerte incorrecte trouvée !');
            return;
        }

        $this->warn("🚨 {$incorrectAlerts->count()} alerte(s) incorrecte(s) trouvée(s) :");

        foreach ($incorrectAlerts as $alert) {
            $this->line("  - Contrat: {$alert->contract_title}");
            $this->line("    Échéance: " . Carbon::parse($alert->next_renewal_date)->format('d/m/Y'));
            $this->line("    Alerte programmée: " . Carbon::parse($alert->scheduled_for)->format('d/m/Y'));
            $this->line("");
        }

        if ($this->option('dry-run')) {
            $this->info('🔍 Mode dry-run : aucune suppression effectuée');
            return;
        }

        if ($this->confirm('Voulez-vous supprimer ces alertes incorrectes ?', true)) {
            $deleted = Alert::join('contracts', 'alerts.contract_id', '=', 'contracts.id')
                ->where('alerts.type', 'contract_expired')
                ->where('alerts.status', 'pending')
                ->whereColumn('contracts.next_renewal_date', '>', now())
                ->delete();

            $this->info("✅ {$deleted} alerte(s) incorrecte(s) supprimée(s) !");
        } else {
            $this->info('❌ Opération annulée');
        }
    }
}
