<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Role;
use App\Models\Shop;
use App\Models\Unit;
use App\Models\User;
use App\Services\ActiveShop;
use App\Services\BranchStockService;
use App\Services\ShopProvisioner;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates the demo business: "SmartShop Manager" with two branches, its
 * own roles and a small team of employees.
 */
class BaseSeeder extends Seeder
{
    public function run(): void
    {
        if (Shop::where('name', 'SmartShop Manager')->exists()) {
            return;
        }

        $shop = ShopProvisioner::provision(
            [
                'name' => 'SmartShop Manager',
                'address' => 'Bole Road, Addis Ababa',
                'phone' => '+251 911 234 567',
                'email' => 'info@smartshop.et',
                'branch_name' => 'Addis Branch',
            ],
            [
                'name' => 'Shop Owner',
                'email' => 'admin@smartshop.et',
                'phone' => '+251 911 234 567',
                'password' => 'password',
            ]
        );

        ActiveShop::force($shop->id);

        $addis = $shop->defaultBranch();

        $lidiya = ShopProvisioner::addBranch($shop, [
            'name' => 'Lidiya Branch',
            'code' => 'LDY',
            'address' => 'Lidiya, Addis Ababa',
            'phone' => '+251 911 555 000',
        ]);

        // Units are a shared vocabulary across every business.
        $units = [
            ['Piece', 'pc'], ['Box', 'box'], ['Pack', 'pk'], ['Bottle', 'btl'], ['Can', 'can'],
            ['Kilogram', 'kg'], ['Gram', 'g'], ['Liter', 'L'], ['Milliliter', 'ml'], ['Meter', 'm'],
        ];

        foreach ($units as [$name, $short]) {
            Unit::firstOrCreate(['slug' => Str::slug($name)], [
                'name' => $name, 'short_name' => $short, 'is_system' => true, 'status' => 'active',
            ]);
        }

        $roles = Role::where('shop_id', $shop->id)->pluck('id', 'slug');

        $employees = [
            ['Mekdes Alemu', 'manager@smartshop.et', 'manager', $addis->id, User::SCOPE_ALL],
            ['Yonas Getu', 'cashier@smartshop.et', 'cashier', $addis->id, User::SCOPE_BRANCH],
            ['Samuel Tesfaye', 'inventory@smartshop.et', 'inventory', $addis->id, User::SCOPE_BRANCH],
            ['Hanna Bekele', 'accountant@smartshop.et', 'accountant', null, User::SCOPE_ALL],
            ['Dawit Girma', 'cashier.lidiya@smartshop.et', 'cashier', $lidiya->id, User::SCOPE_BRANCH],
        ];

        foreach ($employees as [$name, $email, $role, $branchId, $scope]) {
            User::firstOrCreate(
                ['email' => $email],
                [
                    'shop_id' => $shop->id,
                    'name' => $name,
                    'password' => Hash::make('password'),
                    'role_id' => $roles[$role] ?? null,
                    'branch_id' => $branchId,
                    'data_scope' => $scope,
                    'status' => 'active',
                    'language' => 'en',
                    'password_changed_at' => now(),
                ]
            );
        }
    }
}