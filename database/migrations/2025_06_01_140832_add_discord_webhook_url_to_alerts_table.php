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
        Schema::table('alerts', function (Blueprint $table) {
            if (!Schema::hasColumn('alerts', 'discord_webhook_url')) {
                $table->string('discord_webhook_url')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            if (Schema::hasColumn('alerts', 'discord_webhook_url')) {
                $table->dropColumn('discord_webhook_url');
            }
        });
    }
};
