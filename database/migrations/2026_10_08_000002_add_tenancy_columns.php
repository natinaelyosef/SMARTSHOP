<?php

use App\Models\Shop;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Converts the single-tenant install into a multi-tenant one: every
 * business-owned row gains a shop_id, and every uniqueness rule that used
 * to be global becomes per-shop so two businesses can use the same
 * SKU, slug, code or document number without colliding.
 *
 * Permissions and units stay global on purpose: they are shared
 * reference data (a catalogue of capabilities and a vocabulary of
 * measures), not business records.
 */
return new class extends Migration
{
    /**
     * Tables that receive a shop_id column, in dependency-safe order.
     *
     * @var array<int, string>
     */
    private const TABLES = [
        'roles',
        'settings',
        'categories',
        'products',
        'product_variants',
        'suppliers',
        'customers',
        'purchases',
        'purchase_items',
        'purchase_payments',
        'inventory_movements',
        'stock_batches',
        'sales',
        'sale_items',
        'sale_payments',
        'sales_returns',
        'sales_return_items',
        'expense_categories',
        'expenses',
        'rents',
        'rent_payments',
        'price_histories',
        'tax_rules',
        'tax_periods',
        'tax_payments',
        'audit_logs',
    ];

    public function up(): void
    {
        $this->addShopIdColumns();
        $this->addUserColumns();
        $this->backfill();
        $this->relaxGlobalUniques();
    }

    private function addShopIdColumns(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasTable($table) || Schema::hasColumn($table, 'shop_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('shop_id')->nullable()->after('id');
            });

            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreign('shop_id')->references('id')->on('shops')->nullOnDelete();
            });
        }
    }

    private function addUserColumns(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_id')->nullable()->after('id');
            $table->boolean('is_platform_admin')->default(false);
            $table->boolean('is_owner')->default(false);
            $table->boolean('must_change_password')->default(false);
            $table->timestamp('password_changed_at')->nullable();
            $table->string('data_scope', 20)->default('branch');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('shop_id')->references('id')->on('shops')->nullOnDelete();
        });

        // Role is a per-shop record, so a user can never point at another
        // tenant's role.
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('role_id')->references('id')->on('roles')->nullOnDelete();
        });
    }

    private function backfill(): void
    {
        $shopId = Shop::query()->orderBy('id')->value('id');

        if (! $shopId) {
            return;
        }

        foreach ([...self::TABLES, 'users'] as $table) {
            DB::table($table)->whereNull('shop_id')->update(['shop_id' => $shopId]);
        }
    }

    /**
     * Replace global unique indexes with per-shop composites so two
     * businesses can independently use "SAL-000001", "SKU-1", "Food",
     * "ADD" and so on.
     */
    private function relaxGlobalUniques(): void
    {
        $swaps = [
            ['roles', 'roles_slug_unique', ['shop_id', 'slug']],
            ['settings', 'settings_key_unique', ['shop_id', 'key']],
            ['categories', 'categories_slug_unique', ['shop_id', 'slug']],
            ['products', 'products_sku_unique', ['shop_id', 'sku']],
            ['products', 'products_barcode_unique', ['shop_id', 'barcode']],
            ['product_variants', 'product_variants_sku_unique', ['shop_id', 'sku']],
            ['product_variants', 'product_variants_barcode_unique', ['shop_id', 'barcode']],
            ['suppliers', null, ['shop_id', 'phone']],
            ['customers', null, ['shop_id', 'phone']],
            ['expense_categories', 'expense_categories_slug_unique', ['shop_id', 'slug']],
            ['sales', 'sales_sale_number_unique', ['shop_id', 'sale_number']],
            ['sales_returns', 'sales_returns_return_number_unique', ['shop_id', 'return_number']],
            ['purchases', 'purchases_purchase_number_unique', ['shop_id', 'purchase_number']],
            ['branches', 'branches_code_unique', ['shop_id', 'code']],
        ];

        foreach ($swaps as [$table, $index, $columns]) {
            if ($index !== null) {
                try {
                    Schema::table($table, fn (Blueprint $t) => $t->dropUnique($index));
                } catch (\Throwable) {
                    // Index already absent (fresh database) — nothing to relax.
                }
            }

            Schema::table($table, function (Blueprint $t) use ($columns, $table) {
                $t->unique($columns, 'uq_'.$table.'_'.implode('_', $columns));
            });
        }

        // A nullable column in a unique index still allows many NULLs on
        // MySQL, which is what we want for optional barcodes.
        Schema::table('products', function (Blueprint $table) {
            $table->index(['shop_id', 'status']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->index(['shop_id', 'status']);
            $table->index('stock');
        });

        // Reporting and permission hot paths.
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['shop_id', 'sold_at']);
            $table->index(['shop_id', 'branch_id', 'sold_at']);
            $table->index(['shop_id', 'user_id']);
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->index(['shop_id', 'purchased_at']);
        });

        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->index(['shop_id', 'product_variant_id']);
            $table->index(['shop_id', 'branch_id']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->index(['shop_id', 'status']);
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->index(['shop_id', 'status']);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->index(['shop_id', 'expense_date']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['shop_id', 'status']);
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->index('shop_id');
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->index(['shop_id', 'is_active']);
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index(['shop_id', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'shop_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $t) {
                $t->dropForeign(['shop_id']);
            });

            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('shop_id');
            });
        }

        Schema::table('users', function (Blueprint $t) {
            $t->dropForeign(['shop_id']);
            $t->dropColumn(['shop_id', 'is_platform_admin', 'is_owner', 'must_change_password', 'password_changed_at', 'data_scope']);
        });
    }
};