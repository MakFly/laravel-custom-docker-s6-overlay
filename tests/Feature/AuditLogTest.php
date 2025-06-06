<?php

use App\Models\User;
use App\Models\Org;
use App\Models\Contract;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('Audit Logging System', function () {
    beforeEach(function () {
        $this->org = Org::factory()->create();
        $this->user = User::factory()->create(['org_id' => $this->org->id]);
        $this->actingAs($this->user);
    });

    test('contract creation is automatically logged', function () {
        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        $auditLog = AuditLog::where('auditable_type', Contract::class)
            ->where('auditable_id', $contract->id)
            ->where('event', 'created')
            ->first();

        expect($auditLog)->not->toBeNull();
        expect($auditLog->org_id)->toBe($this->org->id);
        expect($auditLog->user_id)->toBe($this->user->id);
        expect($auditLog->new_values)->toHaveKey('title');
        expect($auditLog->old_values)->toBeNull();
    });

    test('contract updates are logged with old and new values', function () {
        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
            'title' => 'Original Title'
        ]);

        // Clear creation log to focus on update
        AuditLog::truncate();

        $contract->update(['title' => 'Updated Title']);

        $auditLog = AuditLog::where('event', 'updated')->first();

        expect($auditLog)->not->toBeNull();
        expect($auditLog->old_values['title'])->toBe('Original Title');
        expect($auditLog->new_values['title'])->toBe('Updated Title');
    });

    test('contract deletion is logged', function () {
        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        $contractId = $contract->id;
        $contract->delete();

        $auditLog = AuditLog::where('auditable_id', $contractId)
            ->where('event', 'deleted')
            ->first();

        expect($auditLog)->not->toBeNull();
        expect($auditLog->old_values)->toHaveKey('title');
        expect($auditLog->new_values)->toBeNull();
    });

    test('custom events can be logged', function () {
        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        $contract->logView(['ip_address' => '192.168.1.1']);

        $auditLog = AuditLog::where('event', 'viewed')->first();

        expect($auditLog)->not->toBeNull();
        expect($auditLog->metadata['context'])->toBe('custom_event');
    });

    test('file downloads are logged', function () {
        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        $contract->logDownload('contract.pdf', ['file_size' => 1024]);

        $auditLog = AuditLog::where('event', 'downloaded')->first();

        expect($auditLog)->not->toBeNull();
        expect($auditLog->metadata['filename'])->toBe('contract.pdf');
        expect($auditLog->metadata['file_size'])->toBe(1024);
    });

    test('audit logs respect multi-tenant isolation', function () {
        $otherOrg = Org::factory()->create();
        $otherUser = User::factory()->create(['org_id' => $otherOrg->id]);

        // Create contract in current org
        $contract1 = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        // Create contract in other org
        $this->actingAs($otherUser);
        $contract2 = Contract::factory()->create([
            'org_id' => $otherOrg->id,
            'user_id' => $otherUser->id,
        ]);

        // Switch back to original user
        $this->actingAs($this->user);

        // User should only see logs from their org
        $logs = AuditLog::all();
        foreach ($logs as $log) {
            expect($log->org_id)->toBe($this->user->org_id);
        }
    });

    test('audit log scopes work correctly', function () {
        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        $contract->update(['title' => 'New Title']);
        $contract->logView();

        $createdLogs = AuditLog::event('created')->get();
        $updatedLogs = AuditLog::event('updated')->get();
        $viewedLogs = AuditLog::event('viewed')->get();
        $contractLogs = AuditLog::forModel(Contract::class)->get();
        $recentLogs = AuditLog::recent(1)->get();

        expect($createdLogs)->toHaveCount(1);
        expect($updatedLogs)->toHaveCount(1);
        expect($viewedLogs)->toHaveCount(1);
        expect($contractLogs)->toHaveCount(3); // created, updated, viewed
        expect($recentLogs)->toHaveCount(3); // all logs are recent
    });

    test('audit logs include request metadata', function () {
        $this->withHeaders([
            'User-Agent' => 'Test Browser',
            'X-Forwarded-For' => '192.168.1.100'
        ]);

        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        $auditLog = AuditLog::where('event', 'created')->first();

        expect($auditLog->user_agent)->toBe('Test Browser');
        expect($auditLog->ip_address)->not->toBeNull();
    });

    test('audit logs can be queried by relationship', function () {
        $contract = Contract::factory()->create([
            'org_id' => $this->org->id,
            'user_id' => $this->user->id,
        ]);

        $auditLogs = $contract->auditLogs()->get();

        expect($auditLogs)->toHaveCount(1);
        expect($auditLogs->first()->event)->toBe('created');
    });
});