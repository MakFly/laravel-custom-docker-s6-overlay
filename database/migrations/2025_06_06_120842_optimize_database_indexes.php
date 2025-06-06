<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Contracts table optimizations
        Schema::table('contracts', function (Blueprint $table) {
            // Composite indexes for common queries
            $table->index(['org_id', 'status'], 'idx_contracts_org_status');
            $table->index(['org_id', 'next_renewal_date'], 'idx_contracts_org_renewal_date');
            $table->index(['org_id', 'created_at'], 'idx_contracts_org_created');
            $table->index(['org_id', 'type'], 'idx_contracts_org_type');
            $table->index(['org_id', 'is_tacit_renewal'], 'idx_contracts_org_tacit');
            $table->index(['org_id', 'ai_status'], 'idx_contracts_org_ai_status');
            $table->index(['org_id', 'ocr_status'], 'idx_contracts_org_ocr_status');
            
            // Performance indexes for filtering
            $table->index(['next_renewal_date', 'status'], 'idx_contracts_renewal_status');
            $table->index(['is_tacit_renewal', 'next_renewal_date'], 'idx_contracts_tacit_renewal');
            $table->index(['user_id', 'created_at'], 'idx_contracts_user_created');
            
            // Full-text search preparation
            $table->index(['title'], 'idx_contracts_title');
        });

        // Alerts table optimizations
        Schema::table('alerts', function (Blueprint $table) {
            // Composite indexes for multi-tenant queries
            $table->index(['org_id', 'status'], 'idx_alerts_org_status');
            $table->index(['org_id', 'scheduled_for'], 'idx_alerts_org_scheduled');
            $table->index(['org_id', 'type'], 'idx_alerts_org_type');
            $table->index(['org_id', 'created_at'], 'idx_alerts_org_created');
            
            // Performance indexes
            $table->index(['contract_id', 'status'], 'idx_alerts_contract_status');
            $table->index(['scheduled_for', 'status'], 'idx_alerts_scheduled_status');
            $table->index(['is_sent', 'scheduled_for'], 'idx_alerts_sent_scheduled');
        });

        // Users table optimizations
        Schema::table('users', function (Blueprint $table) {
            // Multi-tenant and performance indexes
            $table->index(['org_id', 'created_at'], 'idx_users_org_created');
            $table->index(['org_id', 'email_verified_at'], 'idx_users_org_verified');
            $table->index(['email', 'org_id'], 'idx_users_email_org');
            
            // Credits and subscription queries
            $table->index(['ai_credits', 'org_id'], 'idx_users_credits_org');
        });

        // Audit logs table optimizations
        Schema::table('audit_logs', function (Blueprint $table) {
            // High-performance indexes for audit queries
            $table->index(['org_id', 'created_at'], 'idx_audit_org_created');
            $table->index(['org_id', 'event'], 'idx_audit_org_event');
            $table->index(['org_id', 'auditable_type', 'auditable_id'], 'idx_audit_org_auditable');
            $table->index(['org_id', 'user_id'], 'idx_audit_org_user');
            
            // Performance indexes for analytics
            $table->index(['event', 'created_at'], 'idx_audit_event_created');
            $table->index(['auditable_type', 'created_at'], 'idx_audit_type_created');
        });

        // Orgs table optimizations
        Schema::table('orgs', function (Blueprint $table) {
            // Search and filtering indexes
            $table->index(['status', 'created_at'], 'idx_orgs_status_created');
            $table->index(['name'], 'idx_orgs_name');
        });

        // Contract clauses table (if exists)
        if (Schema::hasTable('contract_clauses')) {
            Schema::table('contract_clauses', function (Blueprint $table) {
                $table->index(['org_id', 'contract_id'], 'idx_clauses_org_contract');
                $table->index(['contract_id', 'type'], 'idx_clauses_contract_type');
            });
        }

        // Jobs table optimizations for queue performance
        Schema::table('jobs', function (Blueprint $table) {
            $table->index(['queue', 'reserved_at'], 'idx_jobs_queue_reserved');
            $table->index(['available_at'], 'idx_jobs_available');
        });

        // Failed jobs table optimization
        Schema::table('failed_jobs', function (Blueprint $table) {
            $table->index(['failed_at'], 'idx_failed_jobs_failed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Contracts table
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex('idx_contracts_org_status');
            $table->dropIndex('idx_contracts_org_renewal_date');
            $table->dropIndex('idx_contracts_org_created');
            $table->dropIndex('idx_contracts_org_type');
            $table->dropIndex('idx_contracts_org_tacit');
            $table->dropIndex('idx_contracts_org_ai_status');
            $table->dropIndex('idx_contracts_org_ocr_status');
            $table->dropIndex('idx_contracts_renewal_status');
            $table->dropIndex('idx_contracts_tacit_renewal');
            $table->dropIndex('idx_contracts_user_created');
            $table->dropIndex('idx_contracts_title');
        });

        // Alerts table
        Schema::table('alerts', function (Blueprint $table) {
            $table->dropIndex('idx_alerts_org_status');
            $table->dropIndex('idx_alerts_org_scheduled');
            $table->dropIndex('idx_alerts_org_type');
            $table->dropIndex('idx_alerts_org_created');
            $table->dropIndex('idx_alerts_contract_status');
            $table->dropIndex('idx_alerts_scheduled_status');
            $table->dropIndex('idx_alerts_sent_scheduled');
        });

        // Users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_org_created');
            $table->dropIndex('idx_users_org_verified');
            $table->dropIndex('idx_users_email_org');
            $table->dropIndex('idx_users_credits_org');
        });

        // Audit logs table
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('idx_audit_org_created');
            $table->dropIndex('idx_audit_org_event');
            $table->dropIndex('idx_audit_org_auditable');
            $table->dropIndex('idx_audit_org_user');
            $table->dropIndex('idx_audit_event_created');
            $table->dropIndex('idx_audit_type_created');
        });

        // Orgs table
        Schema::table('orgs', function (Blueprint $table) {
            $table->dropIndex('idx_orgs_status_created');
            $table->dropIndex('idx_orgs_name');
        });

        // Contract clauses table
        if (Schema::hasTable('contract_clauses')) {
            Schema::table('contract_clauses', function (Blueprint $table) {
                $table->dropIndex('idx_clauses_org_contract');
                $table->dropIndex('idx_clauses_contract_type');
            });
        }

        // Jobs table
        Schema::table('jobs', function (Blueprint $table) {
            $table->dropIndex('idx_jobs_queue_reserved');
            $table->dropIndex('idx_jobs_available');
        });

        // Failed jobs table
        Schema::table('failed_jobs', function (Blueprint $table) {
            $table->dropIndex('idx_failed_jobs_failed_at');
        });
    }
};
