# Architecture Multi-Tenant - Contract-Tacit

## Vue d'Ensemble

Contract-Tacit utilise une architecture multi-tenant où chaque organisation (`Org`) peut avoir plusieurs utilisateurs et contrats. Cette approche permet de servir plusieurs entreprises/cabinets sur la même instance tout en isolant leurs données.

## Structure des Données

### Modèle de Données Multi-Tenant

```
┌─────────────────┐
│      Org        │
│                 │
│ id              │
│ name            │
│ slug            │
│ settings        │
│ subscription_*  │ ← Stripe Cashier
└─────────────────┘
         │ 1:N
         ▼
┌─────────────────┐
│      User       │
│                 │
│ id              │
│ email           │
│ org_id (FK)     │
│ role            │
└─────────────────┘
         │ 1:N
         ▼
┌─────────────────┐
│    Contract     │
│                 │
│ id              │
│ org_id (FK)     │
│ title           │
│ type (pro/perso)│
│ category        │
│ ...             │
└─────────────────┘
         │ 1:N
         ▼
┌─────────────────┐
│     Alert       │
│                 │
│ id              │
│ contract_id     │
│ type            │
│ ...             │
└─────────────────┘
```

## Gestion des Organisations

### 1. Création d'une Organisation

```php
// Création d'une nouvelle organisation
$org = Org::create([
    'name' => 'Cabinet Juridique Dupont',
    'slug' => 'cabinet-dupont',
    'settings' => [
        'timezone' => 'Europe/Paris',
        'language' => 'fr',
        'notifications' => [
            'email' => true,
            'sms' => false
        ]
    ]
]);

// Associer un utilisateur admin
$user = User::create([
    'email' => 'admin@cabinet-dupont.fr',
    'password' => Hash::make('password'),
    'org_id' => $org->id,
    'role' => 'admin'
]);
```

### 2. Structure du Modèle Org

```php
// app/Models/Org.php
class Org extends Model
{
    use HasStripeSubscription; // Cashier trait

    protected $fillable = [
        'name',
        'slug', 
        'settings',
        'subscription_plan',
        'trial_ends_at'
    ];

    protected $casts = [
        'settings' => 'array',
        'trial_ends_at' => 'datetime'
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    // Méthodes Cashier pour Stripe
    public function stripeName()
    {
        return $this->name;
    }

    public function stripeEmail()
    {
        return $this->users()->where('role', 'admin')->first()?->email;
    }
}
```

## Isolation des Données

### 1. Global Scopes Automatiques

```php
// app/Models/Traits/BelongsToOrg.php
trait BelongsToOrg
{
    protected static function bootBelongsToOrg()
    {
        // Ajouter automatiquement org_id lors de la création
        static::creating(function ($model) {
            if (!$model->org_id && auth()->user()) {
                $model->org_id = auth()->user()->org_id;
            }
        });

        // Filtrer automatiquement par org_id
        static::addGlobalScope('org', function (Builder $builder) {
            if (auth()->user()) {
                $builder->where('org_id', auth()->user()->org_id);
            }
        });
    }

    public function org()
    {
        return $this->belongsTo(Org::class);
    }
}

// Usage dans les modèles
class Contract extends Model
{
    use BelongsToOrg;
    // ...
}
```

### 2. Middleware de Vérification

```php
// app/Http/Middleware/EnsureOrgAccess.php
class EnsureOrgAccess
{
    public function handle($request, Closure $next)
    {
        $user = $request->user();
        
        if (!$user || !$user->org_id) {
            return response()->json(['error' => 'No organization assigned'], 403);
        }

        // Vérifier que l'utilisateur accède bien aux données de son org
        if ($request->route('contract')) {
            $contract = $request->route('contract');
            if ($contract->org_id !== $user->org_id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }

        return $next($request);
    }
}
```

## Gestion des Utilisateurs

### 1. Rôles et Permissions

```php
// Types de rôles par organisation
const ROLES = [
    'admin',      // Admin de l'organisation
    'user',       // Utilisateur standard
    'viewer'      // Lecture seule
];

// Vérifications dans les Policies
class ContractPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'user', 'viewer']);
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'user']);
    }

    public function update(User $user, Contract $contract)
    {
        return $user->org_id === $contract->org_id 
            && in_array($user->role, ['admin', 'user']);
    }

    public function delete(User $user, Contract $contract)
    {
        return $user->org_id === $contract->org_id 
            && $user->role === 'admin';
    }
}
```

