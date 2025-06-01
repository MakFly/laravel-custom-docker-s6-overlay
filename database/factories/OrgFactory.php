<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Org>
 */
class OrgFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company();
        
        return [
            'name' => $name,
            'slug' => Str::slug($name) . '-' . fake()->randomNumber(4),
            'status' => 'active',
            'settings' => [
                'timezone' => fake()->timezone(),
                'language' => fake()->randomElement(['fr', 'en']),
                'notifications' => [
                    'email' => true,
                    'sms' => fake()->boolean(),
                ],
                'contracts_limit' => fake()->randomElement([50, 200, -1]),
                'users_limit' => fake()->randomElement([3, 10, -1]),
                'subscription_plan' => fake()->randomElement(['starter', 'pro', 'premium', 'enterprise']),
            ],
            'trial_ends_at' => fake()->optional()->dateTimeBetween('now', '+30 days'),
        ];
    }

    /**
     * Create an organization with trial period.
     */
    public function withTrial(): static
    {
        return $this->state(fn (array $attributes) => [
            'trial_ends_at' => now()->addDays(14),
        ]);
    }

    /**
     * Create an organization without trial.
     */
    public function withoutTrial(): static
    {
        return $this->state(fn (array $attributes) => [
            'trial_ends_at' => null,
        ]);
    }

    /**
     * Create an organization with specific settings.
     */
    public function withSettings(array $settings): static
    {
        return $this->state(fn (array $attributes) => [
            'settings' => array_merge($attributes['settings'] ?? [], $settings),
        ]);
    }
} 