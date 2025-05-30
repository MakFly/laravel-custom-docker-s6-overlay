<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Créer d'abord les organisations
        $this->call([
            OrgSeeder::class,
        ]);

        // Puis créer les utilisateurs de test
        // User::factory(10)->create();

        // Créer un utilisateur de test avec org_id
        $testOrg = \App\Models\Org::where('slug', 'default-org')->first();
        
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'org_id' => $testOrg->id,
            'role' => 'user',
        ]);
    }
}
