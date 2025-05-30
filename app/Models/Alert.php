<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id',
        'type',
        'scheduled_for',
        'sent_at',
        'status',
        'notification_method',
        'message'
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
        'sent_at' => 'datetime',
    ];

    // Relations
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    // Scopes
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeSent(Builder $query): Builder
    {
        return $query->where('status', 'sent');
    }

    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'failed');
    }

    public function scopeRenewalWarning(Builder $query): Builder
    {
        return $query->where('type', 'renewal_warning');
    }

    public function scopeNoticeDeadline(Builder $query): Builder
    {
        return $query->where('type', 'notice_deadline');
    }

    public function scopeContractExpired(Builder $query): Builder
    {
        return $query->where('type', 'contract_expired');
    }

    public function scopeScheduledFor(Builder $query, $date): Builder
    {
        return $query->whereDate('scheduled_for', $date);
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->where('scheduled_for', '<=', now())
                    ->where('status', 'pending');
    }

    // Helper methods
    public function markAsSent(): bool
    {
        return $this->update([
            'status' => 'sent',
            'sent_at' => now()
        ]);
    }

    public function markAsFailed(): bool
    {
        return $this->update(['status' => 'failed']);
    }

    public function getTypeLabel(): string
    {
        return match($this->type) {
            'renewal_warning' => 'Avertissement de renouvellement',
            'notice_deadline' => 'Échéance de préavis',
            'contract_expired' => 'Contrat expiré',
            default => 'Type inconnu'
        };
    }

    public function getStatusLabel(): string
    {
        return match($this->status) {
            'pending' => 'En attente',
            'sent' => 'Envoyé',
            'failed' => 'Échec',
            default => 'Statut inconnu'
        };
    }
}
