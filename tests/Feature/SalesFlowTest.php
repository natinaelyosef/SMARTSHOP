<?php

namespace Tests\Feature;

use App\Services\ActiveShop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SalesFlowTest extends TestCase
{
    use RefreshDatabase;

    private function cashier(): \App\Models\User
    {
        return $this->employee('cashier');
    }

    public function test_cash_sale_deducts_stock_marks_paid_and_computes_profit(): void
    {
        $variant = $this->makeVariant(10, 5, 10);
        $user = $this->cashier();

        $sale = app(\App\Services\SalesService::class)->create([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 2]],
            'payment_method' => 'cash',
            'branch_id' => $this->branch->id,
        ], $user);

        $this->assertEqualsWithDelta(8, $this->stockAt($variant), 0.0001);
        $this->assertEqualsWithDelta(8, $variant->fresh()->stock, 0.0001);
        $this->assertSame('paid', $sale->payment_status);
        $this->assertEqualsWithDelta(20, $sale->total, 0.0001);
        $this->assertEqualsWithDelta(20, $sale->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(0, $sale->remaining_amount, 0.0001);
        $this->assertEqualsWithDelta(10, $sale->cost_of_goods, 0.0001);
        $this->assertEqualsWithDelta(10, $sale->profit, 0.0001);
        $this->assertSame($this->branch->id, $sale->branch_id);

        $movement = \App\Models\InventoryMovement::where('product_variant_id', $variant->id)
            ->where('movement_type', \App\Models\InventoryMovement::TYPES['sale'])
            ->sole();

        $this->assertEqualsWithDelta(-2, $movement->quantity, 0.0001);
        $this->assertEqualsWithDelta(10, $movement->previous_stock, 0.0001);
        $this->assertEqualsWithDelta(8, $movement->new_stock, 0.0001);
        $this->assertSame($this->branch->id, $movement->branch_id);
        $this->assertSame(\App\Models\Sale::class, $movement->reference_type);
        $this->assertSame($sale->id, $movement->reference_id);
    }

    public function test_credit_sale_with_partial_payment_is_marked_partial(): void
    {
        $variant = $this->makeVariant(10, 5, 10);
        $user = $this->cashier();
        $customer = $this->makeCustomer();

        $sale = app(\App\Services\SalesService::class)->create([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 3]],
            'payment_method' => 'credit',
            'paid_amount' => 5,
            'customer_id' => $customer->id,
            'branch_id' => $this->branch->id,
        ], $user);

        $this->assertSame('partial', $sale->payment_status);
        $this->assertEqualsWithDelta(30, $sale->total, 0.0001);
        $this->assertEqualsWithDelta(5, $sale->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(25, $sale->remaining_amount, 0.0001);
        $this->assertEqualsWithDelta(25, $customer->refresh()->balance, 0.0001);
        $this->assertCount(1, $sale->payments);
        $this->assertEqualsWithDelta(5, $sale->payments->first()->amount, 0.0001);
    }

    public function test_selling_more_than_available_stock_fails(): void
    {
        $variant = $this->makeVariant(10, 5, 10);
        $user = $this->cashier();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('insufficient_stock');

        app(\App\Services\SalesService::class)->create([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 11]],
            'payment_method' => 'cash',
            'branch_id' => $this->branch->id,
        ], $user);
    }

    public function test_customer_payment_cannot_exceed_the_remaining_balance(): void
    {
        $sales = app(\App\Services\SalesService::class);
        $variant = $this->makeVariant(10, 5, 10);
        $user = $this->cashier();

        $sale = $sales->create([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 3]],
            'payment_method' => 'credit',
            'paid_amount' => 5,
            'branch_id' => $this->branch->id,
        ], $user);

        try {
            $sales->recordCustomerPayment($sale, [
                'amount' => 25.01,
                'payment_method' => 'cash',
            ], $user);

            $this->fail('Expected DomainException was not thrown.');
        } catch (\DomainException $e) {
            $this->assertSame('invalid_payment_amount', $e->getMessage());
        }

        $sales->recordCustomerPayment($sale, [
            'amount' => 25,
            'payment_method' => 'cash',
        ], $user);

        $sale->refresh();

        $this->assertSame('paid', $sale->payment_status);
        $this->assertEqualsWithDelta(30, $sale->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(0, $sale->remaining_amount, 0.0001);
    }

    public function test_returning_items_restores_stock_and_updates_sale_amounts(): void
    {
        $sales = app(\App\Services\SalesService::class);
        $variant = $this->makeVariant(10, 5, 10);
        $user = $this->cashier();
        $customer = $this->makeCustomer();

        $sale = $sales->create([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 3]],
            'payment_method' => 'credit',
            'paid_amount' => 5,
            'customer_id' => $customer->id,
            'branch_id' => $this->branch->id,
        ], $user);

        $saleItem = $sale->items->first();

        $return = $sales->returnItems($sale, [
            'items' => [['sale_item_id' => $saleItem->id, 'quantity' => 2]],
            'reason' => 'Damaged packaging',
            'payment_method' => 'cash',
        ], $user);

        $sale->refresh();
        $saleItem->refresh();

        $this->assertEqualsWithDelta(9, $this->stockAt($variant), 0.0001);
        $this->assertEqualsWithDelta(9, $variant->fresh()->stock, 0.0001);
        $this->assertEqualsWithDelta(2, $saleItem->returned_quantity, 0.0001);

        $this->assertInstanceOf(\App\Models\SalesReturn::class, $return);
        $this->assertSame(1, \App\Models\SalesReturn::count());
        $this->assertEqualsWithDelta(20, $return->refund_amount, 0.0001);
        $this->assertEqualsWithDelta(10, $return->cost_restored, 0.0001);
        $this->assertSame('completed', $return->status);
        $this->assertCount(1, $return->items);

        $this->assertEqualsWithDelta(5, $sale->remaining_amount, 0.0001);
        $this->assertEqualsWithDelta(5, $customer->refresh()->balance, 0.0001);

        $movement = \App\Models\InventoryMovement::where('product_variant_id', $variant->id)
            ->where('movement_type', \App\Models\InventoryMovement::TYPES['sale_return'])
            ->sole();

        $this->assertEqualsWithDelta(2, $movement->quantity, 0.0001);
        $this->assertSame(\App\Models\SalesReturn::class, $movement->reference_type);
        $this->assertSame($return->id, $movement->reference_id);
    }
}