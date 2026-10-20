<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_the_dashboard(): void
    {
        $user = User::factory()->create(['status' => 'active']);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard/Index')
                ->has('kpis')
                ->has('kpis.today_sales')
                ->has('kpis.month_sales')
                ->has('kpis.stock_value')
                ->has('kpis.low_stock')
                ->has('kpis.out_of_stock')
                ->has('kpis.customer_credit')
                ->has('kpis.supplier_debt')
                ->has('charts')
                ->has('charts.daily')
                ->has('charts.monthly')
                ->has('charts.profitTrend')
                ->has('charts.salesByCategory')
                ->has('charts.topProducts')
                ->has('charts.expenseBreakdown')
                ->has('recentSales')
                ->has('alerts')
                ->has('alerts.total')
                ->has('alerts.danger')
                ->has('alerts.warning'));
    }

    public function test_guest_is_redirected_from_the_dashboard_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }
}
