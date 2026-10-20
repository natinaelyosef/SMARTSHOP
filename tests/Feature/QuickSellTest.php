<?php

namespace Tests\Feature;

use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\Sale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class QuickSellTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs($this->ownerUser);
    }

    protected function colaVariant(float $stock = 10, float $cost = 5, float $price = 12): ProductVariant
    {
return $this->makeVariant($stock, $cost, $price, [
            'product' => ['name' => 'Coca-Cola', 'sku' => 'COC-'.uniqid()],
            'variant' => ['name' => '500 ml', 'sku' => 'COC-500-'.uniqid(), 'barcode' => 'BC-'.uniqid()],
        ]);
    }

    public function test_quick_sell_screen_loads_catalog_today_and_next_number(): void
    {
        $this->colaVariant();

        $this->get('/pos')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('pos/Index')
                ->has('variants')
                ->has('categories')
                ->has('customers')
                ->has('shop')
                ->has('today', fn (AssertableInertia $t) => $t
                    ->has('count')
                    ->has('revenue'))
                ->has('next_sale_number')
                ->has('settings'));
    }

    public function test_login_lands_on_quick_sell(): void
    {
        $this->get('/')->assertRedirect('/pos');
    }

    public function test_json_sale_returns_receipt_updates_stock_and_reports(): void
    {
        $variant = $this->colaVariant(10, 5, 12);

        $response = $this->postJson('/sales', [
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 2, 'unit_price' => 12]],
            'payment_method' => 'cash',
            'branch_id' => $this->branch->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('sale.payment_status', 'paid')
            ->assertJsonPath('sale.total', 24)
            ->assertJsonStructure([
                'sale' => ['id', 'sale_number', 'sold_at', 'subtotal', 'total', 'paid_amount', 'remaining_amount', 'items'],
                'stocks',
                'today' => ['count', 'revenue'],
                'shop' => ['name'],
            ]);

        $this->assertEqualsWithDelta(8, $this->stockAt($variant), 0.0001);
        $this->assertEqualsWithDelta(8, $variant->fresh()->stock, 0.0001);
        $this->assertSame(1, Sale::count());

        $sale = Sale::sole();
        $this->assertEqualsWithDelta(14, $sale->profit, 0.0001);
        $this->assertCount(1, $sale->items);
        $this->assertEqualsWithDelta(12, $sale->items->first()->unit_price, 0.0001);

        $this->assertSame(1, InventoryMovement::where('product_variant_id', $variant->id)
            ->where('movement_type', InventoryMovement::TYPES['sale'])->count());

        $this->assertEqualsWithDelta(24, (float) Sale::whereDate('sold_at', today())->sum('total'), 0.0001);
    }

    public function test_one_sale_can_sell_multiple_products_at_once(): void
    {
        $cola = $this->colaVariant(10, 5, 12);
        $water = $this->colaVariant(20, 8, 25);
        $rice = $this->colaVariant(50, 30, 65);

        $response = $this->postJson('/sales', [
            'items' => [
                ['product_variant_id' => $cola->id, 'quantity' => 3, 'unit_price' => 12],
                ['product_variant_id' => $water->id, 'quantity' => 2, 'unit_price' => 25],
                ['product_variant_id' => $rice->id, 'quantity' => 1, 'unit_price' => 65],
            ],
            'discount' => 6,
            'payment_method' => 'cash',
            'branch_id' => $this->branch->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('sale.total', 145)
            ->assertJsonCount(3, 'sale.items');

        $this->assertSame(1, Sale::count());
        $sale = Sale::sole();
        $this->assertCount(3, $sale->items);

        $this->assertEqualsWithDelta(7, $this->stockAt($cola), 0.0001);
        $this->assertEqualsWithDelta(18, $this->stockAt($water), 0.0001);
        $this->assertEqualsWithDelta(49, $this->stockAt($rice), 0.0001);

        foreach ([$cola, $water, $rice] as $variant) {
            $movement = InventoryMovement::where('product_variant_id', $variant->id)
                ->where('movement_type', InventoryMovement::TYPES['sale'])
                ->sole();
            $this->assertSame(Sale::class, $movement->reference_type);
            $this->assertSame($sale->id, $movement->reference_id);
        }

        $this->assertEqualsWithDelta(84, $sale->profit, 0.0001);
    }

    public function test_json_sale_rejects_insufficient_stock_without_side_effects(): void
    {
        $variant = $this->colaVariant(3, 5, 12);

        $response = $this->postJson('/sales', [
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 5, 'unit_price' => 12]],
            'payment_method' => 'cash',
            'branch_id' => $this->branch->id,
        ]);

        $response->assertStatus(422);
        $this->assertSame(0, Sale::count());
        $this->assertEqualsWithDelta(3, $this->stockAt($variant), 0.0001);
        $this->assertSame(0, InventoryMovement::count());
    }

    public function test_guest_cannot_use_quick_sell(): void
    {
        auth()->logout();

        $this->get('/pos')->assertRedirect('/login');
        $this->postJson('/sales', ['items' => []])->assertUnauthorized();
    }
}
