<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory for generating Stripe product test data
 * This is mainly used for local development and testing
 */
class StripeProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $plans = [
            'starter' => [
                'name' => 'Préavis Starter',
                'description' => 'Plan Starter - Jusqu\'à 10 contrats surveillés',
                'monthly_price' => 990, // 9.90€
                'yearly_price' => 9900, // 99€ (2 months free)
                'features' => [
                    'Jusqu\'à 10 contrats',
                    'Alertes email',
                    'OCR basique',
                    'Support email',
                ],
                'limits' => [
                    'contracts' => 10,
                    'alerts' => 50,
                    'ocr_pages' => 100,
                ]
            ],
            'pro' => [
                'name' => 'Préavis Pro',
                'description' => 'Plan Pro - Contrats illimités avec toutes les fonctionnalités',
                'monthly_price' => 1990, // 19.90€
                'yearly_price' => 19900, // 199€ (2 months free)
                'features' => [
                    'Contrats illimités',
                    'Alertes email + Discord',
                    'OCR avancé + IA',
                    'Rapports personnalisés',
                    'Support prioritaire',
                    'API access',
                ],
                'limits' => [
                    'contracts' => -1, // unlimited
                    'alerts' => -1, // unlimited
                    'ocr_pages' => -1, // unlimited
                ]
            ],
            'enterprise' => [
                'name' => 'Préavis Enterprise',
                'description' => 'Plan Entreprise - Solution complète avec support dédié',
                'monthly_price' => 4990, // 49.90€
                'yearly_price' => 49900, // 499€ (2 months free)
                'features' => [
                    'Multi-organisations',
                    'Contrats illimités',
                    'Toutes les alertes',
                    'OCR + IA avancée',
                    'Tableaux de bord personnalisés',
                    'Intégrations API',
                    'Support téléphonique',
                    'Manager de compte dédié',
                ],
                'limits' => [
                    'contracts' => -1,
                    'alerts' => -1,
                    'ocr_pages' => -1,
                    'organizations' => 5,
                ]
            ]
        ];

        $planKey = $this->faker->randomElement(array_keys($plans));
        $plan = $plans[$planKey];

        return [
            'plan_id' => $planKey,
            'name' => $plan['name'],
            'description' => $plan['description'],
            'monthly_price' => $plan['monthly_price'],
            'yearly_price' => $plan['yearly_price'],
            'currency' => 'eur',
            'features' => $plan['features'],
            'limits' => $plan['limits'],
            'stripe_product_id' => 'prod_' . $this->faker->unique()->regexify('[A-Za-z0-9]{14}'),
            'stripe_monthly_price_id' => 'price_' . $this->faker->unique()->regexify('[A-Za-z0-9]{24}'),
            'stripe_yearly_price_id' => 'price_' . $this->faker->unique()->regexify('[A-Za-z0-9]{24}'),
            'is_active' => $this->faker->boolean(90), // 90% chance of being active
            'trial_days' => $this->faker->randomElement([0, 7, 14, 30]),
            'metadata' => [
                'created_by' => 'factory',
                'environment' => 'test',
                'plan_tier' => $planKey,
            ],
        ];
    }

    /**
     * Generate starter plan
     */
    public function starter(): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => 'starter',
            'name' => 'Préavis Starter',
            'description' => 'Plan Starter - Jusqu\'à 10 contrats surveillés',
            'monthly_price' => 990,
            'yearly_price' => 9900,
            'features' => [
                'Jusqu\'à 10 contrats',
                'Alertes email',
                'OCR basique',
                'Support email',
            ],
            'limits' => [
                'contracts' => 10,
                'alerts' => 50,
                'ocr_pages' => 100,
            ]
        ]);
    }

    /**
     * Get starter plan data directly
     */
    public static function getStarterData(): array
    {
        return [
            'plan_id' => 'starter',
            'name' => 'Préavis Starter',
            'description' => 'Plan Starter - Jusqu\'à 10 contrats surveillés',
            'monthly_price' => 990,
            'yearly_price' => 9900,
            'currency' => 'eur',
            'features' => [
                'Jusqu\'à 10 contrats',
                'Alertes email',
                'OCR basique',
                'Support email',
            ],
            'limits' => [
                'contracts' => 10,
                'alerts' => 50,
                'ocr_pages' => 100,
            ],
            'is_active' => true,
            'trial_days' => 7,
        ];
    }

    /**
     * Generate pro plan
     */
    public function pro(): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => 'pro',
            'name' => 'Préavis Pro',
            'description' => 'Plan Pro - Contrats illimités avec toutes les fonctionnalités',
            'monthly_price' => 1990,
            'yearly_price' => 19900,
            'features' => [
                'Contrats illimités',
                'Alertes email + Discord',
                'OCR avancé + IA',
                'Rapports personnalisés',
                'Support prioritaire',
                'API access',
            ],
            'limits' => [
                'contracts' => -1,
                'alerts' => -1,
                'ocr_pages' => -1,
            ]
        ]);
    }

    /**
     * Generate enterprise plan
     */
    public function enterprise(): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => 'enterprise',
            'name' => 'Préavis Enterprise',
            'description' => 'Plan Entreprise - Solution complète avec support dédié',
            'monthly_price' => 4990,
            'yearly_price' => 49900,
            'features' => [
                'Multi-organisations',
                'Contrats illimités',
                'Toutes les alertes',
                'OCR + IA avancée',
                'Tableaux de bord personnalisés',
                'Intégrations API',
                'Support téléphonique',
                'Manager de compte dédié',
            ],
            'limits' => [
                'contracts' => -1,
                'alerts' => -1,
                'ocr_pages' => -1,
                'organizations' => 5,
            ]
        ]);
    }

    /**
     * Generate with trial
     */
    public function withTrial(int $days = 7): static
    {
        return $this->state(fn (array $attributes) => [
            'trial_days' => $days,
        ]);
    }

    /**
     * Generate inactive plan
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Generate test configuration for all plans
     */
    public static function generateTestConfig(): array
    {
        return [
            'starter_monthly' => 'price_test_starter_monthly_123',
            'starter_yearly' => 'price_test_starter_yearly_123',
            'pro_monthly' => 'price_test_pro_monthly_456',
            'pro_yearly' => 'price_test_pro_yearly_456',
            'enterprise_monthly' => 'price_test_enterprise_monthly_789',
            'enterprise_yearly' => 'price_test_enterprise_yearly_789',
        ];
    }

    /**
     * Generate configuration for BillingController
     */
    public static function getBillingConfiguration(): string
    {
        $config = self::generateTestConfig();
        
        $php = "// Add to BillingController\n";
        $php .= "\$priceIds = [\n";
        
        foreach ($config as $key => $priceId) {
            $php .= "    '{$key}' => env('STRIPE_PRICE_" . strtoupper($key) . "', '{$priceId}'),\n";
        }
        
        $php .= "];\n\n";
        
        $php .= "// Add to .env\n";
        foreach ($config as $key => $priceId) {
            $envKey = 'STRIPE_PRICE_' . strtoupper($key);
            $php .= "{$envKey}={$priceId}\n";
        }
        
        return $php;
    }
}
