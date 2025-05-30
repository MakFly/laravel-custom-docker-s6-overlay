<?php

namespace App\Models\Traits;

use App\Models\Org;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToOrg
{
    protected static function bootBelongsToOrg()
    {
        // Ajouter automatiquement org_id lors de la création
        static::creating(function ($model) {
            if (!$model->org_id && auth()->user()) {
                $model->org_id = auth()->user()->org_id;
            }
        });

        // Filtrer automatiquement par org_id
        static::addGlobalScope('org', function (Builder $builder) {
            if (auth()->user()) {
                $builder->where($builder->getModel()->getTable() . '.org_id', auth()->user()->org_id);
            }
        });
    }

    public function org(): BelongsTo
    {
        return $this->belongsTo(Org::class);
    }

    /**
     * Scope pour bypasser le filtre org (pour les admins système)
     */
    public function scopeWithoutOrgScope(Builder $query): Builder
    {
        return $query->withoutGlobalScope('org');
    }

    /**
     * Scope pour filtrer par une organisation spécifique
     */
    public function scopeForOrg(Builder $query, int $orgId): Builder
    {
        return $query->withoutGlobalScope('org')->where('org_id', $orgId);
    }
} 