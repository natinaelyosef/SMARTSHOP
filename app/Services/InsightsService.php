<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\Rent;
use App\Models\RentPayment;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\TaxPayment;
use Illuminate\Support\Facades\DB;

class InsightsService
{
    public function __construct(private FinanceService $finance) {}

    public function insights(): array
    {
        return array_merge(
            $this->growthInsights(),
            $this->marginInsights(),
            $this->stockPrediction(),
            $this->priceWarnings(),
            $this->expenseInsights(),
            $this->debtInsights(),
        );
    }

    private function growthInsights(): array
    {
        $thisMonth = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->whereBetween('sales.sold_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->selectRaw('sale_items.product_variant_id, SUM(sale_items.quantity) as qty, SUM(sale_items.total_price) as revenue')
            ->groupBy('sale_items.product_variant_id')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        $lastMonthStart = now()->subMonthNoOverflow()->startOfMonth();
        $lastMonthEnd = now()->subMonthNoOverflow()->endOfMonth();

        $out = [];
        foreach ($thisMonth as $row) {
            $previous = (float) SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->whereBetween('sales.sold_at', [$lastMonthStart, $lastMonthEnd])
                ->where('sale_items.product_variant_id', $row->product_variant_id)
                ->sum('sale_items.total_price');

            if ($previous <= 0) {
                continue;
            }

            $growth = round((($row->revenue - $previous) / $previous) * 100, 1);
            if (abs($growth) >= 10) {
                $variant = ProductVariant::with('product')->find($row->product_variant_id);
                $out[] = [
                    'type' => $growth > 0 ? 'growth' : 'decline',
                    'level' => $growth > 0 ? 'success' : 'warning',
                    'title' => $growth > 0 ? 'Sales growth' : 'Sales decline',
                    'message' => ($variant?->fullName() ?? 'Product').' sales '.($growth > 0 ? 'increased ' : 'decreased ').abs($growth).'% this month.',
                    'metric' => ($growth > 0 ? '+' : '').$growth.'%',
                ];
            }
        }

        return $out;
    }

    private function marginInsights(): array
    {
        return ProductVariant::with('product')
            ->where('status', 'active')
            ->where('selling_price', '>', 0)
            ->where('cost', '>', 0)
            ->get()
            ->map(fn ($v) => [
                'variant' => $v,
                'margin' => (($v->selling_price - $v->cost) / $v->selling_price) * 100,
            ])
            ->filter(fn ($r) => $r['margin'] < 12)
            ->sortBy('margin')
            ->take(5)
            ->map(fn ($r) => [
                'type' => 'low_margin',
                'level' => 'warning',
                'title' => 'Low margin',
                'message' => $r['variant']->fullName().' margin is only '.round($r['margin'], 1)
                    .'% (cost '.$r['variant']->cost.', price '.$r['variant']->selling_price.').',
                'metric' => round($r['margin'], 1).'%',
            ])
            ->values()
            ->all();
    }

    private function stockPrediction(): array
    {
        $since = now()->subDays(30);

        $sales = SaleItem::join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.sold_at', '>=', $since)
            ->selectRaw('sale_items.product_variant_id, SUM(sale_items.quantity) as qty')
            ->groupBy('sale_items.product_variant_id')
            ->pluck('qty', 'product_variant_id');

        return ProductVariant::with('product')
            ->where('status', 'active')
            ->where('stock', '>', 0)
            ->whereIn('id', $sales->keys())
            ->get()
            ->map(function ($v) use ($sales) {
                $daily = $sales[$v->id] / 30;
                $days = $daily > 0 ? floor($v->stock / $daily) : null;

                return ['variant' => $v, 'days' => $days, 'daily' => round($daily, 2)];
            })
            ->filter(fn ($r) => $r['days'] !== null && $r['days'] <= 10)
            ->sortBy('days')
            ->take(5)
            ->map(fn ($r) => [
                'type' => 'stock_prediction',
                'level' => $r['days'] <= 3 ? 'danger' : 'warning',
                'title' => 'Stock prediction',
                'message' => $r['variant']->fullName().' may run out in approximately '.$r['days']
                    .' days (sells ~'.$r['daily'].'/day).',
                'metric' => $r['days'].'d',
            ])
            ->values()
            ->all();
    }

    private function priceWarnings(): array
    {
        $out = [];

        ProductVariant::with('product')->where('status', 'active')->where('selling_price', '>', 0)
            ->where('cost', '>', 0)
            ->get()
            ->each(function ($v) use (&$out) {
                if ($v->selling_price < $v->cost) {
                    $out[] = [
                        'type' => 'loss',
                        'level' => 'danger',
                        'title' => 'Loss warning',
                        'message' => $v->fullName().' sells for '.$v->selling_price.' below cost '.$v->cost
                            .' — loss of '.round($v->cost - $v->selling_price, 2).' per unit.',
                        'metric' => '-'.round($v->cost - $v->selling_price, 2),
                    ];
                }
            });

        $costIncreases = DB::table('purchase_items')
            ->join('purchases', 'purchases.id', '=', 'purchase_items.purchase_id')
            ->select('purchase_items.product_variant_id', DB::raw('MAX(purchase_items.unit_cost) as last_cost'))
            ->groupBy('purchase_items.product_variant_id')
            ->get()
            ->keyBy('product_variant_id');

        ProductVariant::with('product')->where('status', 'active')->get()
            ->each(function ($v) use ($costIncreases, &$out) {
                $last = $costIncreases->get($v->id);
                if ($last && $v->cost > 0 && $last->last_cost > $v->cost * 1.1 && $v->selling_price > 0) {
                    $out[] = [
                        'type' => 'price_warning',
                        'level' => 'warning',
                        'title' => 'Price warning',
                        'message' => 'Purchase cost for '.$v->fullName().' increased to '.$last->last_cost
                            .' but selling price is still '.$v->selling_price.'.',
                        'metric' => $last->last_cost,
                    ];
                }
            });

        return array_slice($out, 0, 8);
    }

    private function expenseInsights(): array
    {
        $top = Expense::where('expense_date', '>=', now()->startOfMonth())
            ->join('expense_categories', 'expense_categories.id', '=', 'expenses.expense_category_id')
            ->selectRaw('expense_categories.name as name, SUM(expenses.amount) as total')
            ->groupBy('expense_categories.name')
            ->orderByDesc('total')
            ->first();

        if (! $top) {
            return [];
        }

        return [[
            'type' => 'expense_focus',
            'level' => 'info',
            'title' => 'Biggest expense',
            'message' => $top->name.' is your biggest expense this month at '.$top->total.'.',
            'metric' => $top->total,
        ]];
    }

    private function debtInsights(): array
    {
        $out = [];

        $customerDebt = (float) Customer::sum('balance');
        $supplierDebt = (float) Supplier::sum('balance');

        if ($customerDebt > 0) {
            $out[] = [
                'type' => 'receivable',
                'level' => 'info',
                'title' => 'Customer credit',
                'message' => 'Customers owe you '.$customerDebt.'. Follow up on outstanding credit.',
                'metric' => $customerDebt,
            ];
        }

        if ($supplierDebt > 0) {
            $out[] = [
                'type' => 'payable',
                'level' => 'warning',
                'title' => 'Supplier debt',
                'message' => 'You owe suppliers '.$supplierDebt.'. Plan your payments.',
                'metric' => $supplierDebt,
            ];
        }

        return $out;
    }

    /** Rule-based assistant answering questions from live shop data. */
    public function answer(string $question): string
    {
        $q = mb_strtolower($question);
        $summary = $this->finance->profitSummary(now()->copy()->startOfMonth(), now());
        $symbol = ShopSettings::currency();

        if (str_contains($q, 'profit') || str_contains($q, '빚') || str_contains($q, 'ሩ') || str_contains($q, 'أرباح')) {
            return 'This month: sales '.$summary['gross_sales'].' '.$symbol
                .', COGS '.$summary['cogs'].' '.$symbol
                .', profit before rent '.$summary['profit_before_rent'].' '.$symbol
                .', rent '.$summary['rent'].' '.$symbol
                .', profit after rent '.$summary['profit_after_rent'].' '.$symbol
                .', estimated tax '.$summary['estimated_tax'].' '.$symbol
                .', net profit '.$summary['net_profit'].' '.$symbol.'.';
        }

        if (str_contains($q, 'losing') || str_contains($q, 'loss') || str_contains($q, 'below cost')) {
            $losing = ProductVariant::with('product')->where('status', 'active')->get()
                ->filter->isLosingMoney();
            if ($losing->isEmpty()) {
                return 'Good news — no products are currently selling below their cost.';
            }

            return 'Products selling below cost: '.$losing->map(
                fn ($v) => $v->fullName().' (cost '.$v->cost.', price '.$v->selling_price.')'
            )->implode('; ').'.';
        }

        if (str_contains($q, 'expense') || str_contains($q, 'spent') || str_contains($q, 'biggest')) {
            $rows = Expense::where('expense_date', '>=', now()->startOfMonth())
                ->join('expense_categories', 'expense_categories.id', '=', 'expenses.expense_category_id')
                ->selectRaw('expense_categories.name as name, SUM(expenses.amount) as total')
                ->groupBy('expense_categories.name')->orderByDesc('total')->limit(5)->get();

            if ($rows->isEmpty()) {
                return 'No expenses recorded this month.';
            }

            return 'Your biggest expenses this month: '.$rows->map(fn ($r) => $r->name.' '.$r->total)->implode(', ').' ('.$symbol.').';
        }

        if (str_contains($q, 'rent')) {
            $year = Rent::withSum('payments', 'amount_paid')->get();
            $total = (float) $year->sum('payments_sum_amount_paid');
            $outstanding = (float) RentPayment::whereIn('status', ['unpaid', 'partial'])->sum('amount_due');

            return 'You paid '.$total.' '.$symbol.' in rent so far. Outstanding rent: '.$outstanding.' '.$symbol.'.';
        }

        if (str_contains($q, 'reorder') || str_contains($q, 'buy again') || str_contains($q, 'low stock')) {
            $low = ProductVariant::with('product')->where('status', 'active')
                ->where(function ($qq) {
                    $qq->whereColumn('stock', '<=', 'min_stock')->orWhere('stock', '<=', 0);
                })
                ->orderBy('stock')->limit(10)->get();

            if ($low->isEmpty()) {
                return 'All products are above their minimum stock levels.';
            }

            return 'Reorder soon: '.$low->map(fn ($v) => $v->fullName().' ('.$v->stock.' left)')->implode(', ').'.';
        }

        if (str_contains($q, 'supplier') || str_contains($q, 'distributor')) {
            $top = Purchase::with('supplier')
                ->join('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
                ->selectRaw('supplier_id, suppliers.name as name, SUM(purchases.total) as total')
                ->groupBy('supplier_id', 'suppliers.name')->orderByDesc('total')->first();

            return $top
                ? $top->name.' supplied the most products: '.$top->total.' '.$symbol.' in purchases.'
                : 'No purchases recorded yet.';
        }

        if (str_contains($q, 'compare') || str_contains($q, 'last month')) {
            $last = $this->finance->profitSummary(
                now()->copy()->subMonthNoOverflow()->startOfMonth(),
                now()->copy()->subMonthNoOverflow()->endOfMonth()
            );

            $salesDelta = $last['gross_sales'] > 0
                ? round((($summary['gross_sales'] - $last['gross_sales']) / $last['gross_sales']) * 100, 1)
                : null;

            return 'This month sales: '.$summary['gross_sales'].' '.$symbol
                .' vs last month: '.$last['gross_sales'].' '.$symbol
                .($salesDelta !== null ? ' ('.$salesDelta.'%)' : '')
                .'. Profit after rent: '.$summary['profit_after_rent'].' vs '.$last['profit_after_rent'].'.';
        }

        if (str_contains($q, 'owe') && (str_contains($q, 'customer') || str_contains($q, 'me'))) {
            return 'Customers owe you '.(float) Customer::sum('balance').' '.$symbol.'.';
        }

        if (str_contains($q, 'owe') || str_contains($q, 'debt')) {
            return 'You owe suppliers '.(float) Supplier::sum('balance').' '.$symbol.'.';
        }

        if (str_contains($q, 'sale') || str_contains($q, 'sold') || str_contains($q, 'revenue')) {
            return 'Sales today: '.(float) Sale::whereBetween('sold_at', [now()->startOfDay(), now()->endOfDay()])->sum('total')
                .' '.$symbol.'; this month: '.$summary['gross_sales'].' '.$symbol
                .' across '.$summary['sales_count'].' sales.';
        }

        if (str_contains($q, 'tax')) {
            return 'Estimated tax this month (at '.$summary['tax_rate'].'%): '.$summary['estimated_tax'].' '.$symbol
                .'. Paid: '.(float) TaxPayment::whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount')
                .' '.$symbol.'. Figures are estimates until official tax rules are configured.';
        }

        return 'I can answer questions about profit, sales, expenses, rent, tax, low stock, losses, customers owing money and suppliers. Try: "How much profit did I make this month?"';
    }
}
