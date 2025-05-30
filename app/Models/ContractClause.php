<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class ContractClause extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id',
        'type',
        'content',
        'ai_confidence_score',
        'is_validated'
    ];

    protected $casts = [
        'ai_confidence_score' => 'float',
        'is_validated' => 'boolean',
    ];

    // Relations
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    // Scopes
    public function scopeRenewal(Builder $query): Builder
    {
        return $query->where('type', 'renewal');
    }

    public function scopeTermination(Builder $query): Builder
    {
        return $query->where('type', 'termination');
    }

    public function scopePriceChange(Builder $query): Builder
    {
        return $query->where('type', 'price_change');
    }

    public function scopeValidated(Builder $query): Builder
    {
        return $query->where('is_validated', true);
    }

    public function scopeUnvalidated(Builder $query): Builder
    {
        return $query->where('is_validated', false);
    }

    public function scopeHighConfidence(Builder $query, float $threshold = 0.8): Builder
    {
        return $query->where('ai_confidence_score', '>=', $threshold);
    }

    public function scopeLowConfidence(Builder $query, float $threshold = 0.5): Builder
    {
        return $query->where('ai_confidence_score', '<', $threshold);
    }

    // Helper methods
    public function validate(): bool
    {
        return $this->update(['is_validated' => true]);
    }

    public function reject(): bool
    {
        return $this->update(['is_validated' => false]);
    }

    public function isHighConfidence(float $threshold = 0.8): bool
    {
        return $this->ai_confidence_score >= $threshold;
    }

    public function getTypeLabel(): string
    {
        return match($this->type) {
            'renewal' => 'Renouvellement',
            'termination' => 'Résiliation',
            'price_change' => 'Changement de prix',
            'other' => 'Autre',
            default => 'Type inconnu'
        };
    }

    public function getConfidenceLabel(): string
    {
        return match (true) {
            $this->ai_confidence_score >= 0.9 => 'Très élevée',
            $this->ai_confidence_score >= 0.7 => 'Élevée',
            $this->ai_confidence_score >= 0.5 => 'Moyenne',
            $this->ai_confidence_score >= 0.3 => 'Faible',
            default => 'Très faible'
        };
    }

    public function getConfidenceColor(): string
    {
        return match (true) {
            $this->ai_confidence_score >= 0.8 => 'green',
            $this->ai_confidence_score >= 0.6 => 'yellow',
            default => 'red'
        };
    }
}
