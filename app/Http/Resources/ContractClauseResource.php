<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContractClauseResource extends JsonResource
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
            'content' => $this->content,
            'ai_confidence_score' => $this->ai_confidence_score,
            'confidence_label' => $this->getConfidenceLabel(),
            'confidence_color' => $this->getConfidenceColor(),
            'is_validated' => $this->is_validated,
            'is_high_confidence' => $this->isHighConfidence(),
            
            // Contract relation
            'contract_id' => $this->contract_id,
            'contract' => $this->whenLoaded('contract', function() {
                return [
                    'id' => $this->contract->id,
                    'title' => $this->contract->title,
                    'type' => $this->contract->type,
                ];
            }),
            
            // Timestamps
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
            
            // Actions
            'can_validate' => !$this->is_validated,
            'can_reject' => $this->is_validated,
        ];
    }
}
