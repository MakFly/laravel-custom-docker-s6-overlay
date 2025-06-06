<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrg;
use App\Models\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Contract extends Model
{
    use HasFactory, BelongsToOrg, Auditable;

    protected $fillable = [
        'org_id', 'user_id', 'title', 'type', 'category', 'file_path',
        'file_original_name', 'amount_cents', 'currency',
        'start_date', 'end_date', 'notice_period_days',
        'is_tacit_renewal', 'next_renewal_date', 'status',
        'ocr_status', 'ai_status', 'ocr_raw_text', 'ai_analysis',
        'ai_analysis_cached', 'ai_analysis_cached_at', 'processing_mode',
        'pattern_analysis_result', 'tacit_renewal_detected_by_pattern', 'pattern_confidence_score',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'next_renewal_date' => 'date',
        'is_tacit_renewal' => 'boolean',
        'amount_cents' => 'integer',
        'ai_analysis' => 'array',
        'ocr_metadata' => 'array',
        'ai_analysis_cached' => 'array',
        'ai_analysis_cached_at' => 'datetime',
        'pattern_analysis_result' => 'array',
        'tacit_renewal_detected_by_pattern' => 'boolean',
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

        // Si le contrat est déjà expiré, pas besoin d'alerte future
        if ($this->next_renewal_date->isPast()) {
            return true; // Pour créer l'alerte d'expiration
        }

        $daysUntilRenewal = $this->next_renewal_date->diffInDays(now());
        return in_array($daysUntilRenewal, [90, 30, 7, 1]);
    }

    public function getAlertType(): ?string
    {
        if (!$this->is_tacit_renewal || !$this->next_renewal_date) {
            return null;
        }

        // Si le contrat est déjà expiré
        if ($this->next_renewal_date->isPast()) {
            return 'contract_expired';
        }

        $daysUntilRenewal = $this->next_renewal_date->diffInDays(now());
        
        return match (true) {
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

        // Si le contrat est expiré, retourner 0
        if ($this->next_renewal_date->isPast()) {
            return 0;
        }

        // Pour les dates futures, utiliser now() comme référence
        return (int) now()->diffInDays($this->next_renewal_date);
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

    // Gestion de l'analyse IA cachée
    public function hasValidCachedAiAnalysis(): bool
    {
        return !empty($this->ai_analysis_cached) && 
               $this->ai_analysis_cached_at && 
               $this->ai_analysis_cached_at->isAfter(now()->subDays(30)); // Cache valide 30 jours
    }

    public function getCachedOrFreshAiAnalysis(): ?array
    {
        // Si on a une analyse cachée valide, la retourner
        if ($this->hasValidCachedAiAnalysis()) {
            return $this->ai_analysis_cached;
        }

        // Sinon retourner l'analyse temporaire (si elle existe)
        return $this->ai_analysis;
    }

    public function cacheAiAnalysis(array $analysis): void
    {
        $this->update([
            'ai_analysis_cached' => $analysis,
            'ai_analysis_cached_at' => now(),
            'ai_analysis' => $analysis, // Garder aussi dans l'ancien champ pour compatibilité
        ]);
    }

    public function invalidateAiCache(): void
    {
        $this->update([
            'ai_analysis_cached' => null,
            'ai_analysis_cached_at' => null,
            'ai_analysis' => null,
        ]);
    }

    // Gestion du traitement pattern-only vs AI-enhanced
    public function isPatternOnlyMode(): bool
    {
        return $this->processing_mode === 'pattern_only';
    }

    public function isAiEnhancedMode(): bool
    {
        return $this->processing_mode === 'ai_enhanced';
    }

    public function setProcessingMode(string $mode): void
    {
        $this->update(['processing_mode' => $mode]);
    }

    // Gestion des résultats de pattern matching
    public function updatePatternAnalysis(array $patternResult, bool $tacitRenewalDetected, float $confidence): void
    {
        $this->update([
            'pattern_analysis_result' => $patternResult,
            'tacit_renewal_detected_by_pattern' => $tacitRenewalDetected,
            'pattern_confidence_score' => $confidence,
        ]);
    }

    public function getTacitRenewalInfo(): array
    {
        // Si on a une analyse IA cachée, l'utiliser en priorité
        if ($this->hasValidCachedAiAnalysis() && !empty($this->ai_analysis_cached['reconduction_tacite'])) {
            return [
                'detected' => $this->ai_analysis_cached['reconduction_tacite'] ?? false,
                'source' => 'ai_enhanced',
                'confidence' => 0.9, // L'IA a généralement une haute confiance
                'details' => $this->ai_analysis_cached
            ];
        }

        // Sinon utiliser l'analyse par pattern matching
        return [
            'detected' => $this->tacit_renewal_detected_by_pattern,
            'source' => 'pattern_only',
            'confidence' => $this->pattern_confidence_score,
            'details' => $this->pattern_analysis_result
        ];
    }
}
