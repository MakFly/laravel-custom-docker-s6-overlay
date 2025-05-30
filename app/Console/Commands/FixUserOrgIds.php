<?php

namespace App\Console\Commands;

use App\Models\Org;
use App\Models\User;
use Illuminate\Console\Command;

class FixUserOrgIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:user-org-ids';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix users without org_id by assigning them to default organization';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Fixing users without org_id...');

        // Créer une organisation par défaut si elle n'existe pas
        $defaultOrg = Org::firstOrCreate(
            ['slug' => 'default-org'],
            [
                'name' => 'Default Organization',
                'slug' => 'default-org',
                'status' => 'active',
                'settings' => [
                    'timezone' => 'Europe/Paris',
                    'language' => 'fr',
                    'notifications' => [
                        'email' => true,
                        'sms' => false,
                    ],
                    'contracts_limit' => -1,
                    'users_limit' => -1,
                ],
            ]
        );

        // Compter les utilisateurs sans org_id
        $usersWithoutOrg = User::whereNull('org_id')->count();
        
        if ($usersWithoutOrg === 0) {
            $this->info('No users without org_id found.');
            return;
        }

        $this->info("Found {$usersWithoutOrg} users without org_id.");

        // Mettre à jour les utilisateurs sans org_id
        $updated = User::whereNull('org_id')->update([
            'org_id' => $defaultOrg->id,
            'role' => 'user', // Par défaut, role user
        ]);

        $this->info("Updated {$updated} users with default org_id.");
        $this->info('Done!');
    }
} 