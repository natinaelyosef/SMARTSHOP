<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Shop;
use App\Services\ActiveShop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class MultiTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_a_separate_shop_per_business(): void
    {
        $first = $this->shop;
        $second = $this->otherShop();

        $this->assertNotSame($first->id, $second->id);

        $this->assertDatabaseHas('shops', ['id' => $first->id, 'name' => 'Test Shop']);
        $this->assertDatabaseHas('shops', ['id' => $second->id, 'name' => 'Rival Shop']);

        // Each business got its own roles rather than sharing a set.
        $this->assertDatabaseHas('roles', ['shop_id' => $first->id, 'slug' => 'owner']);
        $this->assertDatabaseHas('roles', ['shop_id' => $second->id, 'slug' => 'owner']);

        $this->assertNotSame(
            $first->roles()->where('slug', 'owner')->value('id'),
            $second->roles()->where('slug', 'owner')->value('id'),
        );
    }

    public function test_businesses_cannot_see_each_others_products(): void
    {
        $mine = $this->makeProduct('My Coffee', 'MY-1');

        $rival = $this->otherShop();

        $rivalProduct = ActiveShop::runIn($rival->id, fn () => $this->makeProduct('Rival Tea', 'RV-1'));

        ActiveShop::force($this->shop->id);
        $this->assertSame(['My Coffee'], Product::pluck('name')->all());
        $this->assertNull(Product::find($rivalProduct->id));

        ActiveShop::force($rival->id);
        $this->assertSame(['Rival Tea'], Product::pluck('name')->all());
        $this->assertNull(Product::find($mine->id));

        ActiveShop::force($this->shop->id);
    }

    public function test_a_user_only_ever_resolves_to_their_own_shop(): void
    {
        $rivalOwner = $this->otherShopOwner();
        $rival = Shop::findOrFail($rivalOwner->shop_id);

        // No forced tenant: resolution must come from the signed-in user,
        // exactly as it does in a real request.
        ActiveShop::force(null);

        $this->actingAs($rivalOwner);
        $this->assertSame($rival->id, ActiveShop::id());

        $this->actingAs($this->ownerUser);
        $this->assertSame($this->shop->id, ActiveShop::id());
    }

    public function test_platform_admins_must_pick_a_business_before_working(): void
    {
        $rivalOwner = $this->otherShopOwner();
        $rivalOwner->forceFill(['is_platform_admin' => true])->save();
        $rival = Shop::findOrFail($rivalOwner->shop_id);

        ActiveShop::force(null);
        $this->actingAs($rivalOwner);

        $this->assertTrue(ActiveShop::mustChooseShop());
        $this->get('/dashboard')->assertRedirect(route('shops.select'));

        $this->post(route('shops.enter', $rival));
        $this->assertSame($rival->id, ActiveShop::id());
    }

    public function test_queries_fail_closed_without_a_shop_context(): void
    {
        ActiveShop::force(null);

        // No auth user and no forced tenant — nothing may be returned.
        $this->assertSame(0, Product::count());
    }

    public function test_dashboard_reports_the_signed_in_users_business(): void
    {
        $this->otherShop();

        $this->actingAs($this->owner())->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard/Index')
                ->where('shop.name', 'Test Shop'));
    }

    protected function makeProduct(string $name, string $sku): Product
    {
        $product = Product::create([
            'name' => $name,
            'sku' => $sku,
            'status' => 'active',
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Default',
            'sku' => $sku.'-D',
            'cost' => 10,
            'selling_price' => 20,
            'min_stock' => 2,
            'stock' => 0,
            'status' => 'active',
        ]);

        return $product;
    }
}