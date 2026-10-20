<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs($this->ownerUser);
    }

    private function payload(): array
    {
        return [
            'name' => 'Green Tea',
            'status' => 'active',
            'variants' => [
                [
                    'name' => '20 bags',
                    'sku' => 'GRT-20',
                    'cost' => 5,
                    'selling_price' => 10,
                    'min_stock' => 2,
                    'stock' => 15,
                ],
            ],
        ];
    }

    public function test_storing_a_product_creates_variant_price_history_and_opening_stock(): void
    {
        $response = $this->post('/products', $this->payload());

        $response->assertRedirect(route('products.show', Product::sole()));

        $product = Product::sole();
        $this->assertSame('Green Tea', $product->name);
        $this->assertSame('active', $product->status);

        $variant = ProductVariant::sole();
        $this->assertSame($product->id, $variant->product_id);
        $this->assertSame('20 bags', $variant->name);
        $this->assertEqualsWithDelta(15, $variant->stock, 0.0001);
        $this->assertEqualsWithDelta(5, $variant->cost, 0.0001);
        $this->assertEqualsWithDelta(10, $variant->selling_price, 0.0001);

        $priceHistory = PriceHistory::sole();
        $this->assertSame($variant->id, $priceHistory->product_variant_id);
        $this->assertEqualsWithDelta(0, $priceHistory->old_price, 0.0001);
        $this->assertEqualsWithDelta(10, $priceHistory->new_price, 0.0001);
        $this->assertSame('Initial price', $priceHistory->reason);

        $movement = InventoryMovement::sole();
        $this->assertSame(InventoryMovement::TYPES['initial_stock'], $movement->movement_type);
        $this->assertSame($variant->id, $movement->product_variant_id);
        $this->assertEqualsWithDelta(15, $movement->quantity, 0.0001);
        $this->assertEqualsWithDelta(0, $movement->previous_stock, 0.0001);
        $this->assertEqualsWithDelta(15, $movement->new_stock, 0.0001);
    }

    public function test_product_listing_includes_the_created_product(): void
    {
        $this->post('/products', $this->payload());

        $this->get('/products')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('products/Index')
                ->has('products.data')
                ->where('products.data.0.name', 'Green Tea')
                ->where('products.data.0.status', 'active'));
    }

    public function test_archiving_a_product_keeps_the_record(): void
    {
        $this->post('/products', $this->payload());

        $product = Product::sole();

        $this->delete("/products/{$product->id}/archive")
            ->assertRedirect(route('products.index'));

        $product->refresh();

        $this->assertSame('archived', $product->status);
        $this->assertSame(1, Product::count());
        $this->assertNotNull(Product::find($product->id));
        $this->assertSame(1, ProductVariant::count());
        $this->assertSame(1, PriceHistory::count());
    }

    public function test_category_can_be_created_and_listed(): void
    {
        $this->post('/categories', ['name' => 'Beverages'])
            ->assertSessionHas('success');

        $category = Category::sole();
        $this->assertSame('Beverages', $category->name);

        $this->get('/categories')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('categories/Index')
                ->has('categories', 1)
                ->where('categories.0.name', 'Beverages'));
    }

    public function test_deleting_a_category_keeps_products_uncategorized(): void
    {
        $this->post('/categories', ['name' => 'Beverages']);
        $category = Category::sole();

        $payload = $this->payload();
        $payload['category_id'] = $category->id;
        $this->post('/products', $payload);

        $this->delete("/categories/{$category->id}")
            ->assertRedirect();

        $this->assertSame(0, Category::count());
        $this->assertSame(1, Product::count());
        $this->assertNull(Product::sole()->category_id);
        $this->assertSame(1, ProductVariant::count());
    }

    public function test_removing_a_product_hides_it_from_the_listing_but_keeps_the_record(): void
    {
        $this->post('/products', $this->payload());
        $product = Product::sole();

        $this->delete("/products/{$product->id}")
            ->assertRedirect(route('products.index'));

        $product->refresh();
        $this->assertSame('deleted', $product->status);

        $this->get('/products')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('products/Index')
                ->has('products.data', 0));

        $this->assertSame(1, Product::count());
        $this->assertSame(1, ProductVariant::count());
        $this->assertSame(1, PriceHistory::count());
    }

    public function test_changing_a_variant_price_records_history(): void
    {
        $this->post('/products', $this->payload());
        $variant = ProductVariant::sole();

        $this->post("/variants/{$variant->id}/price", ['selling_price' => 15, 'reason' => 'Promo'])
            ->assertSessionHas('success');

        $this->assertEqualsWithDelta(15, $variant->fresh()->selling_price, 0.0001);
        $this->assertSame(2, PriceHistory::count());

        $latest = PriceHistory::latest('id')->first();
        $this->assertSame($variant->id, $latest->product_variant_id);
        $this->assertEqualsWithDelta(10, $latest->old_price, 0.0001);
        $this->assertEqualsWithDelta(15, $latest->new_price, 0.0001);
        $this->assertSame('Promo', $latest->reason);
    }

    public function test_cashier_cannot_delete_categories_or_products(): void
    {
        $this->post('/categories', ['name' => 'Beverages']);
        $category = Category::sole();
        $this->post('/products', $this->payload());
        $product = Product::sole();

        $cashier = $this->employee('cashier', ['email' => 'cashier-catalog@example.test']);

        $this->actingAs($cashier)
            ->delete("/categories/{$category->id}")
            ->assertForbidden();

        $this->actingAs($cashier)
            ->delete("/products/{$product->id}")
            ->assertForbidden();

        $this->assertSame(1, Category::count());
        $this->assertSame('active', $product->fresh()->status);
    }
}
