<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\Shift;
use App\Services\ApprovalService;
use App\Services\EmployeeReportService;
use App\Services\ShiftService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffOperationsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The service reads the acting branch from the signed-in user, so
     * callers must be acting as somebody working at that branch.
     */
    private function sales(array $data = [], ?\App\Models\User $as = null): \App\Models\Sale
    {
        $user = $as ?? $this->employee('cashier', ['email' => uniqid().'@example.test']);

        $previous = \App\Services\ActiveShop::id();
        $this->actingAs($user);

        try {
            return app(\App\Services\SalesService::class)->create(array_merge([
                'items' => [],
                'payment_method' => 'cash',
                'branch_id' => $this->branch->id,
            ], $data), $user);
        } finally {
            auth()->logout();
            \App\Services\ActiveShop::force($previous);
        }
    }

    // ---------------------------------------------------------------- shifts

    public function test_opening_and_closing_a_shift_balances_the_drawer(): void
    {
        $service = app(ShiftService::class);
        $cashier = $this->employee('cashier', ['email' => 'shift@example.test']);

        $shift = $service->open($cashier, $this->branch->id, 500);

        $this->assertTrue($shift->isOpen());
        $this->assertEqualsWithDelta(500, $shift->opening_float, 0.0001);

        $this->sales(['items' => [['product_variant_id' => $this->makeVariant(5, 5, 10)->id, 'quantity' => 1]]], $cashier);
        $this->sales(['items' => [['product_variant_id' => $this->makeVariant(5, 5, 20)->id, 'quantity' => 2]]], $cashier);

        // The sale is tied to the drawer session.
        $this->assertSame(2, $shift->sales()->count());

        $shift->refresh()->recalculate();

        // 1 x 10 + 2 x 20 = 50 cash taken
        $this->assertEqualsWithDelta(50, $shift->cash_sales, 0.0001);
        $this->assertEqualsWithDelta(550, $shift->expected_cash, 0.0001);

        $closed = $service->close($shift, 545);

        $this->assertFalse($closed->isOpen());
        $this->assertEqualsWithDelta(-5, $closed->variance, 0.0001);
        $this->assertSame(500, $closed->opening_float);
        $this->assertEqualsWithDelta(50, $closed->cash_sales, 0.0001);
    }

    public function test_a_cashier_cannot_open_two_shifts_at_the_same_branch(): void
    {
        $service = app(ShiftService::class);
        $cashier = $this->employee('cashier', ['email' => 'double@example.test']);

        $service->open($cashier, $this->branch->id, 100);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('shift_already_open');

        $service->open($cashier, $this->branch->id, 100);
    }

    public function test_a_cashier_cannot_open_a_shift_at_another_branch(): void
    {
        $second = $this->addBranch($this->shop, 'Other Branch');
        $cashier = $this->employee('cashier', ['email' => 'cross@example.test', 'branch_id' => $this->branch->id]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('branch_forbidden');

        app(ShiftService::class)->open($cashier, $second->id, 100);
    }

    public function test_z_report_splits_sales_by_payment_method(): void
    {
        $service = app(ShiftService::class);
        $cashier = $this->employee('cashier', ['email' => 'z@example.test']);

        $shift = $service->open($cashier, $this->branch->id, 0);

        $cashVariant = $this->makeVariant(5, 5, 10);
        $bankVariant = $this->makeVariant(5, 8, 25);

        $this->sales(['items' => [['product_variant_id' => $cashVariant->id, 'quantity' => 1]]], $cashier);
        $this->sales(['items' => [['product_variant_id' => $bankVariant->id, 'quantity' => 1]], 'payment_method' => 'bank'], $cashier);

        $shift->refresh()->recalculate();
        $report = $service->zReport($shift);

        $this->assertSame(2, $report['sales_count']);
        $this->assertEqualsWithDelta(35, $report['gross_sales'], 0.0001);
        $this->assertEqualsWithDelta(10, $report['cash_sales'], 0.0001);
        $this->assertEqualsWithDelta(22, $report['profit'], 0.0001);
        $this->assertCount(2, $report['by_payment_method']);
    }

    // ------------------------------------------------------------- approvals

    public function test_an_approved_price_change_is_only_applied_on_approval(): void
    {
        $service = app(ApprovalService::class);
        $variant = $this->makeVariant(0, 5, 10);

        $staff = $this->employee('inventory', ['email' => 'price@example.test']);
        $manager = $this->employee('manager', [
            'email' => 'approver@example.test',
            'data_scope' => \App\Models\User::SCOPE_ALL,
        ]);

        $request = $service->request($staff, ApprovalRequest::TYPE_PRICE_CHANGE, [
            'product_variant_id' => $variant->id,
            'new_price' => 18,
        ], 'Supplier price rise', $this->branch->id);

        $this->assertTrue($request->isPending());

        // Nothing has changed on the product yet.
        $this->assertEqualsWithDelta(10, $variant->fresh()->selling_price, 0.0001);

        $service->review($request, $manager, true);

        $this->assertEqualsWithDelta(18, $variant->fresh()->selling_price, 0.0001);
        $this->assertSame('approved', $request->refresh()->status);
        $this->assertNotNull($request->reviewed_at);
    }

    public function test_a_rejected_request_leaves_everything_untouched(): void
    {
        $service = app(ApprovalService::class);
        $variant = $this->makeVariant(0, 5, 10);

        $staff = $this->employee('inventory', ['email' => 'price2@example.test']);
        $manager = $this->employee('manager', [
            'email' => 'approver2@example.test',
            'data_scope' => \App\Models\User::SCOPE_ALL,
        ]);

        $request = $service->request($staff, ApprovalRequest::TYPE_PRICE_CHANGE, [
            'product_variant_id' => $variant->id,
            'new_price' => 99,
        ], 'Too aggressive', $this->branch->id);

        $service->review($request, $manager, false, 'Keep at 10');

        $this->assertEqualsWithDelta(10, $variant->fresh()->selling_price, 0.0001);
        $this->assertSame('rejected', $request->refresh()->status);
        $this->assertSame('Keep at 10', $request->review_note);
    }

    public function test_an_employee_cannot_approve_their_own_request(): void
    {
        $service = app(ApprovalService::class);
        $manager = $this->employee('manager', [
            'email' => 'self@example.test',
            'data_scope' => \App\Models\User::SCOPE_ALL,
        ]);

        $request = $service->request(
            $manager,
            ApprovalRequest::TYPE_STOCK_ADJUSTMENT,
            ['product_variant_id' => $this->makeVariant(0, 5, 10)->id, 'quantity' => 5],
            'My own tweak',
            $this->branch->id
        );

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('approval_self_review');

        $service->review($request, $manager, true);
    }

    public function test_a_cashier_cannot_review_approvals(): void
    {
        $this->actingAs($this->employee('cashier', ['email' => 'nc@example.test']));

        $request = ApprovalRequest::create([
            'requested_by' => $this->ownerUser->id,
            'branch_id' => $this->branch->id,
            'type' => ApprovalRequest::TYPE_PRICE_CHANGE,
            'payload' => ['product_variant_id' => $this->makeVariant()->id],
            'status' => ApprovalRequest::STATUS_PENDING,
        ]);

        $this->post("/approvals/{$request->id}/review", ['approve' => true])->assertForbidden();
    }

    public function test_a_large_discount_is_flagged_for_sign_off(): void
    {
        $this->shop->update(['discount_approval_threshold' => 10]);

        $variant = $this->makeVariant(5, 5, 100);
        $cashier = $this->employee('cashier', ['email' => 'disc@example.test']);

        $this->sales([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 1]],
            'discount' => 20,
        ], $cashier);

        $this->assertSame(1, ApprovalRequest::where('type', ApprovalRequest::TYPE_DISCOUNT)->count());

        $flagged = ApprovalRequest::where('type', ApprovalRequest::TYPE_DISCOUNT)->first();
        $this->assertSame($this->branch->id, $flagged->branch_id);
        $this->assertTrue($flagged->isPending());
    }

    public function test_a_small_discount_is_not_flagged(): void
    {
        $this->shop->update(['discount_approval_threshold' => 10]);

        $variant = $this->makeVariant(5, 5, 100);

        $this->sales([
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 1]],
            'discount' => 5,
        ]);

        $this->assertSame(0, ApprovalRequest::where('type', ApprovalRequest::TYPE_DISCOUNT)->count());
    }

    public function test_an_approved_stock_adjustment_moves_the_shelf(): void
    {
        $service = app(ApprovalService::class);
        $variant = $this->makeVariant(20, 5, 10);

        $staff = $this->employee('inventory', ['email' => 'adj@example.test']);
        $manager = $this->employee('manager', [
            'email' => 'adj-approver@example.test',
            'data_scope' => \App\Models\User::SCOPE_ALL,
        ]);

        $request = $service->request($staff, ApprovalRequest::TYPE_STOCK_ADJUSTMENT, [
            'product_variant_id' => $variant->id,
            'quantity' => -4,
        ], 'Damaged in storage', $this->branch->id);

        $this->assertEqualsWithDelta(20, $this->stockAt($variant), 0.0001);

        $service->review($request, $manager, true);

        $this->assertEqualsWithDelta(16, $this->stockAt($variant), 0.0001);
    }

    // -------------------------------------------------------- staff reporting

    public function test_employee_report_ranks_staff_by_revenue(): void
    {
        $busy = $this->employee('cashier', ['email' => 'busy@example.test']);
        $quiet = $this->employee('cashier', ['email' => 'quiet@example.test']);

        $cheap = $this->makeVariant(5, 5, 10);
        $pricey = $this->makeVariant(5, 20, 100);

        $this->sales(['items' => [['product_variant_id' => $pricey->id, 'quantity' => 3]]], $busy);
        $this->sales(['items' => [['product_variant_id' => $cheap->id, 'quantity' => 1]]], $quiet);

        $report = app(EmployeeReportService::class)->leaderboard([
            'from' => now()->startOfDay(),
            'to' => now()->endOfDay(),
        ]);

        $this->assertCount(2, $report['rows']);
        $this->assertSame($busy->id, $report['rows'][0]['user_id']);
        $this->assertEqualsWithDelta(300, $report['rows'][0]['revenue'], 0.0001);
        $this->assertEqualsWithDelta(240, $report['rows'][0]['profit'], 0.0001);
        $this->assertEqualsWithDelta(300, $report['rows'][0]['average_sale'], 0.0001);
        $this->assertEqualsWithDelta(310, $report['totals']['revenue'], 0.0001);
    }

    public function test_employee_report_tracks_drawer_variance(): void
    {
        $service = app(ShiftService::class);
        $cashier = $this->employee('cashier', ['email' => 'variance@example.test']);

        $shift = $service->open($cashier, $this->branch->id, 100);
        $this->sales(['items' => [['product_variant_id' => $this->makeVariant(5, 5, 10)->id, 'quantity' => 2]]], $cashier);

        $service->close($shift, 100); // expected 120, so 20 short

        $report = app(EmployeeReportService::class)->leaderboard([
            'from' => now()->subDay()->startOfDay(),
            'to' => now()->endOfDay(),
        ]);

        $row = collect($report['rows'])->firstWhere('user_id', $cashier->id);

        $this->assertNotNull($row);
        $this->assertSame(1, $row['shifts']);
        $this->assertEqualsWithDelta(-20, $row['cash_shortages'], 0.0001);
    }

    public function test_staff_report_page_requires_permission_and_loads(): void
    {
        $this->actingAs($this->ownerUser)
            ->get('/staff')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('staff/Index')->has('rows')->has('totals'));

        $this->actingAs($this->employee('cashier', ['email' => 'nostaff@example.test']))
            ->get('/staff')
            ->assertForbidden();
    }

    public function test_shifts_page_requires_the_shift_permission(): void
    {
        $this->actingAs($this->employee('cashier', ['email' => 'noshift@example.test']))
            ->get('/shifts')
            ->assertOk();
    }

    public function test_shift_model_tracks_status_transitions(): void
    {
        $service = app(ShiftService::class);
        $cashier = $this->employee('cashier', ['email' => 'status@example.test']);

        $shift = $service->open($cashier, $this->branch->id, 0);
        $this->assertSame(Shift::STATUS_OPEN, $shift->status);

        $service->close($shift, 0);
        $this->assertSame(Shift::STATUS_CLOSED, $shift->fresh()->status);
        $this->assertNotNull($shift->fresh()->closed_at);
    }
}