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
        'message',
        'last_sent_at',
        'notification_channels',
        'trigger_days',
        'discord_webhook_url',
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
        'sent_at' => 'datetime',
        'last_sent_at' => 'datetime',
        'notification_channels' => 'array',
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('status', 'inactive');
    }

    public function scopeSent(Builder $query): Builder
    {
        return $query->where('status', 'sent');
    }

    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'failed');
    }

    public function scopeRenewal(Builder $query): Builder
    {
        return $query->where('type', 'renewal');
    }

    public function scopeExpiry(Builder $query): Builder
    {
        return $query->where('type', 'expiry');
    }

    public function scopeCustom(Builder $query): Builder
    {
        return $query->where('type', 'custom');
    }

    public function scopeRenewalWarning(Builder $query): Builder
    {
        return $query->where('type', 'renewal_warning');
    }

    public function scopeNoticeDeadline(Builder $query): Builder
    {
        return $query->where('type', 'notice_deadline');
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->where('scheduled_for', '<=', now())
                    ->where('status', 'pending');
    }

    public function scopeScheduledFor(Builder $query, $date): Builder
    {
        return $query->whereDate('scheduled_for', $date);
    }

    // Helper methods
    public function markAsSent(): bool
    {
        return $this->update([
            'status' => 'sent',
            'last_sent_at' => now()
        ]);
    }

    public function markAsFailed(): bool
    {
        return $this->update(['status' => 'failed']);
    }

    public function toggleStatus(): bool
    {
        $newStatus = $this->status === 'pending' ? 'sent' : 'pending';
        return $this->update(['status' => $newStatus]);
    }

    public function shouldBeSent(): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }

        if (!$this->scheduled_for || $this->scheduled_for->isFuture()) {
            return false;
        }

        // Don't send if already sent today
        if ($this->last_sent_at && $this->last_sent_at->isToday()) {
            return false;
        }

        return true;
    }

    public function getTypeLabel(): string
    {
        return match($this->type) {
            'renewal' => 'Renouvellement',
            'renewal_warning' => 'Avertissement renouvellement',
            'notice_deadline' => 'Échéance préavis',
            'contract_expired' => 'Contrat expiré',
            'expiry' => 'Expiration',
            'custom' => 'Personnalisé',
            default => 'Type inconnu'
        };
    }

    public function getStatusLabel(): string
    {
        return match($this->status) {
            'active' => 'Actif',
            'inactive' => 'Inactif',
            'pending' => 'En attente',
            'sent' => 'Envoyé',
            'failed' => 'Échec',
            default => 'Statut inconnu'
        };
    }

    public function getDynamicMessage(): string
    {
        if (!$this->contract || !$this->contract->next_renewal_date) {
            return $this->message ?? 'Alerte contrat';
        }

        $daysUntilRenewal = $this->contract->getDaysUntilRenewal() ?? 0;
        $contractTitle = $this->contract->title;

        return match($this->type) {
            'renewal_warning' => match(true) {
                $daysUntilRenewal <= 0 => "Le contrat \"{$contractTitle}\" a expiré",
                $daysUntilRenewal == 1 => "Votre contrat \"{$contractTitle}\" arrive à échéance demain",
                $daysUntilRenewal <= 7 => "Votre contrat \"{$contractTitle}\" arrive à échéance dans {$daysUntilRenewal} jours",
                $daysUntilRenewal <= 30 => "Votre contrat \"{$contractTitle}\" arrive à échéance dans {$daysUntilRenewal} jours",
                $daysUntilRenewal <= 90 => "Votre contrat \"{$contractTitle}\" arrive à échéance dans {$daysUntilRenewal} jours",
                default => "Votre contrat \"{$contractTitle}\" arrive à échéance dans {$daysUntilRenewal} jours"
            },
            'notice_deadline' => $daysUntilRenewal <= 0 
                ? "Le délai de préavis pour le contrat \"{$contractTitle}\" est dépassé"
                : "Attention ! Il reste {$daysUntilRenewal} jours pour résilier le contrat \"{$contractTitle}\" avant renouvellement automatique",
            'contract_expired' => "Le contrat \"{$contractTitle}\" a expiré",
            default => $this->message ?? 'Alerte contrat'
        };
    }
}