### 2. Invitation d'Utilisateurs

```php
// Service d'invitation
class OrgInvitationService
{
    public function inviteUser(Org $org, string $email, string $role = 'user')
    {
        // Créer un token d'invitation
        $token = Str::random(32);
        
        OrgInvitation::create([
            'org_id' => $org->id,
            'email' => $email,
            'role' => $role,
            'token' => $token,
            'expires_at' => now()->addDays(7)
        ]);

        // Envoyer l'email d'invitation
        Mail::to($email)->send(new OrgInvitationMail($org, $token));
    }

    public function acceptInvitation(string $token, array $userData)
    {
        $invitation = OrgInvitation::where('token', $token)
            ->where('expires_at', '>', now())
            ->firstOrFail();

        $user = User::create([
            'email' => $invitation->email,
            'password' => Hash::make($userData['password']),
            'org_id' => $invitation->org_id,
            'role' => $invitation->role
        ]);

        $invitation->delete();

        return $user;
    }
}
```

## Intégration Stripe Cashier

### 1. Configuration Multi-Tenant

```php
// config/cashier.php
return [
    'key' => env('STRIPE_KEY'),
    'secret' => env('STRIPE_SECRET'),
    'webhook' => [
        'secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],
    'model' => App\Models\Org::class, // Org au lieu de User
    'currency' => 'eur',
];
```

### 2. Plans et Abonnements

```php
// Service de gestion des abonnements
class SubscriptionService
{
    public function subscribeToPlan(Org $org, string $planId, string $paymentMethod)
    {
        return $org->newSubscription('default', $planId)
            ->create($paymentMethod, [
                'email' => $org->stripeEmail(),
            ]);
    }

    public function changeSubscription(Org $org, string $newPlanId)
    {
        return $org->subscription('default')->swap($newPlanId);
    }

    public function cancelSubscription(Org $org)
    {
        return $org->subscription('default')->cancel();
    }

    public function hasActiveSubscription(Org $org): bool
    {
        return $org->subscribed('default');
    }
}

// Plans disponibles
const SUBSCRIPTION_PLANS = [
    'starter' => [
        'name' => 'Starter',
        'price' => 29,
        'contracts_limit' => 50,
        'users_limit' => 3,
        'features' => ['ocr', 'alerts']
    ],
    'professional' => [
        'name' => 'Professional', 
        'price' => 79,
        'contracts_limit' => 200,
        'users_limit' => 10,
        'features' => ['ocr', 'alerts', 'ai_analysis', 'api_access']
    ],
    'enterprise' => [
        'name' => 'Enterprise',
        'price' => 199,
        'contracts_limit' => -1, // Illimité
        'users_limit' => -1,
        'features' => ['ocr', 'alerts', 'ai_analysis', 'api_access', 'custom_integrations']
    ]
];
```

### 3. Limitations par Plan

```php
// Middleware de vérification des limites
class CheckSubscriptionLimits
{
    public function handle($request, Closure $next, $feature = null)
    {
        $org = $request->user()->org;
        
        if (!$org->hasActiveSubscription()) {
            return response()->json(['error' => 'Active subscription required'], 402);
        }

        if ($feature && !$this->hasFeature($org, $feature)) {
            return response()->json(['error' => "Feature '$feature' not available in your plan"], 403);
        }

        // Vérifier les limites spécifiques
        if ($request->isMethod('POST') && $request->is('*/contracts')) {
            if (!$this->canCreateContract($org)) {
                return response()->json(['error' => 'Contract limit reached'], 403);
            }
        }

        return $next($request);
    }

    private function hasFeature(Org $org, string $feature): bool
    {
        $plan = $org->subscription('default')->items->first()->stripe_price;
        return in_array($feature, SUBSCRIPTION_PLANS[$plan]['features'] ?? []);
    }

    private function canCreateContract(Org $org): bool
    {
        $plan = $org->subscription('default')->items->first()->stripe_price;
        $limit = SUBSCRIPTION_PLANS[$plan]['contracts_limit'] ?? 0;
        
        if ($limit === -1) return true; // Illimité
        
        return $org->contracts()->count() < $limit;
    }
}
```

