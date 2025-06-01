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
        Schema::table('users', function (Blueprint $table) {
            // Plan d'abonnement
            $table->enum('subscription_plan', ['basic', 'premium'])->default('basic');
            
            // Crédits IA
            $table->integer('ai_credits_remaining')->default(10); // Crédits restants
            $table->integer('ai_credits_monthly_limit')->default(10); // Limite mensuelle selon le plan
            $table->integer('ai_credits_purchased')->default(0); // Crédits achetés en plus
            
            // Reset mensuel des crédits
            $table->date('credits_reset_date')->default(now()->addMonth()->startOfMonth());
            
            // Statistiques d'usage
            $table->integer('ai_credits_used_this_month')->default(0);
            $table->integer('ai_credits_total_used')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'subscription_plan',
                'ai_credits_remaining',
                'ai_credits_monthly_limit', 
                'ai_credits_purchased',
                'credits_reset_date',
                'ai_credits_used_this_month',
                'ai_credits_total_used'
            ]);
        });
    }
};
