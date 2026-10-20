<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('logo')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('currency', 10)->default('ETB');
            $table->string('currency_symbol', 10)->default('Br');
            $table->string('language', 5)->default('en');
            $table->string('timezone')->default('Africa/Addis_Ababa');
            $table->string('costing_method', 20)->default('weighted_average');
            $table->decimal('low_stock_threshold', 12, 2)->default(10);
            $table->string('default_payment_method', 20)->default('cash');
            $table->boolean('allow_negative_stock')->default(false);
            $table->json('notification_prefs')->nullable();
            $table->json('receipt_settings')->nullable();
            $table->boolean('onboarding_completed')->default(false);
            $table->timestamps();
        });

        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('code', 20)->nullable()->unique();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('shops');
    }
};
