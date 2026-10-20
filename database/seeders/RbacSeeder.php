<?php

namespace Database\Seeders;

use App\Services\RbacTemplates;
use Illuminate\Database\Seeder;

/**
 * The permission catalogue is global reference data, so seeding it is a
 * one-off. Roles are per-shop and are created by ShopProvisioner when a
 * business registers (or by BaseSeeder for the demo business).
 */
class RbacSeeder extends Seeder
{
    public function run(): void
    {
        RbacTemplates::syncPermissions();
    }
}