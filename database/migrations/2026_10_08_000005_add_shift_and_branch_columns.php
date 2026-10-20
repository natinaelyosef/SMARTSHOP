<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Supporting columns for per-branch stock, shift tracking and the
 * approval thresholds used by the four-eyes workflow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            if (! Schema::hasColumn('sales', 'shift_id')) {
                $table->foreignId('shift_id')->nullable()->after('sold_at')
                    ->constrained('shifts')->nullOnDelete();
            }
        });

        Schema::table('purchase_items', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_items', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('purchase_id')
                    ->constrained('branches')->nullOnDelete();
            }
        });

        Schema::table('stock_batches', function (Blueprint $table) {
            if (! Schema::hasColumn('stock_batches', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('product_variant_id')
                    ->constrained('branches')->nullOnDelete();
            }
        });

        Schema::table('price_histories', function (Blueprint $table) {
            if (! Schema::hasColumn('price_histories', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('product_variant_id')
                    ->constrained('branches')->nullOnDelete();
            }
        });

        Schema::table('branches', function (Blueprint $table) {
            if (! Schema::hasColumn('branches', 'opening_float')) {
                $table->decimal('opening_float', 18, 4)->default(0);
            }
        });

        Schema::table('shops', function (Blueprint $table) {
            if (! Schema::hasColumn('shops', 'discount_approval_threshold')) {
                $table->decimal('discount_approval_threshold', 12, 2)->default(0)
                    ->comment('Discount percent needing manager approval. 0 disables.');
            }

            if (! Schema::hasColumn('shops', 'sale_approval_threshold')) {
                $table->decimal('sale_approval_threshold', 18, 4)->default(0)
                    ->comment('Sale total needing manager approval. 0 disables.');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn(['discount_approval_threshold', 'sale_approval_threshold']);
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('opening_float');
        });

        foreach ([
            'price_histories' => 'branch_id',
            'stock_batches' => 'branch_id',
            'purchase_items' => 'branch_id',
        ] as $table => $column) {
            Schema::table($table, function (Blueprint $t) use ($column) {
                $t->dropForeign([$column]);
                $t->dropColumn($column);
            });
        }

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['shift_id']);
            $table->dropColumn('shift_id');
        });
    }
};