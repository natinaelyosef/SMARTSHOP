<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Scopes\ShopScope;
use App\Models\User;

/**
 * The permission catalogue and the default roles every new business
 * starts with.
 *
 * Permissions are global (shared reference data). Roles are per-shop,
 * so two businesses can customise the same role name without affecting
 * each other.
 */
class RbacTemplates
{
    /**
     * slug => [label, module]
     */
    public const PERMISSIONS = [
        'dashboard.view' => ['View dashboard', 'dashboard'],
        'products.view' => ['View products', 'products'],
        'products.manage' => ['Manage products', 'products'],
        'categories.manage' => ['Manage categories', 'products'],
        'units.manage' => ['Manage units', 'products'],
        'price.manage' => ['Change selling prices', 'products'],
        'inventory.view' => ['View inventory', 'inventory'],
        'inventory.manage' => ['Manage stock movements', 'inventory'],
        'inventory.transfer' => ['Transfer stock between branches', 'inventory'],
        'purchases.view' => ['View purchases', 'purchases'],
        'purchases.manage' => ['Manage purchases', 'purchases'],
        'suppliers.view' => ['View suppliers', 'suppliers'],
        'suppliers.manage' => ['Manage suppliers', 'suppliers'],
        'customers.view' => ['View customers', 'customers'],
        'customers.manage' => ['Manage customers', 'customers'],
        'sales.view' => ['View sales', 'sales'],
        'sales.create' => ['Create sales (POS)', 'sales'],
        'sales.manage' => ['Manage returns & sale payments', 'sales'],
        'expenses.view' => ['View expenses', 'expenses'],
        'expenses.manage' => ['Manage expenses', 'expenses'],
        'rent.view' => ['View rent', 'rent'],
        'rent.manage' => ['Manage rent', 'rent'],
        'finance.view' => ['View finance', 'finance'],
        'finance.manage' => ['Record financial payments', 'finance'],
        'reports.view' => ['View reports', 'reports'],
        'reports.export' => ['Export reports', 'reports'],
        'staff.view' => ['View employee performance', 'staff'],
        'shifts.view' => ['View shifts & drawer', 'staff'],
        'shifts.manage' => ['Open & close shifts', 'staff'],
        'approvals.view' => ['View approval requests', 'staff'],
        'approvals.review' => ['Approve or reject requests', 'staff'],
        'tax.view' => ['View tax', 'tax'],
        'tax.manage' => ['Manage tax', 'tax'],
        'insights.view' => ['View business insights', 'insights'],
        'notifications.view' => ['View notifications', 'notifications'],
        'audit.view' => ['View audit history', 'audit'],
        'branches.view' => ['View branches', 'branches'],
        'branches.manage' => ['Manage branches', 'branches'],
        'users.manage' => ['Manage employees', 'users'],
        'roles.manage' => ['Manage roles & permissions', 'users'],
        'settings.view' => ['View settings', 'settings'],
        'settings.manage' => ['Manage settings', 'settings'],
        'backup.manage' => ['Backup & restore', 'settings'],
    ];

    /**
     * Role slug => [label, description, permissions]
     */
    public const ROLES = [
        'owner' => [
            'Owner',
            'Full access to every module, branch and setting.',
            ['*'],
        ],
        'manager' => [
            'Manager',
            'Runs day-to-day operations across every branch.',
            [
                'dashboard.view', 'products.view', 'products.manage', 'categories.manage', 'units.manage', 'price.manage',
                'inventory.view', 'inventory.manage', 'inventory.transfer', 'purchases.view', 'purchases.manage',
                'suppliers.view', 'suppliers.manage', 'customers.view', 'customers.manage',
                'sales.view', 'sales.create', 'sales.manage',
                'expenses.view', 'expenses.manage', 'rent.view', 'rent.manage',
                'finance.view', 'finance.manage', 'reports.view', 'reports.export',
                'staff.view', 'shifts.view', 'shifts.manage', 'approvals.view', 'approvals.review',
                'tax.view', 'insights.view', 'notifications.view', 'branches.view', 'audit.view', 'settings.view',
            ],
        ],
        'cashier' => [
            'Cashier',
            'Works the register: creates sales, opens and closes their own shift.',
            [
                'dashboard.view', 'products.view', 'inventory.view',
                'sales.view', 'sales.create', 'customers.view', 'customers.manage',
                'shifts.view', 'shifts.manage', 'notifications.view',
            ],
        ],
        'inventory' => [
            'Inventory Staff',
            'Receives purchases, adjusts stock and moves it between branches.',
            [
                'dashboard.view', 'products.view', 'inventory.view', 'inventory.manage', 'inventory.transfer',
                'purchases.view', 'purchases.manage', 'suppliers.view', 'suppliers.manage',
                'shifts.view', 'notifications.view',
            ],
        ],
        'accountant' => [
            'Accountant',
            'Owns expenses, rent, tax and the financial reports.',
            [
                'dashboard.view', 'sales.view', 'purchases.view', 'suppliers.view', 'customers.view',
                'expenses.view', 'expenses.manage', 'rent.view', 'rent.manage',
                'finance.view', 'finance.manage', 'reports.view', 'reports.export',
                'staff.view', 'tax.view', 'tax.manage',
                'insights.view', 'audit.view', 'notifications.view',
            ],
        ],
    ];

    /**
     * Create the global permission catalogue. Safe to run repeatedly.
     *
     * @return array<string, Permission>
     */
    public static function syncPermissions(): array
    {
        $permissions = [];

        foreach (self::PERMISSIONS as $slug => [$label, $module]) {
            $permissions[$slug] = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $label, 'module' => $module]
            );
        }

        return $permissions;
    }

    /**
     * Give a shop its own copy of every default role.
     *
     * @return array<string, Role>
     */
    public static function provisionRoles(int $shopId): array
    {
        $permissions = static::syncPermissions();
        $roles = [];

        foreach (self::ROLES as $slug => [$name, $description, $slugs]) {
            $role = Role::withoutGlobalScope(ShopScope::class)->updateOrCreate(
                ['shop_id' => $shopId, 'slug' => $slug],
                ['name' => $name, 'description' => $description, 'is_system' => true]
            );

            if ($slugs === ['*']) {
                $role->permissions()->sync($permissions);
            } else {
                $role->permissions()->sync(
                    collect($permissions)->only($slugs)->values()->all()
                );
            }

            $roles[$slug] = $role;
        }

        return $roles;
    }

    /**
     * Roles that may approve other people's requests.
     *
     * @return array<int, string>
     */
    public static function approverRoles(): array
    {
        return ['owner', 'manager'];
    }

    public static function canApprove(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasPermission('approvals.review')) {
            return true;
        }

        return in_array($user->role?->slug, static::approverRoles(), true);
    }
}