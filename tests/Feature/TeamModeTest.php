<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class TeamModeTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = $this->ownerUser;

        $this->actingAs($this->owner);
    }

    public function test_owner_can_switch_between_single_and_team_mode(): void
    {
        $this->post('/settings/team-mode', ['team_mode' => 'team'])
            ->assertRedirect();
        $this->assertSame('team', $this->shop->refresh()->team_mode);

        $this->post('/settings/team-mode', ['team_mode' => 'single'])
            ->assertRedirect();
        $this->assertSame('single', $this->shop->refresh()->team_mode);

        $this->post('/settings/team-mode', ['team_mode' => 'crowd'])
            ->assertSessionHasErrors('team_mode');
    }

    public function test_employee_without_settings_permission_cannot_switch_mode(): void
    {
        $cashier = $this->employee('cashier');

        $this->actingAs($cashier)
            ->post('/settings/team-mode', ['team_mode' => 'team'])
            ->assertForbidden();
    }

    public function test_owner_can_create_employee_and_delegate_a_job(): void
    {
        $role = $this->role('cashier');

        $this->post('/users', [
            'name' => 'Yonas Getu',
            'email' => 'yonas@example.test',
            'phone' => '0911111111',
            'password' => 'secret-123',
            'password_confirmation' => 'secret-123',
            'role_id' => $role->id,
            'branch_id' => $this->branch->id,
            'data_scope' => \App\Models\User::SCOPE_BRANCH,
            'status' => 'active',
        ])->assertRedirect();

        $employee = User::where('email', 'yonas@example.test')->firstOrFail();
        $this->assertSame('cashier', $employee->role->slug);
        $this->assertTrue($employee->hasPermission('sales.create'));
        $this->assertFalse($employee->hasPermission('settings.manage'));
    }

    public function test_owner_cannot_deactivate_or_demote_themselves(): void
    {
        $this->put("/users/{$this->owner->id}", [
            'name' => $this->owner->name,
            'email' => $this->owner->email,
            'role_id' => $this->owner->role_id,
            'branch_id' => $this->owner->branch_id,
            'data_scope' => \App\Models\User::SCOPE_ALL,
            'status' => 'inactive',
        ])->assertSessionHasErrors('status');
        $this->assertSame('active', $this->owner->refresh()->status);

        $cashierRole = $this->role('cashier');
        $this->put("/users/{$this->owner->id}", [
            'name' => $this->owner->name,
            'email' => $this->owner->email,
            'role_id' => $cashierRole->id,
            'branch_id' => $this->owner->branch_id,
            'data_scope' => \App\Models\User::SCOPE_ALL,
            'status' => 'active',
        ])->assertSessionHasErrors('role_id');
        $this->assertSame('owner', $this->owner->refresh()->role->slug);
    }

    public function test_staff_page_shows_mode_jobs_and_current_user(): void
    {
        $this->get('/users')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('users/Index')
                ->has('team_mode')
                ->has('branches')
                ->where('current_user_id', $this->owner->id)
                ->has('roles', 5)
                ->has('roles.0.permissions_count'));
    }
}
