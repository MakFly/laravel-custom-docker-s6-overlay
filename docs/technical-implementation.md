# Guide d'Implémentation Technique - Contract-Tacit

## Architecture Laravel + React

### Structure Backend Laravel

#### Configuration des Packages

```bash
# Packages Laravel essentiels
composer require laravel/sanctum
composer require spatie/laravel-permission
composer require spatie/pdf-to-image
composer require thiagoalessio/tesseract-ocr-for-php
composer require openai-php/laravel
composer require intervention/image
composer require spatie/laravel-query-builder
composer require laravel/horizon

# Packages dev
composer require --dev laravel/telescope
composer require --dev laravel/pint
```

#### Modèles Eloquent

```php
// app/Models/Contract.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\QueryBuilder\AllowedFilter;

class Contract extends Model
{
    protected $fillable = [
        'user_id', 'title', 'type', 'category', 'file_path',
        'file_original_name', 'amount_cents', 'currency',
        'start_date', 'end_date', 'notice_period_days',
        'is_tacit_renewal', 'next_renewal_date', 'status',
        'ocr_status', 'ocr_raw_text', 'ai_analysis'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'next_renewal_date' => 'date',
        'is_tacit_renewal' => 'boolean',
        'amount_cents' => 'integer',
        'ai_analysis' => 'array',
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

    // Scopes
    public function scopeProfessional($query)
    {
        return $query->where('type', 'pro');
    }

    public function scopePersonal($query)
    {
        return $query->where('type', 'perso');
    }

    public function scopeWithTacitRenewal($query)
    {
        return $query->where('is_tacit_renewal', true);
    }
}
```

#### Jobs de Traitement

```php
// app/Jobs/ProcessContractOCR.php
<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Services\OCRService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessContractOCR implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Contract $contract
    ) {}

    public function handle(OCRService $ocrService): void
    {
        try {
            $this->contract->update(['ocr_status' => 'processing']);

            $ocrText = $ocrService->extractText($this->contract->file_path);
            
            $this->contract->update([
                'ocr_status' => 'completed',
                'ocr_raw_text' => $ocrText
            ]);

            // Déclencher l'analyse IA
            AnalyzeContractWithAI::dispatch($this->contract);

        } catch (\Exception $e) {
            $this->contract->update(['ocr_status' => 'failed']);
            throw $e;
        }
    }
}

// app/Jobs/AnalyzeContractWithAI.php
<?php

namespace App\Jobs;

use App\Models\Contract;
use App\Services\OpenAIService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class AnalyzeContractWithAI implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Contract $contract
    ) {}

    public function handle(OpenAIService $aiService): void
    {
        if (!$this->contract->ocr_raw_text) {
            return;
        }

        $analysis = $aiService->analyzeContract($this->contract->ocr_raw_text);
        
        $this->contract->update(['ai_analysis' => $analysis]);

        // Créer les alertes basées sur l'analyse
        CreateContractAlerts::dispatch($this->contract);
    }
}
```

#### Services

