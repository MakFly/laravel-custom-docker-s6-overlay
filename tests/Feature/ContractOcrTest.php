<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Organization;
use App\Models\Contract;
use App\Jobs\ProcessContractOCR;
use App\Jobs\AnalyzeContractWithAI;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Queue;

class ContractOcrTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Créer une organisation et un utilisateur
        $this->organization = Organization::factory()->create([
            'name' => 'Test Organization',
            'subscription_plan' => 'premium'
        ]);

        $this->user = User::factory()->create([
            'org_id' => $this->organization->id,
            'email' => 'test@example.com',
        ]);

        // Configurer le stockage de test
        Storage::fake('private');
        Queue::fake();
    }

    public function test_user_can_upload_pdf_contract()
    {
        $this->actingAs($this->user);

        // Créer un fichier PDF fictif
        $file = UploadedFile::fake()->create('contrat-test.pdf', 1000, 'application/pdf');

        $response = $this->post(route('contracts.store'), [
            'title' => 'Contrat de Test',
            'type' => 'pro',
            'other_party' => 'Entreprise Test',
            'amount' => '1500.00',
            'description' => 'Description du contrat de test',
            'start_date' => '2025-01-01',
            'end_date' => '2025-12-31',
            'renewal_notice_days' => '30',
            'is_tacit_renewal' => true,
            'contract_file' => $file,
        ]);

        // Vérifier la redirection
        $response->assertRedirect();

        // Vérifier que le contrat a été créé en base
        $this->assertDatabaseHas('contracts', [
            'title' => 'Contrat de Test',
            'type' => 'pro',
            'org_id' => $this->organization->id,
            'ocr_status' => 'pending',
            'ai_analysis_status' => 'pending',
        ]);

        // Vérifier que le fichier a été stocké
        $contract = Contract::where('title', 'Contrat de Test')->first();
        $this->assertNotNull($contract->file_path);
        Storage::disk('private')->assertExists($contract->file_path);

        // Vérifier que les jobs OCR et AI ont été mis en queue
        Queue::assertPushed(ProcessContractOCR::class, function ($job) use ($contract) {
            return $job->contract->id === $contract->id;
        });

        Queue::assertPushed(AnalyzeContractWithAI::class, function ($job) use ($contract) {
            return $job->contract->id === $contract->id;
        });
    }

    public function test_user_can_upload_image_contract()
    {
        $this->actingAs($this->user);

        // Créer un fichier image fictif
        $file = UploadedFile::fake()->image('contrat-scan.jpg', 800, 600)->size(2000);

        $response = $this->post(route('contracts.store'), [
            'title' => 'Contrat Scanné',
            'type' => 'perso',
            'contract_file' => $file,
        ]);

        $response->assertRedirect();

        // Vérifier que le contrat a été créé
        $this->assertDatabaseHas('contracts', [
            'title' => 'Contrat Scanné',
            'type' => 'perso',
            'org_id' => $this->organization->id,
        ]);

        // Vérifier que le fichier a été stocké
        $contract = Contract::where('title', 'Contrat Scanné')->first();
        Storage::disk('private')->assertExists($contract->file_path);
    }

    public function test_contract_validation_errors()
    {
        $this->actingAs($this->user);

        // Test sans titre (obligatoire)
        $response = $this->post(route('contracts.store'), [
            'type' => 'pro',
        ]);

        $response->assertSessionHasErrors(['title']);

        // Test avec fichier trop volumineux
        $largFile = UploadedFile::fake()->create('large-file.pdf', 15000); // 15MB

        $response = $this->post(route('contracts.store'), [
            'title' => 'Test',
            'type' => 'pro',
            'contract_file' => $largFile,
        ]);

        $response->assertSessionHasErrors(['contract_file']);
    }

    public function test_contract_ocr_job_processes_successfully()
    {
        // Créer un contrat avec un fichier
        $contract = Contract::factory()->create([
            'org_id' => $this->organization->id,
            'title' => 'Test Contract',
            'file_path' => 'contracts/' . $this->organization->id . '/test.pdf',
            'ocr_status' => 'pending',
        ]);

        // Créer un fichier fictif dans le stockage
        Storage::disk('private')->put($contract->file_path, 'fake pdf content');

        // Simuler le job OCR
        $job = new ProcessContractOCR($contract);
        
        try {
            $job->handle();
        } catch (\Exception $e) {
            // On s'attend à une erreur car c'est un faux PDF, 
            // mais on vérifie que le statut a été mis à jour
            $this->assertTrue(true);
        }

        // Vérifier que le statut a changé
        $contract->refresh();
        $this->assertNotEquals('pending', $contract->ocr_status);
    }

    public function test_contract_list_shows_ocr_status()
    {
        $this->actingAs($this->user);

        // Créer des contrats avec différents statuts OCR
        Contract::factory()->create([
            'org_id' => $this->organization->id,
            'title' => 'Contrat Pending',
            'ocr_status' => 'pending',
        ]);

        Contract::factory()->create([
            'org_id' => $this->organization->id,
            'title' => 'Contrat Completed',
            'ocr_status' => 'completed',
        ]);

        Contract::factory()->create([
            'org_id' => $this->organization->id,
            'title' => 'Contrat Failed',
            'ocr_status' => 'failed',
        ]);

        // Accéder à la liste des contrats
        $response = $this->get(route('contracts.index'));

        $response->assertOk();
        $response->assertSee('Contrat Pending');
        $response->assertSee('Contrat Completed');
        $response->assertSee('Contrat Failed');
    }

    public function test_user_cannot_access_other_org_contracts()
    {
        // Créer une autre organisation et un contrat dedans
        $otherOrg = Organization::factory()->create();
        $otherContract = Contract::factory()->create([
            'org_id' => $otherOrg->id,
            'title' => 'Other Org Contract',
        ]);

        $this->actingAs($this->user);

        // Essayer d'accéder au contrat de l'autre organisation
        $response = $this->get(route('contracts.show', $otherContract->id));
        $response->assertStatus(404); // Devrait être 404 grâce au multi-tenant
    }

    public function test_storage_configuration_works()
    {
        // Tester que la configuration de stockage MinIO/S3 fonctionne
        $this->actingAs($this->user);

        $file = UploadedFile::fake()->create('test.pdf', 1000);
        
        $response = $this->post(route('contracts.store'), [
            'title' => 'Storage Test',
            'type' => 'pro',
            'contract_file' => $file,
        ]);

        $contract = Contract::where('title', 'Storage Test')->first();
        
        // Vérifier que le chemin contient l'org_id pour l'isolation
        $this->assertStringContains((string)$this->organization->id, $contract->file_path);
        
        // Vérifier que le fichier existe
        Storage::disk('private')->assertExists($contract->file_path);
    }
} 