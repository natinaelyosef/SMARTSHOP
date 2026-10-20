<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->decimal('old_price', 18, 4);
            $table->decimal('new_price', 18, 4);
            $table->decimal('cost_at_time', 18, 4)->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason')->nullable();
            $table->timestamp('effective_at');
            $table->timestamps();
        });

        Schema::create('tax_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type', 20)->default('sales');
            $table->decimal('rate', 8, 4);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_estimate')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('tax_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('period_type', 20)->default('monthly');
            $table->decimal('taxable_amount', 18, 4)->default(0);
            $table->decimal('tax_amount', 18, 4)->default(0);
            $table->decimal('paid_amount', 18, 4)->default(0);
            $table->decimal('remaining_amount', 18, 4)->default(0);
            $table->string('status', 20)->default('open');
            $table->timestamps();
        });

        Schema::create('tax_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_period_id')->constrained('tax_periods')->cascadeOnDelete();
            $table->foreignId('tax_rule_id')->nullable()->constrained('tax_rules')->nullOnDelete();
            $table->decimal('amount', 18, 4);
            $table->date('paid_at');
            $table->string('reference')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_payments');
        Schema::dropIfExists('tax_periods');
        Schema::dropIfExists('tax_rules');
        Schema::dropIfExists('price_histories');
    }
};