```php
// app/Services/OCRService.php
<?php

namespace App\Services;

use Intervention\Image\ImageManagerStatic as Image;
use Spatie\PdfToImage\Pdf;
use thiagoalessio\TesseractOCR\TesseractOCR;

class OCRService
{
    public function extractText(string $filePath): string
    {
        $fullPath = storage_path('app/' . $filePath);
        $extension = pathinfo($fullPath, PATHINFO_EXTENSION);

        if (strtolower($extension) === 'pdf') {
            return $this->extractFromPdf($fullPath);
        }

        return $this->extractFromImage($fullPath);
    }

    private function extractFromPdf(string $pdfPath): string
    {
        $pdf = new Pdf($pdfPath);
        $totalPages = $pdf->getNumberOfPages();
        $allText = '';

        for ($page = 1; $page <= min($totalPages, 10); $page++) {
            $imagePath = storage_path("app/temp/page-{$page}.jpg");
            
            $pdf->setPage($page)
                ->setOutputFormat('jpg')
                ->setCompressionQuality(90)
                ->saveImage($imagePath);

            $pageText = $this->extractFromImage($imagePath);
            $allText .= $pageText . "\n\n";

            unlink($imagePath); // Nettoyer
        }

        return trim($allText);
    }

    private function extractFromImage(string $imagePath): string
    {
        // Préprocessing de l'image pour améliorer l'OCR
        $image = Image::make($imagePath);
        
        // Augmenter le contraste et la netteté
        $image->contrast(15)
              ->sharpen(10)
              ->greyscale();

        $processedPath = storage_path('app/temp/processed-' . basename($imagePath));
        $image->save($processedPath);

        try {
            $ocr = new TesseractOCR($processedPath);
            $text = $ocr->lang('fra', 'eng')
                       ->configFile('pdf')
                       ->run();

            unlink($processedPath); // Nettoyer

            return $this->cleanText($text);
        } catch (\Exception $e) {
            if (file_exists($processedPath)) {
                unlink($processedPath);
            }
            throw $e;
        }
    }

    private function cleanText(string $text): string
    {
        // Nettoyer le texte OCR
        $text = preg_replace('/\s+/', ' ', $text); // Normaliser espaces
        $text = preg_replace('/[^\p{L}\p{N}\s\-.,;:!?()\[\]]/u', '', $text);
        
        return trim($text);
    }
}

// app/Services/OpenAIService.php
<?php

namespace App\Services;

use OpenAI\Laravel\Facades\OpenAI;

class OpenAIService
{
    public function analyzeContract(string $contractText): array
    {
        $prompt = $this->buildAnalysisPrompt($contractText);

        $response = OpenAI::chat()->create([
            'model' => config('openai.model', 'gpt-4'),
            'messages' => [
                ['role' => 'system', 'content' => $this->getSystemPrompt()],
                ['role' => 'user', 'content' => $prompt]
            ],
            'temperature' => 0.1,
            'max_tokens' => 2000,
        ]);

        $content = $response->choices[0]->message->content;
        
        try {
            return json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            // Fallback en cas d'erreur de parsing
            return $this->parseUnstructuredResponse($content);
        }
    }

    private function getSystemPrompt(): string
    {
        return "Tu es un expert en analyse de contrats. Analyse le contrat fourni et extrais les informations clés au format JSON strict. Concentre-toi particulièrement sur les clauses de reconduction tacite et les conditions de résiliation.";
    }

    private function buildAnalysisPrompt(string $contractText): string
    {
        return "Analyse ce contrat et retourne un JSON avec ces champs exacts :
{
  \"type_contrat\": \"string (assurance/telecom/energie/autre)\",
  \"reconduction_tacite\": boolean,
  \"duree_engagement\": \"string\",
  \"preavis_resiliation_jours\": number,
  \"date_debut\": \"YYYY-MM-DD ou null\",
  \"date_fin\": \"YYYY-MM-DD ou null\",
  \"montant\": number,
  \"frequence_paiement\": \"string (mensuel/annuel/autre)\",
  \"conditions_resiliation\": [\"array de strings\"],
  \"clauses_importantes\": [\"array de strings\"],
  \"confidence_score\": number (0-1)
}

Contrat à analyser :
" . substr($contractText, 0, 8000); // Limiter la taille
    }

    private function parseUnstructuredResponse(string $content): array
    {
        // Parsing de secours si l'IA ne retourne pas du JSON valide
        return [
            'type_contrat' => 'autre',
            'reconduction_tacite' => false,
            'confidence_score' => 0.1,
            'raw_response' => $content
        ];
    }
}
```

#### Controllers API

```php
// app/Http/Controllers/Api/ContractController.php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContractRequest;
use App\Http\Resources\ContractResource;
use App\Jobs\ProcessContractOCR;
use App\Models\Contract;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ContractController extends Controller
{
    public function index(Request $request)
    {
        $contracts = QueryBuilder::for(Contract::class)
            ->allowedFilters([
                'type',
                'category',
                'status',
                AllowedFilter::exact('is_tacit_renewal'),
                AllowedFilter::scope('expiring_soon'),
            ])
            ->allowedSorts(['created_at', 'next_renewal_date', 'title'])
            ->where('user_id', $request->user()->id)
            ->with(['alerts' => function($query) {
                $query->where('status', 'pending');
            }])
            ->paginate($request->get('per_page', 15));

        return ContractResource::collection($contracts);
    }

    public function store(StoreContractRequest $request)
    {
        $file = $request->file('contract_file');
        $filePath = $file->store('contracts/' . $request->user()->id, 'private');

        $contract = Contract::create([
            'user_id' => $request->user()->id,
            'title' => $request->title ?? $file->getClientOriginalName(),
            'type' => $request->type,
            'category' => $request->category,
            'file_path' => $filePath,
            'file_original_name' => $file->getClientOriginalName(),
            'status' => 'active',
            'ocr_status' => 'pending',
        ]);

        // Lancer le traitement OCR en arrière-plan
        ProcessContractOCR::dispatch($contract);

        return new ContractResource($contract);
    }

    public function show(Contract $contract)
    {
        $this->authorize('view', $contract);
        
        return new ContractResource($contract->load(['alerts', 'clauses']));
    }

    public function reprocess(Contract $contract)
    {
        $this->authorize('update', $contract);
        
        $contract->update(['ocr_status' => 'pending']);
        ProcessContractOCR::dispatch($contract);

        return response()->json(['message' => 'Reprocessing started']);
    }
}
```

### Frontend React + TypeScript

#### Configuration React

```bash
# Installation des dépendances React
npm install react react-dom typescript @types/react @types/react-dom
npm install @tanstack/react-query axios
npm install @headlessui/react @heroicons/react
npm install react-router-dom
npm install react-hook-form @hookform/resolvers zod
npm install react-dropzone
npm install date-fns
npm install @tailwindcss/forms
```

#### Types TypeScript

