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
        // Mettre à jour les contrats existants qui n'ont pas d'ai_status défini
        DB::table('contracts')
            ->whereNull('ai_status')
            ->update([
                'ai_status' => DB::raw("
                    CASE 
                        WHEN ocr_status = 'failed' THEN 'failed'
                        WHEN ocr_status = 'completed' AND ai_analysis IS NOT NULL THEN 'completed'
                        WHEN ocr_status = 'completed' AND ai_analysis IS NULL THEN 'pending'
                        ELSE 'pending'
                    END
                ")
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Pas de rollback nécessaire
    }
};
