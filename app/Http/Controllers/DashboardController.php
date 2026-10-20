<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Customer;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\Supplier;
use App\Services\BranchContext;
use App\Services\FinanceService;
use App\Services\NotificationService;
use App\Services\ShopSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private FinanceService $finance,
        private NotificationService $notifications,
    ) {}

    public function index(Request $request): Response
    {
        $symbol = ShopSettings::currencySymbol();
        $today = $this->finance->profitSummary(today(), today());
        $month = $this->finance->profitSummary(now()->startOfMonth(), now());
        $year = $this->finance->profitSummary(now()->startOfYear(), now());

        $branchId = $this->branchId($request);

        // Stock is held per branch, so the dashboard counts the shelf of
        // the branch being worked on rather than the whole chain.
        $stockQuery = fn () => BranchStock::query()
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId));

        $stockValue = (float) $stockQuery()
            ->selectRaw('COALESCE(SUM(stock * cost),0) as value')->value('value');

        $threshold = ShopSettings::lowStockThreshold();

        $lowStock = $stockQuery()
            ->where('stock', '>', 0)
            ->where(function ($q) use ($threshold) {
                $q->whereColumn('stock', '<=', 'min_stock')->orWhere('stock', '<=', $threshold);
            })->count();

        $outOfStock = $stockQuery()->where('stock', '<=', 0)->count();

        $customerDebt = (float) Customer::sum('balance');
        $supplierDebt = (float) Supplier::sum('balance');

        $branch = $branchId ? Branch::find($branchId) : null;

        $alerts = $this->notifications->counts();
        $this->notifications->refresh();

        return Inertia::render('dashboard/Index', [
            'kpis' => [
                'today_sales' => $today['gross_sales'],
                'today_profit' => $today['profit_after_rent'],
                'today_profit_before_rent' => $today['profit_before_rent'],
                'month_sales' => $month['gross_sales'],
                'month_profit_before_rent' => $month['profit_before_rent'],
                'month_rent' => $month['rent'],
                'month_profit_after_rent' => $month['profit_after_rent'],
                'year_sales' => $year['gross_sales'],
                'year_profit' => $year['profit_after_rent'],
                'stock_value' => $stockValue,
                'low_stock' => $lowStock,
                'out_of_stock' => $outOfStock,
                'customer_credit' => $customerDebt,
                'supplier_debt' => $supplierDebt,
                'symbol' => $symbol,
            ],
            'charts' => [
                'daily' => $this->dailySeries(30),
                'monthly' => $this->monthlySeries(12),
                'profitTrend' => $this->profitTrend(6),
                'salesByCategory' => $this->salesByCategory(),
                'topProducts' => $this->topProducts(6),
                'profitableProducts' => $this->profitableProducts(6),
                'losingProducts' => $this->losingProducts(),
                'expenseBreakdown' => $this->expenseBreakdown(),
            ],
            'recentSales' => $this->recentSales(),
            'alerts' => $alerts,
            'branch' => $branch ? ['id' => $branch->id, 'name' => $branch->name] : null,
            'branches' => Branch::where('is_active', true)
                ->orderByDesc('is_primary')->orderBy('name')->get(['id', 'name'])->all(),
        ]);
    }

    /**
     * Managers may look at any branch; everyone else sees their own.
     */
    private function branchId(Request $request): ?int
    {
        $requested = $request->filled('branch_id') ? $request->integer('branch_id') : null;

        return BranchContext::idFor($request->user(), $requested) ?? BranchContext::id();
    }

    private function dailySeries(int $days): array
    {
        $rows = Sale::where('sold_at', '>=', now()->subDays($days - 1)->startOfDay())
            ->selectRaw('DATE(sold_at) as day, SUM(total) as total, SUM(profit) as profit')
            ->groupBy('day')->orderBy('day')->get()->keyBy('day');

        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $key = $date->toDateString();
            $row = $rows->get($key);
            $out[] = [
                'label' => $date->format('M d'),
                'sales' => (float) ($row->total ?? 0),
                'profit' => (float) ($row->profit ?? 0),
            ];
        }

        return $out;
    }

    private function monthlySeries(int $months): array
    {
        $start = now()->subMonths($months - 1)->startOfMonth();
        $rows = Sale::where('sold_at', '>=', $start)
            ->selectRaw($this->yearMonthExpression().' as ym, SUM(total) as total')
            ->groupBy('ym')->orderBy('ym')->get()->keyBy('ym');

        $out = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $key = $date->format('Y-m');
            $row = $rows->get($key);
            $out[] = [
                'label' => $date->format('M Y'),
                'sales' => (float) ($row->total ?? 0),
            ];
        }

        return $out;
    }

    private function profitTrend(int $months): array
    {
        $out = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $start = now()->subMonths($i)->startOfMonth();
            $summary = $this->finance->profitSummary($start, $start->copy()->endOfMonth());
            $out[] = [
                'label' => $start->format('M Y'),
                'before_rent' => $summary['profit_before_rent'],
                'after_rent' => $summary['profit_after_rent'],
                'expenses' => $summary['other_expenses'],
                'rent' => $summary['rent'],
            ];
        }

        return $out;
    }

    private function salesByCategory(): array
    {
        return DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('product_variants', 'product_variants.id', '=', 'sale_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->where('sales.sold_at', '>=', now()->startOfMonth())
            ->selectRaw("COALESCE(categories.name, 'Other') as label, SUM(sale_items.total_price) as value")
            ->groupBy('label')
            ->orderByDesc('value')
            ->limit(7)
            ->get()
            ->map(fn ($r) => ['label' => $r->label, 'value' => (float) $r->value])
            ->all();
    }

    private function topProducts(int $limit): array
    {
        return DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('product_variants', 'product_variants.id', '=', 'sale_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('sales.sold_at', '>=', now()->startOfMonth())
            ->selectRaw($this->productLabelExpression().' as label, SUM(sale_items.total_price) as value')
            ->groupBy('label')->orderByDesc('value')->limit($limit)->get()
            ->map(fn ($r) => ['label' => $r->label, 'value' => (float) $r->value])
            ->all();
    }

    private function profitableProducts(int $limit): array
    {
        return DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('product_variants', 'product_variants.id', '=', 'sale_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('sales.sold_at', '>=', now()->startOfMonth())
            ->selectRaw($this->productLabelExpression().' as label, SUM(sale_items.profit) as value')
            ->groupBy('label')->orderByDesc('value')->limit($limit)->get()
            ->map(fn ($r) => ['label' => $r->label, 'value' => (float) $r->value])
            ->all();
    }

    private function losingProducts(): array
    {
        return ProductVariant::with('product')
            ->where('status', 'active')
            ->where('cost', '>', 0)
            ->whereColumn('selling_price', '<', 'cost')
            ->limit(6)
            ->get()
            ->map(fn ($v) => [
                'label' => $v->fullName(),
                'value' => round($v->cost - $v->selling_price, 2),
                'cost' => $v->cost,
                'price' => $v->selling_price,
            ])
            ->all();
    }

    private function expenseBreakdown(): array
    {
        return DB::table('expenses')
            ->join('expense_categories', 'expense_categories.id', '=', 'expenses.expense_category_id')
            ->where('expenses.expense_date', '>=', now()->startOfMonth())
            ->selectRaw('expense_categories.name as label, SUM(expenses.amount) as value')
            ->groupBy('label')->orderByDesc('value')->limit(7)->get()
            ->map(fn ($r) => ['label' => $r->label, 'value' => (float) $r->value])
            ->all();
    }

    private function recentSales(): array
    {
        return Sale::with(['user:id,name', 'customer:id,name'])
            ->orderByDesc('sold_at')
            ->limit(8)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'sale_number' => $s->sale_number,
                'total' => $s->total,
                'profit' => $s->profit,
                'payment_method' => $s->payment_method,
                'payment_status' => $s->payment_status,
                'cashier' => $s->user?->name,
                'customer' => $s->customer?->name,
                'time' => $s->sold_at->format('M d, H:i'),
            ])
            ->all();
    }

    private function yearMonthExpression(): string
    {
        return DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', sold_at)"
            : "DATE_FORMAT(sold_at, '%Y-%m')";
    }

    private function productLabelExpression(): string
    {
        return DB::getDriverName() === 'sqlite'
            ? "products.name || ' ' || product_variants.name"
            : "CONCAT(products.name, ' ', product_variants.name)";
    }
}
