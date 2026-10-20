<?php

namespace Tests\Feature;

use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use App\Services\BranchStockService;
use App\Services\InventoryService;
use App\Services\PurchaseService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseFlowTest extends TestCase
{
    use RefreshDatabase;

    private ProductVariant $variant;

    private Supplier $supplier;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->variant = $this->makeVariant(0, 0, 60, [
            'product' => ['name' => 'Flour', 'sku' => 'FLR-'.uniqid()],
            'variant' => ['name' => '1kg bag', 'sku' => 'FLR-V-'.uniqid()],
        ]);

        $this->supplier = Supplier::create([
            'name' => 'ABC Distributor',
            'status' => 'active',
        ]);

        $this->user = $this->employee('inventory');
    }

    private function purchases(): PurchaseService
    {
        return app(PurchaseService::class);
    }

    public function test_receiving_stock_increases_stock_and_applies_weighted_average_cost(): void
    {
        $first = $this->purchases()->create([
            'supplier_id' => $this->supplier->id,
            'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 10, 'unit_cost' => 8]],
            'paid_amount' => 80,
            'payment_method' => 'cash',
        ], $this->user);

        $this->variant->refresh();

        $this->assertEqualsWithDelta(10, $this->stockAt($this->variant), 0.0001);
        $this->assertEqualsWithDelta(10, $this->variant->stock, 0.0001);
        $this->assertEqualsWithDelta(8, $this->variant->cost, 0.0001);
        $this->assertSame($this->branch->id, $first->branch_id);
        $this->assertSame('paid', $first->payment_status);
        $this->assertEqualsWithDelta(80, $first->total, 0.0001);
        $this->assertEqualsWithDelta(80, $first->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(0, $first->remaining_amount, 0.0001);

        $second = $this->purchases()->create([
            'supplier_id' => $this->supplier->id,
            'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 10, 'unit_cost' => 12]],
            'paid_amount' => 30,
            'payment_method' => 'credit',
        ], $this->user);

        $this->variant->refresh();

        $this->assertEqualsWithDelta(20, $this->stockAt($this->variant), 0.0001);
        $this->assertEqualsWithDelta(20, $this->variant->stock, 0.0001);
        $this->assertEqualsWithDelta(10, $this->variant->cost, 0.0001);
        $this->assertEqualsWithDelta(
            10,
            InventoryService::weightedAverageCost(10, 8, 10, 12),
            0.0001
        );

        $this->assertSame('partial', $second->payment_status);
        $this->assertEqualsWithDelta(120, $second->total, 0.0001);
        $this->assertEqualsWithDelta(30, $second->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(90, $second->remaining_amount, 0.0001);

        $this->assertEqualsWithDelta(90, $this->supplier->refresh()->balance, 0.0001);

        $movements = InventoryMovement::where('product_variant_id', $this->variant->id)
            ->where('movement_type', InventoryMovement::TYPES['purchase'])
            ->orderBy('id')
            ->get();

        $this->assertCount(2, $movements);
        $this->assertEqualsWithDelta(10, $movements[0]->quantity, 0.0001);
        $this->assertEqualsWithDelta(0, $movements[0]->previous_stock, 0.0001);
        $this->assertEqualsWithDelta(10, $movements[0]->new_stock, 0.0001);
        $this->assertEqualsWithDelta(10, $movements[1]->quantity, 0.0001);
        $this->assertEqualsWithDelta(10, $movements[1]->previous_stock, 0.0001);
        $this->assertEqualsWithDelta(20, $movements[1]->new_stock, 0.0001);
        $this->assertSame(Purchase::class, $movements[0]->reference_type);
        $this->assertSame($first->id, $movements[0]->reference_id);

        $this->assertSame(2, Purchase::count());
    }

    public function test_purchase_payment_cannot_exceed_the_remaining_balance(): void
    {
        $purchase = $this->purchases()->create([
            'supplier_id' => $this->supplier->id,
            'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 10, 'unit_cost' => 8]],
            'paid_amount' => 30,
            'payment_method' => 'credit',
        ], $this->user);

        $this->assertEqualsWithDelta(50, $purchase->remaining_amount, 0.0001);

        try {
            $this->purchases()->recordPayment($purchase, [
                'amount' => 50.01,
                'payment_method' => 'cash',
            ], $this->user);

            $this->fail('Expected DomainException was not thrown.');
        } catch (DomainException $e) {
            $this->assertSame('invalid_payment_amount', $e->getMessage());
        }

        $this->purchases()->recordPayment($purchase, [
            'amount' => 50,
            'payment_method' => 'cash',
        ], $this->user);

        $purchase->refresh();

        $this->assertSame('paid', $purchase->payment_status);
        $this->assertEqualsWithDelta(80, $purchase->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(0, $purchase->remaining_amount, 0.0001);
        $this->assertEqualsWithDelta(0, $this->supplier->refresh()->balance, 0.0001);
        $this->assertCount(2, $purchase->payments);
    }
}