```typescript
// resources/js/types/contract.ts
export interface Contract {
  id: number;
  title: string;
  type: 'pro' | 'perso';
  category: string;
  file_original_name: string;
  amount: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  notice_period_days: number;
  is_tacit_renewal: boolean;
  next_renewal_date?: string;
  status: 'active' | 'expired' | 'cancelled';
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
  is_expiring: boolean;
  ai_analysis?: ContractAnalysis;
  alerts_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContractAnalysis {
  type_contrat: string;
  reconduction_tacite: boolean;
  duree_engagement: string;
  preavis_resiliation_jours: number;
  date_debut?: string;
  date_fin?: string;
  montant: number;
  frequence_paiement: string;
  conditions_resiliation: string[];
  clauses_importantes: string[];
  confidence_score: number;
}

export interface Alert {
  id: number;
  contract_id: number;
  type: 'renewal_warning' | 'notice_deadline' | 'contract_expired';
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  notification_method: 'email' | 'sms' | 'push';
  message: string;
  contract: Contract;
}
```

#### Hooks React Query

```typescript
// resources/js/hooks/useContracts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractApi } from '../services/api';
import type { Contract, ContractFilters } from '../types/contract';

export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => contractApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useContract(id: number) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractApi.getById(id),
    enabled: !!id,
  });
}

export function useUploadContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: contractApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useReprocessContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id }: { id: number }) => contractApi.reprocess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', variables.id] });
    },
  });
}
```

#### Composants React

```tsx
// resources/js/components/ContractCard.tsx
import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';
import type { Contract } from '../types/contract';

interface ContractCardProps {
  contract: Contract;
  onClick: () => void;
}

export function ContractCard({ contract, onClick }: ContractCardProps) {
  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOcrStatusIcon = (status: Contract['ocr_status']) => {
    switch (status) {
      case 'completed':
        return <DocumentTextIcon className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div 
      className={`
        bg-white rounded-lg shadow-md p-6 cursor-pointer 
        transition-all hover:shadow-lg border-l-4
        ${contract.is_expiring ? 'border-l-red-500' : 'border-l-blue-500'}
      `}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {contract.title}
          </h3>
          <p className="text-sm text-gray-600">
            {contract.category} • {contract.type === 'pro' ? 'Professionnel' : 'Personnel'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {getOcrStatusIcon(contract.ocr_status)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
            {contract.status}
          </span>
        </div>
      </div>

      {contract.amount > 0 && (
        <p className="text-lg font-bold text-gray-900 mb-2">
          {contract.amount.toLocaleString('fr-FR', { 
            style: 'currency', 
            currency: contract.currency 
          })}
        </p>
      )}

      {contract.next_renewal_date && (
        <div className={`flex items-center space-x-2 ${contract.is_expiring ? 'text-red-600' : 'text-gray-600'}`}>
          {contract.is_expiring && <ExclamationTriangleIcon className="h-4 w-4" />}
          <span className="text-sm">
            Renouvellement: {format(new Date(contract.next_renewal_date), 'dd MMMM yyyy', { locale: fr })}
          </span>
        </div>
      )}

      {contract.alerts_count > 0 && (
        <div className="mt-2 flex items-center space-x-1 text-orange-600">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span className="text-xs font-medium">
            {contract.alerts_count} alerte{contract.alerts_count > 1 ? 's' : ''} en attente
          </span>
        </div>
      )}

      {contract.ai_analysis?.reconduction_tacite && (
        <div className="mt-2 inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
          Reconduction tacite détectée
        </div>
      )}
    </div>
  );
}
```

#### Service API

```typescript
// resources/js/services/api.ts
import axios from 'axios';
import type { Contract, ContractFilters, Alert } from '../types/contract';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Intercepteur pour ajouter le token Sanctum
api.interceptors.request.use((config) => {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (token) {
    config.headers['X-CSRF-TOKEN'] = token;
  }
  return config;
});

export const contractApi = {
  async getAll(filters?: ContractFilters) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await api.get(`/contracts?${params}`);
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/contracts/${id}`);
    return response.data.data;
  },

  async upload(data: FormData) {
    const response = await api.post('/contracts', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  async update(id: number, data: Partial<Contract>) {
    const response = await api.put(`/contracts/${id}`, data);
    return response.data.data;
  },

  async delete(id: number) {
    await api.delete(`/contracts/${id}`);
  },

  async reprocess(id: number) {
    const response = await api.post(`/contracts/${id}/reprocess`);
    return response.data;
  },
};

export const alertApi = {
  async getAll() {
    const response = await api.get('/alerts');
    return response.data;
  },

  async dismiss(id: number) {
    const response = await api.post(`/alerts/${id}/dismiss`);
    return response.data;
  },

  async snooze(id: number, until: string) {
    const response = await api.put(`/alerts/${id}/snooze`, { until });
    return response.data;
  },
};
```

## Configuration des Queues et Workers

```bash
# Configuration Horizon pour les queues
php artisan horizon:install

# Démarrage des workers
php artisan horizon

# Ou démarrage manuel
php artisan queue:work redis --queue=ocr,analysis,notifications,default
```

---

*Guide technique d'implémentation Laravel + React pour Contract-Tacit* 