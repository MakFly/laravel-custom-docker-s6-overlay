<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, Billable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'org_id',
        'role',
        'phone',
        'notification_preferences',
        'subscription_plan',
        'ai_credits_remaining',
        'ai_credits_monthly_limit',
        'ai_credits_purchased',
        'credits_reset_date',
        'ai_credits_used_this_month',
        'ai_credits_total_used',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_preferences' => 'array',
            'credits_reset_date' => 'date',
        ];
    }

    // Relations
    public function org(): BelongsTo
    {
        return $this->belongsTo(Org::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    // Helper methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    public function isViewer(): bool
    {
        return $this->role === 'viewer';
    }

    public function canManageUsers(): bool
    {
        return $this->role === 'admin';
    }

    public function canCreateContracts(): bool
    {
        return in_array($this->role, ['admin', 'user']);
    }

    public function canDeleteContracts(): bool
    {
        return $this->role === 'admin';
    }

    // Gestion des crédits IA
    public function hasAiCredits(): bool
    {
        $this->checkAndResetMonthlyCredits();
        return $this->ai_credits_remaining > 0;
    }

    public function consumeAiCredit(): bool
    {
        $this->checkAndResetMonthlyCredits();
        
        if ($this->ai_credits_remaining <= 0) {
            return false;
        }

        $this->decrement('ai_credits_remaining');
        $this->increment('ai_credits_used_this_month');
        $this->increment('ai_credits_total_used');
        
        return true;
    }

    public function getAiCreditsInfo(): array
    {
        $this->checkAndResetMonthlyCredits();
        
        return [
            'remaining' => $this->ai_credits_remaining,
            'monthly_limit' => $this->ai_credits_monthly_limit,
            'used_this_month' => $this->ai_credits_used_this_month,
            'total_used' => $this->ai_credits_total_used,
            'purchased' => $this->ai_credits_purchased,
            'subscription_plan' => $this->subscription_plan,
            'reset_date' => $this->credits_reset_date,
        ];
    }

    public function upgradeSubscription(string $plan): void
    {
        $this->subscription_plan = $plan;
        $this->ai_credits_monthly_limit = $plan === 'premium' ? 30 : 10;
        
        // Reset immédiat avec la nouvelle limite
        $this->resetMonthlyCredits();
        $this->save();
    }

    public function purchaseCredits(int $amount): void
    {
        $this->ai_credits_purchased += $amount;
        $this->ai_credits_remaining += $amount;
        $this->save();
    }

    private function checkAndResetMonthlyCredits(): void
    {
        if (now()->gte($this->credits_reset_date)) {
            $this->resetMonthlyCredits();
        }
    }

    private function resetMonthlyCredits(): void
    {
        $this->ai_credits_remaining = $this->ai_credits_monthly_limit + $this->ai_credits_purchased;
        $this->ai_credits_used_this_month = 0;
        $this->credits_reset_date = now()->addMonth()->startOfMonth();
        $this->save();
    }

    public function isPremium(): bool
    {
        return $this->subscription_plan === 'premium';
    }

    public function isBasic(): bool
    {
        return $this->subscription_plan === 'basic';
    }
}
