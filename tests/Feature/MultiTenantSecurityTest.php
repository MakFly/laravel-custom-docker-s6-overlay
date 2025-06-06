<?php

use App\Models\User;
use App\Models\Org;
use App\Models\Contract;
use App\Models\Alert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

describe('Multi-Tenant Security', function () {
    beforeEach(function () {
        // Create two separate organizations
        $this->org1 = Org::factory()->create(['name' => 'Organization 1']);
        $this->org2 = Org::factory()->create(['name' => 'Organization 2']);

        // Create users for each organization
        $this->user1 = User::factory()->create(['org_id' => $this->org1->id]);
        $this->user2 = User::factory()->create(['org_id' => $this->org2->id]);

        // Create contracts for each organization
        $this->contract1 = Contract::factory()->create([
            'org_id' => $this->org1->id,
            'user_id' => $this->user1->id,
            'title' => 'Contract for Org 1'
        ]);

        $this->contract2 = Contract::factory()->create([
            'org_id' => $this->org2->id,
            'user_id' => $this->user2->id,
            'title' => 'Contract for Org 2'
        ]);
    });

    describe('Contract Access Control', function () {
        test('user can only view contracts from their organization', function () {
            $this->actingAs($this->user1);

            $response = $this->get('/api/contracts');
            $response->assertStatus(200);

            $contracts = $response->json('data');
            expect($contracts)->toHaveCount(1);
            expect($contracts[0]['title'])->toBe('Contract for Org 1');
        });

        test('user cannot view contract from different organization via API', function () {
            $this->actingAs($this->user1);

            $response = $this->get("/api/contracts/{$this->contract2->id}");
            $response->assertStatus(403);
        });

        test('user cannot update contract from different organization', function () {
            $this->actingAs($this->user1);

            $response = $this->put("/api/contracts/{$this->contract2->id}", [
                'title' => 'Hacked Title'
            ]);
            
            $response->assertStatus(403);
            
            // Verify the contract wasn't updated
            $this->contract2->refresh();
            expect($this->contract2->title)->toBe('Contract for Org 2');
        });

        test('user cannot delete contract from different organization', function () {
            $this->actingAs($this->user1);

            $response = $this->delete("/api/contracts/{$this->contract2->id}");
            $response->assertStatus(403);

            // Verify the contract still exists
            expect(Contract::find($this->contract2->id))->not->toBeNull();
        });

        test('direct database queries are automatically scoped by organization', function () {
            $this->actingAs($this->user1);

            // This should only return contracts from user1's organization
            $contracts = Contract::all();
            
            expect($contracts)->toHaveCount(1);
            expect($contracts->first()->org_id)->toBe($this->org1->id);
        });
    });

    describe('Alert Access Control', function () {
        beforeEach(function () {
            $this->alert1 = Alert::factory()->create([
                'org_id' => $this->org1->id,
                'contract_id' => $this->contract1->id,
            ]);

            $this->alert2 = Alert::factory()->create([
                'org_id' => $this->org2->id,
                'contract_id' => $this->contract2->id,
            ]);
        });

        test('user can only view alerts from their organization', function () {
            $this->actingAs($this->user1);

            $response = $this->get('/api/alerts');
            $response->assertStatus(200);

            $alerts = $response->json('data');
            expect($alerts)->toHaveCount(1);
            expect($alerts[0]['id'])->toBe($this->alert1->id);
        });

        test('user cannot access alert from different organization', function () {
            $this->actingAs($this->user1);

            $response = $this->get("/api/alerts/{$this->alert2->id}");
            $response->assertStatus(403);
        });
    });

    describe('File Access Control', function () {
        test('user cannot access files from different organization', function () {
            // Simulate file access through contract view
            $this->actingAs($this->user1);

            // Try to access contract2's file through contract1's show route
            $response = $this->get("/contracts/{$this->contract2->id}");
            $response->assertStatus(403);
        });

        test('file paths are properly isolated by organization', function () {
            expect($this->contract1->file_path)
                ->toContain("contracts/{$this->org1->id}/");
            
            expect($this->contract2->file_path)
                ->toContain("contracts/{$this->org2->id}/");
        });
    });

    describe('Policy-Based Authorization', function () {
        test('contract policy prevents cross-organization access', function () {
            $this->actingAs($this->user1);

            expect(Gate::allows('view', $this->contract1))->toBeTrue();
            expect(Gate::allows('view', $this->contract2))->toBeFalse();
            
            expect(Gate::allows('update', $this->contract1))->toBeTrue();
            expect(Gate::allows('update', $this->contract2))->toBeFalse();
            
            expect(Gate::allows('delete', $this->contract1))->toBeTrue();
            expect(Gate::allows('delete', $this->contract2))->toBeFalse();
        });

        test('alert policy prevents cross-organization access', function () {
            $this->actingAs($this->user1);

            $alert1 = Alert::factory()->create([
                'org_id' => $this->org1->id,
                'contract_id' => $this->contract1->id,
            ]);

            $alert2 = Alert::factory()->create([
                'org_id' => $this->org2->id,
                'contract_id' => $this->contract2->id,
            ]);

            expect(Gate::allows('view', $alert1))->toBeTrue();
            expect(Gate::allows('view', $alert2))->toBeFalse();
        });
    });

    describe('Mass Assignment Protection', function () {
        test('users cannot change their organization id', function () {
            $this->actingAs($this->user1);

            $response = $this->put('/api/settings/profile', [
                'name' => 'Updated Name',
                'org_id' => $this->org2->id, // Try to change org
            ]);

            $this->user1->refresh();
            expect($this->user1->org_id)->toBe($this->org1->id); // Should remain unchanged
        });

        test('contracts cannot be moved between organizations', function () {
            $this->actingAs($this->user1);

            $response = $this->put("/api/contracts/{$this->contract1->id}", [
                'title' => 'Updated Title',
                'org_id' => $this->org2->id, // Try to move to different org
            ]);

            $this->contract1->refresh();
            expect($this->contract1->org_id)->toBe($this->org1->id); // Should remain unchanged
        });
    });

    describe('Global Scope Functionality', function () {
        test('global scope applies to all model queries', function () {
            $this->actingAs($this->user1);

            // Test various query methods
            expect(Contract::count())->toBe(1);
            expect(Contract::first()->org_id)->toBe($this->org1->id);
            expect(Contract::where('title', 'like', '%Contract%')->count())->toBe(1);
            expect(Contract::latest()->first()->org_id)->toBe($this->org1->id);
        });

        test('relationships respect organization boundaries', function () {
            $this->actingAs($this->user1);

            $user = User::with('contracts')->find($this->user1->id);
            
            expect($user->contracts)->toHaveCount(1);
            expect($user->contracts->first()->org_id)->toBe($this->org1->id);
        });

        test('global scope can be disabled when needed', function () {
            $this->actingAs($this->user1);

            // Should return contracts from all organizations
            $allContracts = Contract::withoutGlobalScope('org')->get();
            expect($allContracts)->toHaveCount(2);
        });
    });

    describe('API Authentication', function () {
        test('unauthenticated requests are rejected', function () {
            $response = $this->get('/api/contracts');
            $response->assertStatus(401);
        });

        test('authenticated requests work correctly', function () {
            $this->actingAs($this->user1);

            $response = $this->get('/api/contracts');
            $response->assertStatus(200);
        });
    });
});