## API et Routes

### 1. Structure des Routes

```php
// routes/api.php
Route::middleware(['auth:sanctum', 'ensure-org-access'])->group(function () {
    
    // Gestion de l'organisation
    Route::get('/org', [OrgController::class, 'show']);
    Route::put('/org', [OrgController::class, 'update']);
    Route::get('/org/users', [OrgController::class, 'users']);
    Route::post('/org/users/invite', [OrgController::class, 'inviteUser']);
    
    // Abonnements (avec Cashier)
    Route::prefix('subscription')->group(function () {
        Route::get('/', [SubscriptionController::class, 'current']);
        Route::post('/subscribe', [SubscriptionController::class, 'subscribe']);
        Route::post('/cancel', [SubscriptionController::class, 'cancel']);
        Route::get('/invoices', [SubscriptionController::class, 'invoices']);
    });
    
    // Contrats (automatiquement filtrés par org)
    Route::apiResource('contracts', ContractController::class);
    
    // Alertes
    Route::apiResource('alerts', AlertController::class);
});
```

### 2. Contrôleurs avec Isolation

```php
class ContractController extends Controller
{
    public function index(Request $request)
    {
        // Le global scope filtre automatiquement par org_id
        $contracts = Contract::with(['alerts' => function($query) {
                $query->where('status', 'pending');
            }])
            ->paginate($request->get('per_page', 15));

        return ContractResource::collection($contracts);
    }

    public function store(StoreContractRequest $request)
    {
        // org_id ajouté automatiquement par le trait BelongsToOrg
        $contract = Contract::create($request->validated());
        
        ProcessContractOCR::dispatch($contract);
        
        return new ContractResource($contract);
    }
}
```

## Déploiement et Migration

### 1. Migration des Données

```php
// Migration pour ajouter le support multi-tenant
Schema::table('contracts', function (Blueprint $table) {
    $table->foreignId('org_id')->constrained()->onDelete('cascade');
    $table->index(['org_id', 'status']);
    $table->index(['org_id', 'type']);
});

// Commande pour migrer les données existantes
class MigrateToMultiTenant extends Command
{
    public function handle()
    {
        // Créer une org par défaut
        $defaultOrg = Org::create([
            'name' => 'Default Organization',
            'slug' => 'default'
        ]);

        // Assigner tous les utilisateurs à cette org
        User::whereNull('org_id')->update(['org_id' => $defaultOrg->id]);
        
        // Assigner tous les contrats à cette org
        Contract::whereNull('org_id')->update(['org_id' => $defaultOrg->id]);
    }
}
```

### 2. Tests Multi-Tenant

```php
class ContractMultiTenantTest extends TestCase
{
    public function test_user_can_only_see_own_org_contracts()
    {
        $org1 = Org::factory()->create();
        $org2 = Org::factory()->create();
        
        $user1 = User::factory()->create(['org_id' => $org1->id]);
        $user2 = User::factory()->create(['org_id' => $org2->id]);
        
        $contract1 = Contract::factory()->create(['org_id' => $org1->id]);
        $contract2 = Contract::factory()->create(['org_id' => $org2->id]);
        
        $this->actingAs($user1)
             ->getJson('/api/contracts')
             ->assertJsonCount(1, 'data')
             ->assertJsonFragment(['id' => $contract1->id])
             ->assertJsonMissing(['id' => $contract2->id]);
    }
}
```

## Sécurité et Bonnes Pratiques

### 1. Isolation des Données
- ✅ Global scopes automatiques sur tous les modèles
- ✅ Middleware de vérification des accès
- ✅ Policies avec vérification org_id
- ✅ Tests automatisés de l'isolation

### 2. Gestion des Erreurs
- ✅ Logs séparés par organisation
- ✅ Monitoring des performances par tenant
- ✅ Alertes en cas de dépassement de limites

### 3. Performance
- ✅ Index sur org_id + autres colonnes fréquentes
- ✅ Cache Redis séparé par org_id
- ✅ Queues avec priorité par plan d'abonnement

Cette architecture multi-tenant offre une base solide pour faire évoluer Contract-Tacit en SaaS avec Stripe Cashier pour la gestion des abonnements. 