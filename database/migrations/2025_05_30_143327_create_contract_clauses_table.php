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
        Schema::create('contract_clauses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained()->onDelete('cascade');
            
            $table->enum('type', ['renewal', 'termination', 'price_change', 'other']);
            $table->longText('content');
            $table->float('ai_confidence_score', 3, 2)->default(0.0); // 0.00 to 1.00
            $table->boolean('is_validated')->default(false);
            
            $table->timestamps();
            
            // Indexes
            $table->index(['contract_id', 'type']);
            $table->index(['ai_confidence_score']);
            $table->index(['is_validated']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contract_clauses');
    }
};
