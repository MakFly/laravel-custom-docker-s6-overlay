<?php

namespace Database\Seeders;

use App\Models\Org;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class OrgSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Créer une organisation par défaut
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

        // Créer un utilisateur admin par défaut s'il n'existe pas
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@contract-tacit.com'],
            [
                'name' => 'Admin User',
                'email' => 'admin@contract-tacit.com',
                'password' => Hash::make('password'),
                'org_id' => $defaultOrg->id,
                'role' => 'admin',
                'email_verified_at' => now(),
                'notification_preferences' => [
                    'email' => true,
                    'sms' => false,
                    'push' => true,
                ],
            ]
        );

        // Mettre à jour tous les utilisateurs existants sans org_id
        User::whereNull('org_id')->update([
            'org_id' => $defaultOrg->id,
            'role' => 'user',
        ]);

        $this->command->info('Default organization and admin user created successfully.');
    }
} 