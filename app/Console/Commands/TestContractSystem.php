<?php

namespace App\Console\Commands;

use App\Models\Org;
use App\Models\User;
use App\Models\Contract;
use App\Services\OCRService;
use App\Services\OpenAIService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

class TestContractSystem extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contract:test-system';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the Contract-Tacit system components';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Test du système Contract-Tacit');
        
        // Test 1: Créer une organisation de test
        $this->info('📋 Test 1: Création d\'une organisation de test...');
        $org = $this->createTestOrg();
        $this->info("✅ Organisation créée: {$org->name} (ID: {$org->id})");

        // Test 2: Créer un utilisateur de test
        $this->info('👤 Test 2: Création d\'un utilisateur de test...');
        $user = $this->createTestUser($org);
        $this->info("✅ Utilisateur créé: {$user->email} (Role: {$user->role})");

        // Test 3: Créer un contrat de test
        $this->info('📄 Test 3: Création d\'un contrat de test...');
        $contract = $this->createTestContract($user);
        $this->info("✅ Contrat créé: {$contract->title} (ID: {$contract->id})");

        // Test 4: Tester les services
        $this->info('🔧 Test 4: Test des services...');
        $this->testServices();

        // Test 5: Tester les API routes
        $this->info('🌐 Test 5: Vérification des routes API...');
        $this->testRoutes();

        // Test 6: Statistiques
        $this->info('📊 Test 6: Génération des statistiques...');
        $this->displayStats($org, $user, $contract);

        $this->info('🎉 Tests terminés avec succès !');
        $this->info('🌍 Accédez à l\'application sur http://localhost:8000');
        $this->info('📊 Dashboard API: http://localhost:8000/api/dashboard/stats');
    }

    private function createTestOrg(): Org
    {
        return Org::firstOrCreate(
            ['slug' => 'test-org'],
            [
                'name' => 'Organisation de Test',
                'settings' => [
                    'timezone' => 'Europe/Paris',
                    'language' => 'fr',
                    'notifications' => [
                        'email' => true,
                        'sms' => false,
                    ],
                ],
                'subscription_plan' => 'professional',
                'trial_ends_at' => now()->addDays(30),
            ]
        );
    }

    private function createTestUser(Org $org): User
    {
        return User::firstOrCreate(
            ['email' => 'test@contract-tacit.com'],
            [
                'name' => 'Utilisateur Test',
                'password' => Hash::make('password'),
                'org_id' => $org->id,
                'role' => 'admin',
                'phone' => '+33123456789',
                'notification_preferences' => [
                    'email' => true,
                    'sms' => false,
                    'push' => true,
                ],
            ]
        );
    }

    private function createTestContract(User $user): Contract
    {
        return Contract::firstOrCreate(
            ['title' => 'Contrat Test Assurance Auto'],
            [
                'user_id' => $user->id,
                'org_id' => $user->org_id,
                'type' => 'pro',
                'category' => 'assurance',
                'file_path' => 'contracts/test/test-contract.pdf',
                'file_original_name' => 'assurance-auto-test.pdf',
                'amount_cents' => 50000, // 500€
                'currency' => 'EUR',
                'start_date' => now()->subMonths(10),
                'end_date' => now()->addMonths(2),
                'next_renewal_date' => now()->addMonths(2),
                'notice_period_days' => 30,
                'is_tacit_renewal' => true,
                'status' => 'active',
                'ocr_status' => 'completed',
                'ocr_raw_text' => 'Contrat d\'assurance automobile avec reconduction tacite. Préavis de résiliation de 30 jours.',
                'ai_analysis' => [
                    'type_contrat' => 'assurance',
                    'reconduction_tacite' => true,
                    'duree_engagement' => '12 mois',
                    'preavis_resiliation_jours' => 30,
                    'montant' => 500,
                    'frequence_paiement' => 'mensuel',
                    'conditions_resiliation' => [
                        'Préavis de 30 jours minimum',
                        'Résiliation par lettre recommandée',
                    ],
                    'clauses_importantes' => [
                        'Reconduction automatique chaque année',
                        'Possibilité de résiliation à tout moment après la première année',
                    ],
                    'confidence_score' => 0.95,
                ],
            ]
        );
    }

    private function testServices(): void
    {
        try {
            // Test OCR Service
            $ocrService = app(OCRService::class);
            $this->info('  ✅ OCRService: Disponible');
            $this->info("  📋 Version Tesseract: " . $ocrService->getVersion());

            // Test OpenAI Service
            $aiService = app(OpenAIService::class);
            $this->info('  ✅ OpenAIService: Disponible');
            
            // Test de connexion OpenAI (si clé configurée)
            if (config('openai.api_key')) {
                $connected = $aiService->testConnection();
                $this->info('  🤖 OpenAI: ' . ($connected ? 'Connecté' : 'Non connecté'));
            } else {
                $this->warn('  ⚠️  OpenAI: Clé API non configurée');
            }

        } catch (\Exception $e) {
            $this->error('  ❌ Erreur services: ' . $e->getMessage());
        }
    }

    private function testRoutes(): void
    {
        $routes = [
            'api.contracts.index' => 'GET /api/contracts',
            'api.alerts.index' => 'GET /api/alerts',
            'api.dashboard.stats' => 'GET /api/dashboard/stats',
            'api.org.show' => 'GET /api/org',
        ];

        foreach ($routes as $name => $description) {
            if (Route::has($name)) {
                $this->info("  ✅ {$description}");
            } else {
                $this->error("  ❌ {$description} - Route manquante");
            }
        }
    }

    private function displayStats(Org $org, User $user, Contract $contract): void
    {
        $stats = [
            'Organisations' => Org::count(),
            'Utilisateurs' => User::count(),
            'Contrats' => Contract::count(),
            'Contrats actifs' => Contract::where('status', 'active')->count(),
            'Avec reconduction tacite' => Contract::where('is_tacit_renewal', true)->count(),
            'Expire bientôt (30j)' => Contract::expiringSoon(30)->count(),
        ];

        $this->table(['Métrique', 'Valeur'], 
            collect($stats)->map(fn($value, $key) => [$key, $value])->toArray()
        );

        $this->info("💰 Montant total des contrats actifs: " . 
            number_format(Contract::where('status', 'active')->sum('amount_cents') / 100, 2) . " €");
    }
}
