<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContractResource extends JsonResource
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
            'title' => $this->title,
            'type' => $this->type,
            'category' => $this->category,
            'file_original_name' => $this->file_original_name,
            
            // Financial data
            'amount' => $this->amount, // Uses accessor to convert cents to euros
            'currency' => $this->currency,
            
            // Dates
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'next_renewal_date' => $this->next_renewal_date?->format('Y-m-d'),
            'notice_period_days' => $this->notice_period_days,
            
            // Status
            'status' => $this->status,
            'status_color' => $this->getStatusColor(),
            'is_tacit_renewal' => $this->is_tacit_renewal,
            'is_expiring' => $this->is_expiring, // Uses accessor
            'days_until_renewal' => $this->getDaysUntilRenewal(),
            
            // OCR and AI
            'ocr_status' => $this->ocr_status,
            'ai_status' => $this->ai_status ?? 'pending', // Assurer qu'il y a toujours une valeur
            'has_ocr_text' => !empty($this->ocr_raw_text),
            'ocr_text_length' => $this->ocr_raw_text ? strlen($this->ocr_raw_text) : 0,
            'has_ai_analysis' => !empty($this->ai_analysis),
            'ai_analysis' => $this->ai_analysis,
            
            // Computed attributes
            'alerts_count' => $this->whenLoaded('alerts', function() {
                return $this->alerts->where('status', 'pending')->count();
            }),
            'alert_type' => $this->getAlertType(),
            'needs_alert' => $this->needsAlert(),
            
            // Timestamps
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            
            // Related data when loaded
            'user' => $this->whenLoaded('user', function() {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
            
            'alerts' => AlertResource::collection($this->whenLoaded('alerts')),
            'clauses' => ContractClauseResource::collection($this->whenLoaded('clauses')),
            
            // Links for actions
            'links' => [
                'self' => route('api.contracts.show', $this->id),
                'download' => route('api.contracts.download', $this->id),
                'view' => route('api.contracts.view', $this->id),
                'reprocess' => route('api.contracts.reprocess', $this->id),
                'analysis' => route('api.contracts.analysis', $this->id),
                'ocr_text' => route('api.contracts.ocr-text', $this->id),
            ],
        ];
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'version' => '1.0',
                'timestamp' => now()->toISOString(),
            ],
        ];
    }
}
