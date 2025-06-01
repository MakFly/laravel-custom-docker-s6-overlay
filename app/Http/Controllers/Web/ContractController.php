<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Http\Requests\StoreContractRequest;
use App\Http\Resources\ContractResource;
use App\Jobs\ProcessContractOCR;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ContractController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Dashboard des contrats
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Contract::where('org_id', $user->org_id)
            ->with(['user:id,name,email']);

        // Appliquer les filtres
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Pagination
        $contracts = $query->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Calculer les statistiques
        $allContracts = Contract::where('org_id', $user->org_id);
        
        $stats = [
            'total_contracts' => $allContracts->count(),
            'active_contracts' => $allContracts->where('status', 'active')->count(),
            'expiring_soon' => $allContracts
                ->whereNotNull('next_renewal_date')
                ->where('next_renewal_date', '<=', now()->addDays(30))
                ->count(),
            'processed_contracts' => $allContracts->where('ocr_status', 'completed')->count(),
        ];

        return Inertia::render('Contracts/Index', [
            'contracts' => [
                'data' => ContractResource::collection($contracts->items()),
                'total' => $contracts->total(),
                'per_page' => $contracts->perPage(),
                'current_page' => $contracts->currentPage(),
                'last_page' => $contracts->lastPage(),
                'from' => $contracts->firstItem(),
                'to' => $contracts->lastItem(),
            ],
            'stats' => $stats,
            'filters' => $request->only(['type', 'category', 'status']),
        ]);
    }

    /**
     * Formulaire de création d'un nouveau contrat
     */
    public function create()
    {
        return Inertia::render('Contracts/Create');
    }

    /**
     * Créer un nouveau contrat avec upload de fichier
     */
    public function store(StoreContractRequest $request)
    {
        $file = $request->file('contract_file');
        $user = $request->user();
        
        // Stocker le fichier de manière sécurisée par organisation
        $filePath = $file->store("contracts/{$user->org_id}", 'private');

        $contract = Contract::create([
            'org_id' => $user->org_id,
            'user_id' => $user->id,
            'title' => $request->title ?? $file->getClientOriginalName(),
            'type' => $request->type,
            'category' => $request->category ?? 'autre',
            'file_path' => $filePath,
            'file_original_name' => $file->getClientOriginalName(),
            'status' => 'active',
            'ocr_status' => 'pending',
            'ai_status' => 'pending',
            'amount_cents' => $request->amount ? ($request->amount * 100) : 0,
            'notice_period_days' => $request->notice_period_days ?? 30,
        ]);

        // Lancer le traitement OCR en arrière-plan
        ProcessContractOCR::dispatch($contract);

        return response()->json([
            'success' => true,
            'message' => 'Contrat créé avec succès',
            'data' => [
                'id' => $contract->id,
                'title' => $contract->title,
                'type' => $contract->type,
                'category' => $contract->category,
                'status' => $contract->status,
                'ocr_status' => $contract->ocr_status,
            ]
        ]);
    }

    /**
     * Afficher un contrat spécifique
     */
    public function show(Contract $contract)
    {
        $this->authorize('view', $contract);

        return Inertia::render('Contracts/Show', [
            'contract' => new ContractResource($contract->load(['alerts', 'clauses', 'user:id,name,email'])),
        ]);
    }

    /**
     * Page d'édition d'un contrat
     */
    public function edit(Contract $contract)
    {
        $this->authorize('update', $contract);

        return Inertia::render('Contracts/Edit', [
            'contract' => new ContractResource($contract->load(['user:id,name,email'])),
        ]);
    }

    /**
     * Mettre à jour un contrat
     */
    public function update(Request $request, Contract $contract)
    {
        $this->authorize('update', $contract);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:pro,perso',
            'category' => 'sometimes|string|max:100',
            'amount' => 'sometimes|numeric|min:0',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'next_renewal_date' => 'sometimes|date',
            'notice_period_days' => 'sometimes|integer|min:0',
            'is_tacit_renewal' => 'sometimes|boolean',
            'status' => 'sometimes|in:active,expired,cancelled',
        ]);

        if (isset($validated['amount'])) {
            $validated['amount_cents'] = $validated['amount'] * 100;
            unset($validated['amount']);
        }

        $contract->update($validated);

        return redirect()->route('contracts.show', $contract)
            ->with('success', 'Contrat mis à jour avec succès');
    }

    /**
     * Supprimer un contrat
     */
    public function destroy(Contract $contract)
    {
        $this->authorize('delete', $contract);

        // Supprimer le fichier associé
        if ($contract->file_path && Storage::disk('private')->exists($contract->file_path)) {
            Storage::disk('private')->delete($contract->file_path);
        }

        $contract->delete();

        return redirect()->route('contracts.index')
            ->with('success', 'Contrat supprimé avec succès');
    }

    /**
     * Page d'upload et traitement OCR
     */
    public function upload()
    {
        return Inertia::render('Contracts/Upload');
    }

    /**
     * Page de résultats OCR
     */
    public function ocrResults(Contract $contract)
    {
        $this->authorize('view', $contract);

        return Inertia::render('Contracts/OcrResults', [
            'contract' => $contract,
        ]);
    }

    /**
     * Page d'analyse IA - Redirection vers la page show unifiée
     */
    public function analysis(Contract $contract)
    {
        $this->authorize('view', $contract);

        // Rediriger vers la page show qui contient maintenant l'analyse complète
        return redirect()->route('contracts.show', $contract);
    }
}
