<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Rent;
use App\Models\RentPayment;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\SalesReturn;
use App\Models\Supplier;
use App\Models\TaxRule;
use App\Models\User;
use App\Services\FinanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create(['status' => 'active']);
        $supplier = Supplier::create(['name' => 'Supplier Co', 'status' => 'active']);

        Sale::create([
            'sale_number' => 'SAL-FIN-1',
            'user_id' => $user->id,
            'sold_at' => now(),
            'subtotal' => 100,
            'discount' => 0,
            'tax_amount' => 0,
            'total' => 100,
            'cost_of_goods' => 60,
            'profit' => 40,
            'paid_amount' => 100,
            'remaining_amount' => 0,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'status' => 'completed',
        ]);

        Sale::create([
            'sale_number' => 'SAL-FIN-2',
            'user_id' => $user->id,
            'sold_at' => now(),
            'subtotal' => 50,
            'discount' => 0,
            'tax_amount' => 0,
            'total' => 50,
            'cost_of_goods' => 20,
            'profit' => 30,
            'paid_amount' => 50,
            'remaining_amount' => 0,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'status' => 'completed',
        ]);

        SalesReturn::create([
            'return_number' => 'RET-FIN-1',
            'sale_id' => Sale::first()->id,
            'user_id' => $user->id,
            'refund_amount' => 10,
            'cost_restored' => 4,
            'status' => 'completed',
            'returned_at' => now(),
        ]);

        SalePayment::create([
            'sale_id' => Sale::first()->id,
            'amount' => 80,
            'payment_method' => 'cash',
            'paid_at' => now(),
            'user_id' => $user->id,
        ]);

        $purchase = Purchase::create([
            'purchase_number' => 'PUR-FIN-1',
            'supplier_id' => $supplier->id,
            'user_id' => $user->id,
            'purchased_at' => now()->toDateString(),
            'subtotal' => 200,
            'total' => 200,
            'paid_amount' => 0,
            'remaining_amount' => 200,
            'payment_status' => 'unpaid',
            'status' => 'received',
        ]);

        PurchasePayment::create([
            'purchase_id' => $purchase->id,
            'amount' => 40,
            'payment_method' => 'cash',
            'paid_at' => now(),
            'user_id' => $user->id,
        ]);

        Expense::create([
            'expense_category_id' => ExpenseCategory::create([
                'name' => 'Utilities',
                'slug' => 'utilities',
                'status' => 'active',
            ])->id,
            'amount' => 10,
            'expense_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'is_paid' => true,
            'paid_amount' => 10,
            'description' => 'Electricity',
            'user_id' => $user->id,
        ]);

        $rent = Rent::create([
            'shop_name' => 'Main Shop',
            'monthly_amount' => 20,
            'due_day' => 1,
            'start_date' => now()->startOfMonth()->toDateString(),
            'status' => 'active',
        ]);

        RentPayment::create([
            'rent_id' => $rent->id,
            'period_start' => now()->startOfMonth()->toDateString(),
            'period_end' => now()->endOfMonth()->toDateString(),
            'amount_due' => 20,
            'amount_paid' => 20,
            'due_date' => now()->toDateString(),
            'status' => 'paid',
        ]);

        TaxRule::create([
            'name' => 'Estimated Business Tax',
            'type' => 'sales',
            'rate' => 10,
            'effective_from' => now()->startOfYear()->toDateString(),
            'is_active' => true,
            'is_estimate' => true,
        ]);
    }

    private function finance(): FinanceService
    {
        return app(FinanceService::class);
    }

    public function test_profit_summary_adds_up(): void
    {
        $summary = $this->finance()->profitSummary(now()->startOfMonth(), now()->endOfMonth());

        $this->assertSame(2, $summary['sales_count']);
        $this->assertEqualsWithDelta(150, $summary['gross_sales'], 0.0001);
        $this->assertEqualsWithDelta(10, $summary['returns_total'], 0.0001);
        $this->assertEqualsWithDelta(140, $summary['net_sales'], 0.0001);
        $this->assertEqualsWithDelta(76, $summary['cogs'], 0.0001);
        $this->assertEqualsWithDelta(64, $summary['gross_profit'], 0.0001);
        $this->assertEqualsWithDelta(10, $summary['other_expenses'], 0.0001);
        $this->assertEqualsWithDelta(20, $summary['rent'], 0.0001);
        $this->assertEqualsWithDelta(34, $summary['profit_after_rent'], 0.0001);
        $this->assertEqualsWithDelta(10, $summary['tax_rate'], 0.0001);
        $this->assertEqualsWithDelta(3.4, $summary['estimated_tax'], 0.0001);
        $this->assertEqualsWithDelta(30.6, $summary['net_profit'], 0.0001);
        $this->assertEqualsWithDelta(200, $summary['purchases'], 0.0001);

        $this->assertEqualsWithDelta(
            $summary['gross_sales'] - $summary['returns_total'],
            $summary['net_sales'],
            0.0001
        );
        $this->assertEqualsWithDelta(
            $summary['net_sales'] - $summary['cogs'],
            $summary['gross_profit'],
            0.0001
        );
        $this->assertEqualsWithDelta(
            $summary['gross_profit'] - $summary['other_expenses'],
            $summary['profit_before_rent'],
            0.0001
        );
        $this->assertEqualsWithDelta(54, $summary['profit_before_rent'], 0.0001);
        $this->assertEqualsWithDelta(
            $summary['profit_before_rent'] - $summary['rent'],
            $summary['profit_after_rent'],
            0.0001
        );
        $this->assertEqualsWithDelta(
            $summary['profit_after_rent'] - $summary['estimated_tax'],
            $summary['net_profit'],
            0.0001
        );
    }

    public function test_cash_flow_totals_add_up(): void
    {
        $flow = $this->finance()->cashFlow(now()->startOfMonth(), now()->endOfMonth());

        $this->assertEqualsWithDelta(80, $flow['cash_from_sales'], 0.0001);
        $this->assertEqualsWithDelta(40, $flow['supplier_payments'], 0.0001);
        $this->assertEqualsWithDelta(10, $flow['expense_payments'], 0.0001);
        $this->assertEqualsWithDelta(20, $flow['rent_payments'], 0.0001);
        $this->assertEqualsWithDelta(0, $flow['tax_payments'], 0.0001);

        $this->assertEqualsWithDelta($flow['cash_from_sales'], $flow['total_inflow'], 0.0001);
        $this->assertEqualsWithDelta(
            $flow['supplier_payments'] + $flow['expense_payments'] + $flow['rent_payments'] + $flow['tax_payments'],
            $flow['total_outflow'],
            0.0001
        );
        $this->assertEqualsWithDelta(
            $flow['total_inflow'] - $flow['total_outflow'],
            $flow['net_cash_movement'],
            0.0001
        );

        $this->assertEqualsWithDelta(80, $flow['total_inflow'], 0.0001);
        $this->assertEqualsWithDelta(70, $flow['total_outflow'], 0.0001);
        $this->assertEqualsWithDelta(10, $flow['net_cash_movement'], 0.0001);
    }

    public function test_range_today_returns_todays_bounds(): void
    {
        [$from, $to] = $this->finance()->range('today');

        $this->assertTrue($from->eq(today()->startOfDay()));
        $this->assertTrue($to->eq(today()->endOfDay()));
        $this->assertTrue($from->isSameDay($to));
        $this->assertTrue($from->isToday());
    }
}
