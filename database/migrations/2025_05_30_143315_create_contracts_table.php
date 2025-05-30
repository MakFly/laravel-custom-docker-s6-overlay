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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Contract basic info
            $table->string('title');
            $table->enum('type', ['pro', 'perso']);
            $table->string('category')->default('autre'); // assurance, telecom, energie, autre
            
            // File info
            $table->string('file_path');
            $table->string('file_original_name');
            
            // Financial info
            $table->integer('amount_cents')->default(0);
            $table->string('currency', 3)->default('EUR');
            
            // Date info
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->integer('notice_period_days')->default(30);
            $table->boolean('is_tacit_renewal')->default(false);
            $table->date('next_renewal_date')->nullable();
            
            // Status
            $table->enum('status', ['active', 'expired', 'cancelled'])->default('active');
            
            // OCR and AI
            $table->enum('ocr_status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->longText('ocr_raw_text')->nullable();
            $table->json('ai_analysis')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['org_id', 'type']);
            $table->index(['org_id', 'status']);
            $table->index(['org_id', 'next_renewal_date']);
            $table->index(['org_id', 'is_tacit_renewal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
