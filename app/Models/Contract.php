<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrg;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Contract extends Model
{
    use HasFactory, BelongsToOrg;

    protected $fillable = [
        'org_id', 'user_id', 'title', 'type', 'category', 'file_path',
        'file_original_name', 'amount_cents', 'currency',
        'start_date', 'end_date', 'notice_period_days',
        'is_tacit_renewal', 'next_renewal_date', 'status',
        'ocr_status', 'ai_status', 'ocr_raw_text', 'ai_analysis', 'ocr_metadata'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'next_renewal_date' => 'date',
        'is_tacit_renewal' => 'boolean',
        'amount_cents' => 'integer',
        'ai_analysis' => 'array',
        'ocr_metadata' => 'array',
    ];

    // Relations
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function clauses(): HasMany
    {
        return $this->hasMany(ContractClause::class);
    }

    // Accessors
    public function getAmountAttribute(): float
    {
        return $this->amount_cents / 100;
    }

    public function getIsExpiringAttribute(): bool
    {
        return $this->next_renewal_date && 
               $this->next_renewal_date->diffInDays(now()) <= 30;
    }

    public function getAlertsCountAttribute(): int
    {
        return $this->alerts()->where('status', 'pending')->count();
    }

    // Mutators
    public function setAmountAttribute($value): void
    {
        $this->attributes['amount_cents'] = $value * 100;
    }

    // Scopes
    public function scopeProfessional(Builder $query): Builder
    {
        return $query->where('type', 'pro');
    }

    public function scopePersonal(Builder $query): Builder
    {
        return $query->where('type', 'perso');
    }

    public function scopeWithTacitRenewal(Builder $query): Builder
    {
        return $query->where('is_tacit_renewal', true);
    }

    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->where('next_renewal_date', '<=', now()->addDays($days))
                    ->where('next_renewal_date', '>=', now())
                    ->where('status', 'active');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    // Helper methods
    public function needsAlert(): bool
    {
        if (!$this->is_tacit_renewal || !$this->next_renewal_date) {
            return false;
        }

        $daysUntilRenewal = $this->next_renewal_date->diffInDays(now());
        return in_array($daysUntilRenewal, [90, 30, 7, 1]);
    }

    public function getAlertType(): ?string
    {
        if (!$this->is_tacit_renewal || !$this->next_renewal_date) {
            return null;
        }

        $daysUntilRenewal = $this->next_renewal_date->diffInDays(now());
        
        return match (true) {
            $daysUntilRenewal <= 1 => 'contract_expired',
            $daysUntilRenewal <= 7 => 'notice_deadline',
            $daysUntilRenewal <= 90 => 'renewal_warning',
            default => null
        };
    }

    public function getDaysUntilRenewal(): ?int
    {
        if (!$this->next_renewal_date) {
            return null;
        }

        return max(0, $this->next_renewal_date->diffInDays(now()));
    }

    public function getStatusColor(): string
    {
        return match($this->status) {
            'active' => $this->getIsExpiringAttribute() ? 'red' : 'green',
            'expired' => 'red',
            'cancelled' => 'gray',
            default => 'gray'
        };
    }
}
