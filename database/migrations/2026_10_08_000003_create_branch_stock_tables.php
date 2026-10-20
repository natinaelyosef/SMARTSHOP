<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-branch stock. `product_variants.stock` remains as a fast cached
 * total for reporting, but the authoritative quantity a branch can sell
 * lives in `branch_stocks` (one row per branch + variant).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sequences', function (Blueprint $table) {
            $table->id();
            $table->string('scope', 80)->unique();
            $table->unsignedBigInteger('next_value')->default(1);
            $table->timestamps();
        });

        Schema::create('branch_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->decimal('stock', 12, 2)->default(0);
            $table->decimal('min_stock', 12, 2)->default(0);
            $table->decimal('cost', 18, 4)->default(0);
            $table->timestamps();

            $table->unique(['branch_id', 'product_variant_id'], 'uq_branch_stocks_branch_variant');
            $table->index(['shop_id', 'product_variant_id'], 'idx_branch_stocks_shop_variant');
            $table->index(['shop_id', 'branch_id'], 'idx_branch_stocks_shop_branch');
        });

        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->string('transfer_number', 40);
            $table->foreignId('from_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('to_branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approval_request_id')->nullable();
            $table->string('status', 20)->default('completed');
            $table->text('notes')->nullable();
            $table->timestamp('transferred_at')->nullable();
            $table->timestamps();

            $table->unique(['shop_id', 'transfer_number'], 'uq_stock_transfers_shop_number');
            $table->index(['shop_id', 'status']);
        });

        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->nullable()->after('id');
            $table->foreignId('stock_transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_cost', 18, 4)->default(0);
            $table->timestamps();

            $table->foreign('shop_id')->references('id')->on('shops')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_items');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('branch_stocks');
        Schema::dropIfExists('sequences');
    }
};