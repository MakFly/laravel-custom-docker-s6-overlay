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
            $table->foreignId('org_id')->constrained()->onDelete('cascade');
            $table->string('role')->default('user'); // admin, user, viewer
            $table->string('phone')->nullable();
            $table->json('notification_preferences')->nullable();
            
            $table->index(['org_id', 'role']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['org_id']);
            $table->dropIndex(['org_id', 'role']);
            $table->dropColumn(['org_id', 'role', 'phone', 'notification_preferences']);
        });
    }
};
