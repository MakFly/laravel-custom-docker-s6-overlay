<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            // Update the type enum to include more types
            $table->enum('type', ['renewal', 'expiry', 'custom', 'renewal_warning', 'notice_deadline', 'contract_expired'])->change();
            
            // Update the status enum to include active/inactive
            $table->enum('status', ['pending', 'sent', 'failed', 'active', 'inactive'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            // Revert to original enum values
            $table->enum('type', ['renewal_warning', 'notice_deadline', 'contract_expired'])->change();
            $table->enum('status', ['pending', 'sent', 'failed'])->change();
        });
    }
};
