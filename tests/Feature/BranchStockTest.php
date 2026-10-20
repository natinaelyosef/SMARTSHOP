<?php

namespace Tests\Feature;

use App\Models\BranchStock;
use App\Models\InventoryMovement;
use App\Services\BranchStockService;
use App\Services\Sequence;
use App\Services\StockTransferService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchStockTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_branch_holds_its_own_quantity(): void
    {
        $variant = $this->makeVariant(0, 5, 10);
        $second = $this->addBranch($this->shop, 'Second Branch');

        $this->setStock($variant, 10, $this->branch->id);
        $this->setStock($variant, 3, $second->id);

        $this->assertEqualsWithDelta(10, $this->stockAt($variant, $this->branch->id), 0.0001);
        $this->assertEqualsWithDelta(3, $this->stockAt($variant, $second->id), 0.0001);

        // The chain-wide cached total is the sum across branches.
        $this->assertEqualsWithDelta(13, $variant->fresh()->stock, 0.0001);
    }

    public function test_selling_at_one_branch_leaves_the_other_untouched(): void
    {
        $variant = $this->makeVariant(0, 5, 10);
        $second = $this->addBranch($this->shop, 'Second Branch');

        $this->setStock($variant, 10, $this->branch->id);
        $this->setStock($variant, 8, $second->id);

        $cashier = $this->employee('cashier', ['email' => 'a@example.test', 'branch_id' => $this->branch->id]);

        app(\App\Services\SalesService::class)->create([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 4]],
            'payment_method' => 'cash',
            'branch_id' => $this->branch->id,
        ], $cashier);

        $this->assertEqualsWithDelta(6, $this->stockAt($variant, $this->branch->id), 0.0001);
        $this->assertEqualsWithDelta(8, $this->stockAt($variant, $second->id), 0.0001);
        $this->assertEqualsWithDelta(14, $variant->fresh()->stock, 0.0001);
    }

    public function test_cannot_sell_more_than_the_branch_actually_holds(): void
    {
        $variant = $this->makeVariant(0, 5, 10);
        $second = $this->addBranch($this->shop, 'Second Branch');

        // Plenty of stock overall, but none at this branch.
        $this->setStock($variant, 0, $this->branch->id);
        $this->setStock($variant, 50, $second->id);

        $cashier = $this->employee('cashier', ['email' => 'b@example.test', 'branch_id' => $this->branch->id]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('insufficient_stock');

        app(\App\Services\SalesService::class)->create([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'branch_id' => $this->branch->id,
        ], $cashier);
    }

    public function test_purchases_land_at_the_receiving_branch_only(): void
    {
        $variant = $this->makeVariant(0, 0, 20);
        $second = $this->addBranch($this->shop, 'Second Branch');

        $supplier = \App\Models\Supplier::create(['name' => 'Supplier', 'status' => 'active']);
        $staff = $this->employee('inventory', ['email' => 'inv@example.test', 'branch_id' => $this->branch->id]);

        app(\App\Services\PurchaseService::class)->create([
            'supplier_id' => $supplier->id,
            'branch_id' => $this->branch->id,
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 20, 'unit_cost' => 8]],
            'paid_amount' => 160,
            'payment_method' => 'cash',
        ], $staff);

        $this->assertEqualsWithDelta(20, $this->stockAt($variant, $this->branch->id), 0.0001);
        $this->assertEqualsWithDelta(0, $this->stockAt($variant, $second->id), 0.0001);
    }

    public function test_transfer_moves_stock_between_branches(): void
    {
        $variant = $this->makeVariant(0, 5, 10);
        $second = $this->addBranch($this->shop, 'Second Branch');

        $this->setStock($variant, 20, $this->branch->id);

        $manager = $this->employee('manager', [
            'email' => 'mgr@example.test',
            'data_scope' => \App\Models\User::SCOPE_ALL,
        ]);

        $transfer = app(StockTransferService::class)->create($manager, [
            'from_branch_id' => $this->branch->id,
            'to_branch_id' => $second->id,
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 6]],
            'notes' => 'Topping up',
        ]);

        $this->assertStringStartsWith('TRF-', $transfer->transfer_number);
        $this->assertEqualsWithDelta(14, $this->stockAt($variant, $this->branch->id), 0.0001);
        $this->assertEqualsWithDelta(6, $this->stockAt($variant, $second->id), 0.0001);
        $this->assertEqualsWithDelta(20, $variant->fresh()->stock, 0.0001);

        // One out, one in, both tagged as transfers.
        $movements = InventoryMovement::where('product_variant_id', $variant->id)
            ->where('movement_type', InventoryMovement::TYPES['transfer'])
            ->get();

        $this->assertCount(2, $movements);
        $this->assertEqualsWithDelta(-6, $movements->firstWhere('branch_id', $this->branch->id)->quantity, 0.0001);
        $this->assertEqualsWithDelta(6, $movements->firstWhere('branch_id', $second->id)->quantity, 0.0001);
    }

    public function test_transfer_cannot_exceed_what_the_source_branch_holds(): void
    {
        $variant = $this->makeVariant(0, 5, 10);
        $second = $this->addBranch($this->shop, 'Second Branch');

        $this->setStock($variant, 3, $this->branch->id);

        $manager = $this->employee('manager', [
            'email' => 'mgr2@example.test',
            'data_scope' => \App\Models\User::SCOPE_ALL,
        ]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('insufficient_stock');

        app(StockTransferService::class)->create($manager, [
            'from_branch_id' => $this->branch->id,
            'to_branch_id' => $second->id,
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 10]],
        ]);
    }

    public function test_a_transfer_can_be_reversed(): void
    {
        $service = app(StockTransferService::class);
        $variant = $this->makeVariant(0, 5, 10);
        $second = $this->addBranch($this->shop, 'Second Branch');

        $this->setStock($variant, 10, $this->branch->id);

        $manager = $this->employee('manager', [
            'email' => 'mgr3@example.test',
            'data_scope' => \App\Models\User::SCOPE_ALL,
        ]);

        $transfer = $service->create($manager, [
            'from_branch_id' => $this->branch->id,
            'to_branch_id' => $second->id,
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 4]],
        ]);

        $service->reverse($manager, $transfer);

        $this->assertEqualsWithDelta(10, $this->stockAt($variant, $this->branch->id), 0.0001);
        $this->assertEqualsWithDelta(0, $this->stockAt($variant, $second->id), 0.0001);
    }

    public function test_a_branch_locked_employee_cannot_transfer_out_of_another_branch(): void
    {
        $variant = $this->makeVariant(0, 5, 10);
        $second = $this->addBranch($this->shop, 'Second Branch');

        $this->setStock($variant, 10, $second->id);

        $cashier = $this->employee('cashier', ['email' => 'c@example.test', 'branch_id' => $this->branch->id]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('branch_forbidden');

        app(StockTransferService::class)->create($cashier, [
            'from_branch_id' => $second->id,
            'to_branch_id' => $this->branch->id,
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 1]],
        ]);
    }

    public function test_opening_a_new_branch_creates_zeroed_stock_lines(): void
    {
        $variant = $this->makeVariant(12, 5, 10);
        $this->assertEqualsWithDelta(12, $this->stockAt($variant), 0.0001);

        $second = $this->addBranch($this->shop, 'New Branch');
        app(BranchStockService::class)->seedBranch($second->id);

        $row = BranchStock::where('branch_id', $second->id)
            ->where('product_variant_id', $variant->id)->first();

        $this->assertNotNull($row);
        $this->assertEqualsWithDelta(0, $row->stock, 0.0001);
    }

    /**
     * The old count()+1 numbering collides under concurrent cashiers.
     */
    public function test_document_numbers_do_not_collide(): void
    {
        $shopId = $this->shop->id;

        $numbers = collect(range(1, 25))
            ->map(fn () => Sequence::next('sale', $shopId, 'SAL-'))
            ->all();

        $this->assertCount(25, array_unique($numbers));
        $this->assertSame('SAL-000001', $numbers[0]);

        // Each business numbers its own documents from one.
        $rival = $this->otherShop('Second Business');
        $this->assertSame('SAL-000001', Sequence::next('sale', $rival->id, 'SAL-'));
    }

    public function test_a_business_can_reuse_skus_another_business_already_uses(): void
    {
        $variant = $this->makeVariant(5, 5, 10);
        $rival = $this->otherShop('Rival Shop');

        \App\Services\ActiveShop::runIn($rival->id, function () use ($variant) {
            $product = \App\Models\Product::create([
                'name' => 'Same SKU Product',
                'sku' => $variant->sku,
                'status' => 'active',
            ]);

            $this->assertSame($variant->sku, $product->sku);
        });

        $this->assertSame(1, \App\Models\ProductVariant::count());
    }
}