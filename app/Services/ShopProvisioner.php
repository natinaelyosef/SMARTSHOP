<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\ExpenseCategory;
use App\Models\Role;
use App\Models\Shop;
use App\Models\TaxRule;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates a complete, independent business: shop settings, a primary
 * branch, its own set of roles, default expense categories, a starter
 * tax rule and the owner account.
 *
 * Every registration produces a brand new shop — nothing is shared with
 * any other business on the install.
 */
class ShopProvisioner
{
    public const EXPENSE_CATEGORIES = [
        'Electricity', 'Water', 'Internet', 'Salary', 'Transportation',
        'Maintenance', 'Packaging', 'Bank fees', 'Marketing', 'Security', 'Rent', 'Other',
    ];

    /**
     * @param  array  $shopAttributes  name/phone/email/currency/team_mode …
     * @param  array  $ownerAttributes  name/email/password/phone
     */
    public static function provision(array $shopAttributes, array $ownerAttributes): Shop
    {
        return DB::transaction(function () use ($shopAttributes, $ownerAttributes) {
            $shop = Shop::create(array_merge([
                'name' => 'My Business',
                'currency' => 'ETB',
                'currency_symbol' => 'Br',
                'language' => 'en',
                'timezone' => 'Africa/Addis_Ababa',
                'costing_method' => 'weighted_average',
                'low_stock_threshold' => 10,
                'default_payment_method' => 'cash',
                'allow_negative_stock' => false,
                'onboarding_completed' => true,
                'team_mode' => 'single',
                'discount_approval_threshold' => 0,
                'sale_approval_threshold' => 0,
            ], $shopAttributes));

            // From here on, shop-scoped writes land in the new tenant.
            ActiveShop::force($shop->id);

            $branch = Branch::create([
                'shop_id' => $shop->id,
                'name' => $shopAttributes['branch_name'] ?? ($shop->name.' Branch'),
                'phone' => $shopAttributes['phone'] ?? null,
                'address' => $shopAttributes['address'] ?? null,
                'code' => strtoupper(Str::random(4)),
                'is_active' => true,
                'is_primary' => true,
            ]);

            $roles = RbacTemplates::provisionRoles($shop->id);

            static::seedExpenseCategories($shop);
            static::seedTaxRule($shop);

            User::create([
                'shop_id' => $shop->id,
                'name' => $ownerAttributes['name'],
                'email' => $ownerAttributes['email'],
                'phone' => $ownerAttributes['phone'] ?? null,
                'password' => Hash::make($ownerAttributes['password']),
                'role_id' => $roles['owner']->id,
                'branch_id' => $branch->id,
                'status' => 'active',
                'is_owner' => true,
                'data_scope' => User::SCOPE_ALL,
                'language' => $shop->language,
            ]);

            return $shop->load('branches');
        });
    }

    public static function seedExpenseCategories(Shop $shop): void
    {
        foreach (self::EXPENSE_CATEGORIES as $name) {
            ExpenseCategory::firstOrCreate(
                ['shop_id' => $shop->id, 'slug' => Str::slug($name)],
                ['name' => $name, 'is_system' => true, 'status' => 'active']
            );
        }
    }

    public static function seedTaxRule(Shop $shop): void
    {
        TaxRule::firstOrCreate(
            [
                'shop_id' => $shop->id,
                'name' => 'Estimated Business Tax',
                'effective_from' => now()->startOfYear()->toDateString(),
            ],
            [
                'type' => 'sales',
                'rate' => 10,
                'is_active' => true,
                'is_estimate' => true,
                'notes' => 'Placeholder estimate — configure official rates when verified.',
            ]
        );
    }

    /**
     * Add a second branch to an existing business.
     */
    public static function addBranch(Shop $shop, array $attributes): Branch
    {
        return DB::transaction(function () use ($shop, $attributes) {
            $previous = ActiveShop::id();
            ActiveShop::force($shop->id);

            try {
                return Branch::create(array_merge([
                    'name' => 'New Branch',
                    'is_active' => true,
                    'is_primary' => false,
                    'opening_float' => 0,
                ], $attributes, [
                    'shop_id' => $shop->id,
                    'code' => $attributes['code'] ?? strtoupper(Str::random(4)),
                ]));
            } finally {
                ActiveShop::force($previous);
            }
        });
    }

    /**
     * A role this shop owns by slug.
     */
    public static function role(int $shopId, string $slug): ?Role
    {
        return Role::withoutGlobalScope(\App\Models\Scopes\ShopScope::class)
            ->where('shop_id', $shopId)
            ->where('slug', $slug)
            ->first();
    }
}