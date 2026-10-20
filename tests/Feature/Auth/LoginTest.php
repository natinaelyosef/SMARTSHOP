<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_view_the_login_page(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/Login'));
    }

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        $user = $this->employee('cashier', ['email' => 'login@example.test']);
        $user->forceFill(['password' => 'secret-password'])->save();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ])->assertRedirect('/pos');

        $this->assertAuthenticatedAs($user);
    }

    public function test_login_on_a_business_that_has_not_finished_setup_lands_on_the_wizard(): void
    {
        $this->shop->update(['onboarding_completed' => false]);

        $user = $this->employee('cashier', ['email' => 'fresh@example.test']);
        $user->forceFill(['password' => 'secret-password'])->save();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ])->assertRedirect(route('onboarding.index'));

        $this->assertAuthenticatedAs($user);
    }

    public function test_login_with_wrong_password_stays_on_the_login_page_with_errors(): void
    {
        $user = $this->employee('cashier', ['email' => 'wrongpw@example.test']);
        $user->forceFill(['password' => 'secret-password'])->save();

        $this->get('/login');

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])
            ->assertRedirect('/login')
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_authenticated_user_is_redirected_from_login_to_dashboard(): void
    {
        $this->actingAs($this->ownerUser)->get('/login')->assertRedirect('/dashboard');
    }

    public function test_logout_returns_to_the_login_page(): void
    {
        $this->actingAs($this->ownerUser)->post('/logout')->assertRedirect('/login');

        $this->assertGuest();
    }

    /**
     * Deactivating an employee must lock them out of every page, not
     * just the ones that happen to carry a permission check.
     */
    public function test_deactivated_employee_is_locked_out(): void
    {
        $user = $this->employee('cashier', ['email' => 'gone@example.test']);
        $user->forceFill(['status' => 'inactive'])->save();

        $this->actingAs($user)->get('/dashboard')->assertRedirect('/login');
        $this->assertGuest();
    }

    /**
     * A freshly invited employee must change the temporary password the
     * owner generated for them.
     */
    public function test_new_employee_is_forced_to_change_their_temporary_password(): void
    {
        $user = $this->employee('cashier', ['email' => 'newbie@example.test']);
        $user->forceFill([
            'password' => bcrypt('temporary-1'),
            'must_change_password' => true,
        ])->save();

        $this->post('/login', ['email' => $user->email, 'password' => 'temporary-1'])
            ->assertRedirect(route('password.force'));
    }
}
