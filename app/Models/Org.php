<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Cashier\Billable;

class Org extends Model
{
    use HasFactory, Billable;

    protected $fillable = [
        'name',
        'slug',
        'status',
        'settings',
        'subscription_plan',
        'trial_ends_at'
    ];

    protected $casts = [
        'settings' => 'array',
        'trial_ends_at' => 'datetime'
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    // Méthodes Cashier pour Stripe
    public function stripeName(): string
    {
        return $this->name;
    }

    public function stripeEmail(): ?string
    {
        return $this->users()->where('role', 'admin')->first()?->email;
    }

    // Helper methods
    public function isOnTrial(): bool
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscribed('default') || $this->isOnTrial();
    }

    public function getContractsCount(): int
    {
        return $this->contracts()->count();
    }

    public function getUsersCount(): int
    {
        return $this->users()->count();
    }
}
