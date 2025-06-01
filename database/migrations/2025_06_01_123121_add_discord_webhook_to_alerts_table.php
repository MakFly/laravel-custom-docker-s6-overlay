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
            // Only add fields that don't exist yet
            if (!Schema::hasColumn('alerts', 'last_sent_at')) {
                $table->timestamp('last_sent_at')->nullable();
            }
            if (!Schema::hasColumn('alerts', 'notification_channels')) {
                $table->json('notification_channels')->nullable(); // email, discord, sms
            }
            if (!Schema::hasColumn('alerts', 'trigger_days')) {
                $table->integer('trigger_days')->default(30);
            }
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
            if (Schema::hasColumn('alerts', 'last_sent_at')) {
                $table->dropColumn('last_sent_at');
            }
            if (Schema::hasColumn('alerts', 'notification_channels')) {
                $table->dropColumn('notification_channels');
            }
            if (Schema::hasColumn('alerts', 'trigger_days')) {
                $table->dropColumn('trigger_days');
            }
            if (Schema::hasColumn('alerts', 'discord_webhook_url')) {
                $table->dropColumn('discord_webhook_url');
            }
        });
    }
};
