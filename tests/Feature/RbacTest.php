<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Resolved through the signed-in user, like a real request.
        \App\Services\ActiveShop::force(null);
    }

    private function userWithRole(string $slug): User
    {
        return $this->employee($slug, ['email' => $slug.'@example.test']);
    }

    public function test_cashier_can_only_reach_permitted_pages(): void
    {
        $cashier = $this->userWithRole('cashier');

        $this->actingAs($cashier)->get('/dashboard')->assertOk();
        $this->actingAs($cashier)->get('/pos')->assertOk();
        $this->actingAs($cashier)->get('/settings')->assertForbidden();
        $this->actingAs($cashier)->get('/users')->assertForbidden();
    }

    public function test_owner_can_reach_settings(): void
    {
        $this->actingAs($this->ownerUser)->get('/settings')->assertOk();
    }

    public function test_shared_props_expose_effective_permissions(): void
    {
        $cashier = $this->userWithRole('cashier');
        $admin = $this->ownerUser;

        $this->actingAs($cashier)->get('/dashboard')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard/Index')
                ->has('auth.user.permissions')
                ->where('auth.user.permissions', fn ($permissions) => $this->permissionSlugs($permissions)->contains('dashboard.view')
                    && $this->permissionSlugs($permissions)->contains('sales.create')
                    && ! $this->permissionSlugs($permissions)->contains('settings.manage')
                    && ! $this->permissionSlugs($permissions)->contains('users.manage')));

        $this->actingAs($admin)->get('/dashboard')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('auth.user.role_slug', 'owner')
                ->where('auth.user.permissions', fn ($permissions) => $this->permissionSlugs($permissions)->contains('*')));
    }

    /**
     * Employees may only reach branches they are allowed to work at.
     */
    public function test_branch_locked_employee_cannot_switch_branch(): void
    {
        $cashier = $this->userWithRole('cashier');
        $otherBranch = $this->addBranch($this->shop, 'Locked Branch');

        $this->actingAs($cashier)
            ->post('/branches/switch', ['branch_id' => $otherBranch->id])
            ->assertForbidden();

        $this->actingAs($cashier)
            ->post('/branches/switch', ['branch_id' => $this->branch->id])
            ->assertRedirect();

        $this->assertSame($this->branch->id, \App\Services\BranchContext::id());
    }

    public function test_manager_with_all_scope_can_switch_branch(): void
    {
        $manager = $this->employee('manager', [
            'email' => 'multi-branch@example.test',
            'data_scope' => User::SCOPE_ALL,
        ]);
        $otherBranch = $this->addBranch($this->shop, 'Second Branch');

        $this->actingAs($manager)
            ->post('/branches/switch', ['branch_id' => $otherBranch->id])
            ->assertRedirect();

        $this->assertSame($otherBranch->id, \App\Services\BranchContext::id());
    }

    public function test_a_role_from_another_business_cannot_be_assigned(): void
    {
        $rival = $this->otherShop();
        $rivalRoleId = \App\Services\ActiveShop::runIn(
            $rival->id,
            fn () => \App\Models\Role::where('slug', 'cashier')->value('id')
        );

        $this->actingAs($this->ownerUser)
            ->post('/users', [
                'name' => 'Trespasser',
                'email' => 'trespasser@example.test',
                'password' => 'secret-123',
                'password_confirmation' => 'secret-123',
                'role_id' => $rivalRoleId,
                'branch_id' => $this->branch->id,
                'data_scope' => User::SCOPE_BRANCH,
                'status' => 'active',
            ])
            ->assertSessionHasErrors('role_id');
    }

    private function permissionSlugs($permissions): Collection
    {
        return collect($permissions);
    }
}
