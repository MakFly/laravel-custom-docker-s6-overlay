<?php

namespace App\Models\Traits;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait Auditable
{
    protected static function bootAuditable(): void
    {
        // Log creation
        static::created(function ($model) {
            AuditLog::createEntry(
                'created',
                $model,
                null,
                $model->getAttributes(),
                ['context' => 'model_created']
            );
        });

        // Log updates
        static::updated(function ($model) {
            $changes = $model->getChanges();
            $original = [];
            
            foreach (array_keys($changes) as $key) {
                $original[$key] = $model->getOriginal($key);
            }

            AuditLog::createEntry(
                'updated',
                $model,
                $original,
                $changes,
                ['context' => 'model_updated']
            );
        });

        // Log deletion
        static::deleted(function ($model) {
            AuditLog::createEntry(
                'deleted',
                $model,
                $model->getAttributes(),
                null,
                ['context' => 'model_deleted']
            );
        });
    }

    /**
     * Get all audit logs for this model
     */
    public function auditLogs(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')
            ->orderBy('created_at', 'desc');
    }

    /**
     * Log a custom event for this model
     */
    public function logEvent(string $event, ?array $metadata = null): AuditLog
    {
        return AuditLog::createEntry(
            $event,
            $this,
            null,
            null,
            array_merge(['context' => 'custom_event'], $metadata ?? [])
        );
    }

    /**
     * Log a view event (when someone accesses the model)
     */
    public function logView(?array $metadata = null): AuditLog
    {
        return $this->logEvent('viewed', $metadata);
    }

    /**
     * Log a download event (when someone downloads related files)
     */
    public function logDownload(string $filename, ?array $metadata = null): AuditLog
    {
        return $this->logEvent('downloaded', array_merge(
            ['filename' => $filename],
            $metadata ?? []
        ));
    }
}