<?php

namespace Tests;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Shop;
use App\Models\User;
use App\Services\ActiveShop;
use App\Services\BranchStockService;
use App\Services\RbacTemplates;
use App\Services\ShopProvisioner;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected Shop $shop;

    protected Branch $branch;

    protected User $ownerUser;

    protected function setUp(): void
    {
        parent::setUp();

        ActiveShop::flush();

        RbacTemplates::syncPermissions();

        $this->shop = ShopProvisioner::provision(
            ['name' => 'Test Shop', 'onboarding_completed' => true],
            [
                'name' => 'Owner',
                'email' => 'owner@example.test',
                'password' => 'password',
            ]
        );

        ActiveShop::force($this->shop->id);
        $this->branch = $this->shop->defaultBranch();
        $this->ownerUser = User::where('email', 'owner@example.test')->firstOrFail();
    }

    protected function tearDown(): void
    {
        ActiveShop::flush();

        parent::tearDown();
    }

    protected function owner(array $attributes = []): User
    {
        return $attributes === [] ? $this->ownerUser : $this->ownerUser->newInstance($attributes);
    }

    /**
     * Create an employee with one of the shop's default roles.
     */
    protected function employee(string $roleSlug, array $attributes = []): User
    {
        $role = $this->role($roleSlug);

        $defaults = [
            'shop_id' => $this->shop->id,
            'name' => ucfirst(str_replace('_', ' ', $roleSlug)),
            'email' => $roleSlug.'-'.($attributes['email'] ?? uniqid()).'@example.test',
            'password' => 'password',
            'role_id' => $role->id,
            'branch_id' => $this->branch->id,
            'status' => 'active',
            'language' => 'en',
            'data_scope' => User::SCOPE_BRANCH,
            'password_changed_at' => now(),
        ];

        return User::create(array_merge($defaults, $attributes));
    }

    /**
     * A second, completely separate business on the same install.
     */
    protected function otherShop(string $name = 'Rival Shop'): Shop
    {
        $shop = ShopProvisioner::provision(
            ['name' => $name, 'onboarding_completed' => true],
            [
                'name' => 'Rival Owner',
                'email' => 'rival@example.test',
                'password' => 'password',
            ]
        );

        // Provisioning pins the new tenant; hand the caller back to theirs.
        ActiveShop::force($this->shop->id);

        return $shop;
    }

    /**
     * A user belonging to another business.
     */
    protected function otherShopOwner(string $shopName = 'Rival Shop'): User
    {
        $shop = $this->otherShop($shopName);

        return ActiveShop::runIn(
            $shop->id,
            fn () => User::where('email', 'rival@example.test')->firstOrFail()
        );
    }

    protected function addBranch(Shop $shop, string $name = 'Second Branch'): Branch
    {
        return ShopProvisioner::addBranch($shop, ['name' => $name, 'code' => strtoupper(substr(md5($name), 0, 3))]);
    }

    protected function role(string $slug): Role
    {
        return ActiveShop::runIn(
            $this->shop->id,
            fn () => Role::where('shop_id', $this->shop->id)->where('slug', $slug)->firstOrFail()
        );
    }

    /**
     * Create a product variant and open a stock line for it at a branch.
     *
     * Stock is per branch now, so tests that only care about "this item
     * has N units" can pass the quantity here and it lands on the
     * default branch.
     */
    protected function makeVariant(
        float $stock = 0,
        float $cost = 0,
        float $price = 0,
        array $attributes = [],
    ): ProductVariant {
        $sku = $attributes['sku'] ?? 'SKU-'.uniqid();

        $product = Product::create(array_merge([
            'name' => 'Test Product',
            'sku' => $sku,
            'status' => 'active',
        ], $attributes['product'] ?? []));

        $variant = ProductVariant::create(array_merge([
            'product_id' => $product->id,
            'name' => 'Default',
            'sku' => $sku.'-D',
            'cost' => $cost,
            'selling_price' => $price,
            'min_stock' => 2,
            'stock' => 0,
            'status' => 'active',
        ], $attributes['variant'] ?? []));

        $this->setStock($variant, $stock, $attributes['branch_id'] ?? $this->branch->id);

        return $variant;
    }

    /**
     * Put a quantity on the shelf at one branch.
     */
    protected function setStock(ProductVariant $variant, float $quantity, ?int $branchId = null): BranchStock
    {
        $branchId ??= $this->branch->id;

        $row = BranchStock::firstOrCreate(
            ['branch_id' => $branchId, 'product_variant_id' => $variant->id],
            ['min_stock' => $variant->min_stock, 'cost' => (float) $variant->cost],
        );

        $row->stock = $quantity;
        $row->save();

        app(BranchStockService::class)->refreshVariantTotals($variant);

        return $row;
    }

    protected function stockAt(ProductVariant $variant, ?int $branchId = null): float
    {
        return app(BranchStockService::class)->stockFor((int) $variant->id, $branchId ?? $this->branch->id);
    }

    protected function makeCustomer(array $attributes = []): Customer
    {
        return Customer::create(array_merge([
            'name' => 'Test Customer',
            'status' => 'active',
        ], $attributes));
    }
}