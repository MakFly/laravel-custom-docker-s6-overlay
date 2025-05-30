<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlertResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'type_label' => $this->getTypeLabel(),
            'status' => $this->status,
            'status_label' => $this->getStatusLabel(),
            'notification_method' => $this->notification_method,
            'message' => $this->message,
            
            // Dates
            'scheduled_for' => $this->scheduled_for->format('Y-m-d H:i:s'),
            'scheduled_for_human' => $this->scheduled_for->diffForHumans(),
            'sent_at' => $this->sent_at?->format('Y-m-d H:i:s'),
            
            // Status indicators
            'is_due' => $this->scheduled_for->isPast() && $this->status === 'pending',
            'is_today' => $this->scheduled_for->isToday(),
            'is_this_week' => $this->scheduled_for->isCurrentWeek(),
            'days_until' => max(0, $this->scheduled_for->diffInDays(now(), false)),
            
            // Contract info
            'contract' => $this->whenLoaded('contract', function() {
                return [
                    'id' => $this->contract->id,
                    'title' => $this->contract->title,
                    'type' => $this->contract->type,
                    'next_renewal_date' => $this->contract->next_renewal_date?->format('Y-m-d'),
                ];
            }),
            
            // Timestamps
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            
            // Actions
            'can_dismiss' => $this->status === 'pending',
            'can_snooze' => $this->status === 'pending',
        ];
    }
}
