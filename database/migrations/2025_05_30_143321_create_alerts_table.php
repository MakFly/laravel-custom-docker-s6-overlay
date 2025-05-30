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
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained()->onDelete('cascade');
            
            $table->enum('type', ['renewal_warning', 'notice_deadline', 'contract_expired']);
            $table->datetime('scheduled_for');
            $table->datetime('sent_at')->nullable();
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending');
            $table->enum('notification_method', ['email', 'sms', 'push'])->default('email');
            $table->text('message');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['contract_id', 'status']);
            $table->index(['scheduled_for', 'status']);
            $table->index(['type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
