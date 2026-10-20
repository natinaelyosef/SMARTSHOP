<?php

namespace Tests\Feature;

use App\Models\Shop;
use App\Models\User;
use App\Services\ActiveShop;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class OwnerAccountTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Registration runs before anyone is signed in, so the shop is found
     * through the database rather than the tenant resolver.
     */
    private function shopNamed(string $name): ?Shop
    {
        return Shop::where('name', $name)->first();
    }

    private function userForShop(int $shopId, string $email): User
    {
        // Relations must be eager loaded inside the tenant context,
        // otherwise the role lookup falls back to the caller's shop.
        return ActiveShop::runIn(
            $shopId,
            fn () => User::with('role:id,name,slug')->where('email', $email)->firstOrFail()
        );
    }

    public function test_registering_creates_a_brand_new_business_with_an_owner(): void
    {
        $response = $this->post('/register', [
            'name' => 'Abebe Kebede',
            'email' => 'owner@shop.et',
            'phone' => '0911111111',
            'password' => 'secret-123',
            'password_confirmation' => 'secret-123',
            'shop_name' => 'Abebe Shop',
            'shop_phone' => '0111111111',
        ]);

        $shop = $this->shopNamed('Abebe Shop');
        $this->assertNotNull($shop);
        $this->assertSame('single', $shop->team_mode);

        $user = $this->userForShop($shop->id, 'owner@shop.et');
        $this->assertSame('owner', $user->role->slug);
        $this->assertTrue($user->is_owner);
        $this->assertTrue(Hash::check('secret-123', $user->password));

        // The owner starts on their own primary branch.
        $primaryBranchId = ActiveShop::runIn(
            $shop->id,
            fn () => \App\Models\Branch::where('is_primary', true)->value('id')
        );

        $this->assertNotNull($primaryBranchId);
        $this->assertSame($primaryBranchId, $user->branch_id);

        $response->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_registration_supports_employees_team_mode(): void
    {
        $this->post('/register', [
            'name' => 'Team Owner',
            'email' => 'team@shop.et',
            'password' => 'secret-123',
            'password_confirmation' => 'secret-123',
            'shop_name' => 'Team Shop',
            'team_mode' => 'team',
        ])->assertRedirect(route('login'));

        $this->assertSame('team', $this->shopNamed('Team Shop')->team_mode);
        $this->assertGuest();
    }

    public function test_registration_rejects_unknown_team_mode(): void
    {
        $before = DB::table('users')->count();

        $this->post('/register', [
            'name' => 'Boss',
            'email' => 'boss@shop.et',
            'password' => 'secret-123',
            'password_confirmation' => 'secret-123',
            'shop_name' => 'Boss Shop',
            'team_mode' => 'boss',
        ])->assertSessionHasErrors('team_mode');

        // A rejected registration creates neither a user nor a business.
        $this->assertSame($before, DB::table('users')->count());
        $this->assertNull($this->shopNamed('Boss Shop'));
        $this->assertGuest();
    }

    /**
     * The behaviour that changed most: a second registration used to
     * overwrite the existing business. Now it creates a separate one.
     */
    public function test_a_second_registration_creates_a_separate_business(): void
    {
        $firstShop = $this->shop;
        $firstOwner = $this->ownerUser;

        $this->post('/register', [
            'name' => 'Second Owner',
            'email' => 'second@shop.et',
            'password' => 'secret-123',
            'password_confirmation' => 'secret-123',
            'shop_name' => 'Second Shop',
            'team_mode' => 'team',
        ])->assertRedirect(route('login'));

        $secondShop = $this->shopNamed('Second Shop');

        $this->assertNotNull($secondShop);
        $this->assertNotSame($firstShop->id, $secondShop->id);

        // The original business is untouched.
        $firstShop->refresh();
        $this->assertSame('Test Shop', $firstShop->name);
        $this->assertSame('single', $firstShop->team_mode);

        // Each owner belongs only to their own business.
        $secondOwner = $this->userForShop($secondShop->id, 'second@shop.et');
        $this->assertSame($secondShop->id, $secondOwner->shop_id);
        $this->assertNotSame($firstShop->id, $secondOwner->shop_id);
        $this->assertSame('owner', $secondOwner->role->slug);
    }

    public function test_owner_can_reset_a_forgotten_password(): void
    {
        Notification::fake();

        $user = $this->ownerUser;
        $user->forceFill(['password' => Hash::make('forgotten')])->save();

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect();

        Notification::assertSentTo($user, ResetPasswordNotification::class);

        $token = Password::createToken($user);

        $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'brand-new-1',
            'password_confirmation' => 'brand-new-1',
        ])->assertRedirect(route('login'));

        $this->assertTrue(Hash::check('brand-new-1', $user->refresh()->password));

        $this->post('/login', ['email' => $user->email, 'password' => 'brand-new-1'])
            ->assertRedirect('/pos');
    }

    public function test_owner_can_view_and_update_profile(): void
    {
        $user = $this->ownerUser;
        $this->actingAs($user);

        $this->get('/profile')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('profile/Index')
                ->has('owner')
                ->has('shop'));

        $this->put('/profile', [
            'name' => 'New Name',
            'email' => $user->email,
            'phone' => '0922222222',
            'language' => 'am',
        ])->assertRedirect();

        $user->refresh();
        $this->assertSame('New Name', $user->name);
        $this->assertSame('0922222222', $user->phone);
        $this->assertSame('am', $user->language);
    }

    public function test_owner_can_change_password_with_current_password(): void
    {
        $user = $this->ownerUser;
        $user->forceFill(['password' => Hash::make('old-secret')])->save();
        $this->actingAs($user);

        $this->put('/profile/password', [
            'current_password' => 'wrong-secret',
            'password' => 'new-secret-1',
            'password_confirmation' => 'new-secret-1',
        ])->assertSessionHasErrors('current_password');

        $this->put('/profile/password', [
            'current_password' => 'old-secret',
            'password' => 'new-secret-1',
            'password_confirmation' => 'new-secret-1',
        ])->assertRedirect();

        $this->assertTrue(Hash::check('new-secret-1', $user->refresh()->password));
    }

    public function test_finishing_setup_lands_on_sell(): void
    {
        $this->shop->update(['onboarding_completed' => false]);
        $this->actingAs($this->ownerUser);

        $this->post('/settings/onboarding/complete')->assertRedirect(route('pos'));
        $this->assertTrue($this->shop->refresh()->onboarding_completed);
    }
}