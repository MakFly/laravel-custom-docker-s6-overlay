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
        Schema::table('contracts', function (Blueprint $table) {
            // Stockage permanent de l'analyse IA pour éviter les appels répétés
            $table->json('ai_analysis_cached')->nullable()->after('ai_analysis');
            $table->timestamp('ai_analysis_cached_at')->nullable()->after('ai_analysis_cached');
            
            // Mode de traitement (avec ou sans IA)
            $table->enum('processing_mode', ['pattern_only', 'ai_enhanced'])->default('pattern_only')->after('ai_analysis_cached_at');
            
            // Analyse de tacite reconduction sans IA (pattern matching)
            $table->json('pattern_analysis_result')->nullable()->after('processing_mode');
            $table->boolean('tacit_renewal_detected_by_pattern')->default(false)->after('pattern_analysis_result');
            $table->float('pattern_confidence_score', 3, 2)->default(0.0)->after('tacit_renewal_detected_by_pattern');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn([
                'ai_analysis_cached',
                'ai_analysis_cached_at',
                'processing_mode',
                'pattern_analysis_result',
                'tacit_renewal_detected_by_pattern',
                'pattern_confidence_score'
            ]);
        });
    }
};
