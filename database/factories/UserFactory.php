<?php

namespace Database\Factories;

use App\Models\Org;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'org_id' => Org::factory(),
            'role' => fake()->randomElement(['admin', 'user', 'viewer']),
            'phone' => fake()->optional()->phoneNumber(),
            'notification_preferences' => [
                'email' => true,
                'sms' => fake()->boolean(),
                'push' => fake()->boolean(),
            ],
        ];
    }

    /**
     * Create a user with admin role.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }

    /**
     * Create a user with user role.
     */
    public function user(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'user',
        ]);
    }

    /**
     * Create a user with viewer role.
     */
    public function viewer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'viewer',
        ]);
    }

    /**
     * Create a user for a specific organization.
     */
    public function forOrg(Org $org): static
    {
        return $this->state(fn (array $attributes) => [
            'org_id' => $org->id,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
