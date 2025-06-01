<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Contract;
use App\Models\Org;

class ContractFactory extends Factory
{
    protected $model = Contract::class;

    public function definition(): array
    {
        return [
            'org_id' => Org::factory(),
            'user_id' => function (array $attributes) {
                return \App\Models\User::factory(['org_id' => $attributes['org_id']]);
            },
            'title' => $this->faker->sentence(3),
            'type' => $this->faker->randomElement(['pro', 'perso']),
            'status' => $this->faker->randomElement(['active', 'expired', 'cancelled']),
            'category' => $this->faker->randomElement(['software', 'hosting', 'insurance', 'autre']),
            'start_date' => $this->faker->date(),
            'end_date' => $this->faker->optional()->date(),
            'next_renewal_date' => $this->faker->optional()->dateTimeBetween('now', '+1 year'),
            'is_tacit_renewal' => $this->faker->boolean(),
            'notice_period_days' => $this->faker->numberBetween(1, 90),
            'amount_cents' => $this->faker->numberBetween(1000, 100000),
            'currency' => 'EUR',
            'file_path' => 'contracts/test/' . $this->faker->uuid . '.pdf',
            'file_original_name' => $this->faker->word . '.pdf',
            'ai_analysis' => [],
            'ocr_status' => $this->faker->randomElement(['pending', 'completed', 'failed']),
            'ai_status' => $this->faker->randomElement(['pending', 'completed', 'failed']),
        ];
    }

    public function active(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'active',
            ];
        });
    }

    public function expiring(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'active',
                'next_renewal_date' => now()->addDays(15),
                'is_tacit_renewal' => true,
            ];
        });
    }
} 