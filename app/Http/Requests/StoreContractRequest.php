<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreContractRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && $this->user()->canCreateContracts();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maxSize = config('contract.upload_max_size', 10240); // 10MB par défaut
        $allowedFormats = config('contract.supported_formats', 'pdf,jpg,jpeg,png');

        return [
            'contract_file' => [
                'required',
                'file',
                "mimes:{$allowedFormats}",
                "max:{$maxSize}"
            ],
            'title' => 'nullable|string|max:255',
            'type' => 'required|in:pro,perso',
            'category' => 'nullable|string|in:assurance,telecom,energie,banque,autre',
            'amount' => 'nullable|numeric|min:0|max:999999.99',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'next_renewal_date' => 'nullable|date',
            'notice_period_days' => 'nullable|integer|min:0|max:365',
            'is_tacit_renewal' => 'nullable|boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'contract_file.required' => 'Le fichier contrat est obligatoire.',
            'contract_file.file' => 'Le fichier doit être un fichier valide.',
            'contract_file.mimes' => 'Le fichier doit être au format PDF, JPG, JPEG ou PNG.',
            'contract_file.max' => 'Le fichier ne peut pas dépasser :max Ko.',
            'type.required' => 'Le type de contrat est obligatoire.',
            'type.in' => 'Le type doit être "pro" (professionnel) ou "perso" (personnel).',
            'category.in' => 'La catégorie doit être : assurance, télécom, énergie, banque ou autre.',
            'amount.numeric' => 'Le montant doit être un nombre.',
            'amount.min' => 'Le montant ne peut pas être négatif.',
            'amount.max' => 'Le montant ne peut pas dépasser 999 999,99 €.',
            'end_date.after' => 'La date de fin doit être postérieure à la date de début.',
            'notice_period_days.min' => 'La période de préavis ne peut pas être négative.',
            'notice_period_days.max' => 'La période de préavis ne peut pas dépasser 365 jours.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'contract_file' => 'fichier contrat',
            'type' => 'type de contrat',
            'category' => 'catégorie',
            'amount' => 'montant',
            'start_date' => 'date de début',
            'end_date' => 'date de fin',
            'next_renewal_date' => 'date de renouvellement',
            'notice_period_days' => 'période de préavis (en jours)',
            'is_tacit_renewal' => 'reconduction tacite',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        if ($this->expectsJson()) {
            $response = response()->json([
                'message' => 'Les données fournies ne sont pas valides.',
                'errors' => $validator->errors(),
            ], 422);

            throw new \Illuminate\Validation\ValidationException($validator, $response);
        }

        parent::failedValidation($validator);
    }

    /**
     * Préparer les données pour la validation
     */
    protected function prepareForValidation()
    {
        // Convertir les strings boolean
        if ($this->has('is_tacit_renewal')) {
            $this->merge([
                'is_tacit_renewal' => filter_var($this->is_tacit_renewal, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
            ]);
        }

        // Nettoyer le montant
        if ($this->has('amount') && is_string($this->amount)) {
            $amount = str_replace([' ', ','], ['', '.'], $this->amount);
            $this->merge(['amount' => $amount]);
        }
    }
}
