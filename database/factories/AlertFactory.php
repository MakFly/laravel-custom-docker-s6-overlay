<?php

namespace Database\Factories;

use App\Models\Alert;
use App\Models\Contract;
use Illuminate\Database\Eloquent\Factories\Factory;

class AlertFactory extends Factory
{
    protected $model = Alert::class;

    public function definition(): array
    {
        return [
            'contract_id' => Contract::factory(),
            'type' => $this->faker->randomElement(['renewal', 'expiry', 'custom', 'renewal_warning', 'notice_deadline', 'contract_expired']),
            'scheduled_for' => $this->faker->dateTimeBetween('now', '+3 months'),
            'status' => $this->faker->randomElement(['pending', 'sent', 'failed', 'active', 'inactive']),
            'notification_method' => $this->faker->randomElement(['email', 'sms', 'push']),
            'message' => $this->faker->sentence(),
            'last_sent_at' => null,
            'notification_channels' => ['email'],
            'trigger_days' => $this->faker->randomElement([15, 30, 60, 90]),
            'discord_webhook_url' => null,
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

    public function inactive(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'status' => 'inactive',
            ];
        });
    }

    public function withDiscord(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'notification_channels' => ['email', 'discord'],
                'discord_webhook_url' => 'https://discord.com/api/webhooks/test',
            ];
        });
    }
} 