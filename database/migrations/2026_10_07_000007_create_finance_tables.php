<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->boolean('is_system')->default(false);
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->decimal('amount', 18, 4);
            $table->date('expense_date')->index();
            $table->string('payment_method', 20)->default('cash');
            $table->boolean('is_paid')->default(true);
            $table->decimal('paid_amount', 18, 4)->default(0);
            $table->string('description')->nullable();
            $table->string('receipt_reference')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('rents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('shop_name');
            $table->string('landlord_name')->nullable();
            $table->string('landlord_phone')->nullable();
            $table->decimal('monthly_amount', 18, 4);
            $table->unsignedTinyInteger('due_day')->default(1);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        Schema::create('rent_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rent_id')->constrained('rents')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('amount_due', 18, 4);
            $table->decimal('amount_paid', 18, 4)->default(0);
            $table->date('due_date');
            $table->date('paid_at')->nullable();
            $table->string('payment_method', 20)->nullable();
            $table->string('receipt_number')->nullable();
            $table->string('status', 20)->default('unpaid')->index();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rent_payments');
        Schema::dropIfExists('rents');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
    }
};
