<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\RentPayment;
use App\Models\Sale;
use App\Models\Supplier;
use App\Services\FinanceService;
use App\Services\ShopSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(private FinanceService $finance) {}

    public function index(Request $request): Response
    {
        $type = $request->string('type', 'daily')->toString();
        $period = $request->string('period', 'today')->toString();

        [$from, $to] = $this->finance->range(
            $period,
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
        );

        if ($type === 'yearly') {
            return $this->yearly($request);
        }

        if ($type === 'monthly') {
            return $this->monthly($request, $from, $to);
        }

        return $this->daily($request, $from, $to);
    }

    private function daily(Request $request, Carbon $from, Carbon $to): Response
    {
        $summary = $this->finance->profitSummary($from, $to);
        $cash = $this->finance->cashFlow($from, $to);

        return Inertia::render('reports/Daily', [
            'type' => 'daily',
            'range' => ['from' => $summary['from'], 'to' => $summary['to']],
            'summary' => $summary,
            'cash' => $cash,
            'filters' => $request->only(['type', 'period', 'from', 'to']),
            'purchases' => Purchase::whereBetween('purchased_at', [$from, $to])
                ->with('supplier:id,name')->orderByDesc('purchased_at')->limit(50)
                ->get()
                ->map(fn ($p) => [
                    'ref' => $p->purchase_number,
                    'date' => $p->purchased_at->format('M d, Y'),
                    'party' => $p->supplier?->name,
                    'total' => $p->total,
                    'paid' => $p->paid_amount,
                    'remaining' => $p->remaining_amount,
                ]),
        ]);
    }

    private function monthly(Request $request, Carbon $from, Carbon $to): Response
    {
        $summary = $this->finance->profitSummary($from, $to);

        $bestProducts = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('product_variants', 'product_variants.id', '=', 'sale_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->whereBetween('sales.sold_at', [$from, $to])
            ->selectRaw("CONCAT(products.name,' ',product_variants.name) as name,
                SUM(sale_items.quantity) as qty,
                SUM(sale_items.total_price) as revenue,
                SUM(sale_items.profit) as profit")
            ->groupBy('name')->orderByDesc('profit')->limit(10)->get();

        $worstProducts = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('product_variants', 'product_variants.id', '=', 'sale_items.product_variant_id')
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->whereBetween('sales.sold_at', [$from, $to])
            ->selectRaw("CONCAT(products.name,' ',product_variants.name) as name,
                SUM(sale_items.quantity) as qty,
                SUM(sale_items.total_price) as revenue,
                SUM(sale_items.profit) as profit")
            ->groupBy('name')->orderBy('profit')->limit(10)->get();

        return Inertia::render('reports/Monthly', [
            'type' => 'monthly',
            'range' => ['from' => $summary['from'], 'to' => $summary['to']],
            'summary' => $summary,
            'bestProducts' => $bestProducts,
            'worstProducts' => $worstProducts,
            'filters' => $request->only(['type', 'period', 'from', 'to']),
        ]);
    }

    private function yearly(Request $request): Response
    {
        $year = $request->integer('year', now()->year);
        $rows = [];

        for ($m = 1; $m <= 12; $m++) {
            $start = Carbon::create($year, $m, 1)->startOfMonth();
            $summary = $this->finance->profitSummary($start, $start->copy()->endOfMonth());
            $rows[] = [
                'month' => $start->format('F'),
                ...collect($summary)->only([
                    'gross_sales', 'net_sales', 'cogs', 'gross_profit', 'other_expenses',
                    'profit_before_rent', 'rent', 'profit_after_rent', 'estimated_tax', 'net_profit',
                ])->all(),
            ];
        }

        $totals = collect($rows)->reduce(function ($acc, $row) {
            foreach (array_keys($row) as $key) {
                if ($key === 'month') {
                    continue;
                }
                $acc[$key] = ($acc[$key] ?? 0) + $row[$key];
            }

            return $acc;
        }, []);

        return Inertia::render('reports/Yearly', [
            'type' => 'yearly',
            'year' => $year,
            'rows' => $rows,
            'totals' => $totals,
            'filters' => $request->only(['type', 'year']),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $report = $request->string('report', 'sales')->toString();
        $period = $request->string('period', 'month')->toString();
        [$from, $to] = $this->finance->range($period, $request->string('from')->toString() ?: null, $request->string('to')->toString() ?: null);

        $filename = 'smartshop-'.$report.'-'.$from->format('Ymd').'-'.$to->format('Ymd').'.csv';

        return response()->streamDownload(function () use ($report, $from, $to) {
            $out = fopen('php://output', 'w');
            $separator = ',';

            if ($report === 'sales') {
                fputcsv($out, ['Sale #', 'Date', 'Cashier', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Total', 'COGS', 'Profit', 'Payment', 'Status']);
                Sale::with(['user:id,name', 'customer:id,name'])
                    ->whereBetween('sold_at', [$from, $to])->orderByDesc('sold_at')
                    ->chunk(500, function ($chunk) use ($out) {
                        foreach ($chunk as $s) {
                            fputcsv($out, [$s->sale_number, $s->sold_at->format('Y-m-d H:i'), $s->user?->name, $s->customer?->name,
                                $s->subtotal, $s->discount, $s->tax_amount, $s->total, $s->cost_of_goods, $s->profit, $s->payment_method, $s->payment_status]);
                        }
                    });
            } elseif ($report === 'purchases') {
                fputcsv($out, ['Purchase #', 'Date', 'Supplier', 'Subtotal', 'Discount', 'Total', 'Paid', 'Remaining', 'Status']);
                Purchase::with('supplier:id,name')->whereBetween('purchased_at', [$from->toDateString(), $to->toDateString()])
                    ->chunk(500, function ($chunk) use ($out) {
                        foreach ($chunk as $p) {
                            fputcsv($out, [$p->purchase_number, $p->purchased_at->format('Y-m-d'), $p->supplier?->name,
                                $p->subtotal, $p->discount, $p->total, $p->paid_amount, $p->remaining_amount, $p->payment_status]);
                        }
                    });
            } elseif ($report === 'inventory') {
                fputcsv($out, ['SKU', 'Product', 'Variant', 'Stock', 'Min Stock', 'Cost', 'Selling Price', 'Stock Value', 'Status']);
                ProductVariant::with('product:id,name')->where('status', 'active')->orderBy('id')
                    ->chunk(500, function ($chunk) use ($out) {
                        foreach ($chunk as $v) {
                            fputcsv($out, [$v->sku, $v->product?->name, $v->name, $v->stock, $v->min_stock,
                                $v->cost, $v->selling_price, round($v->stock * $v->cost, 2),
                                $v->stock <= 0 ? 'OUT' : ($v->isLowStock(ShopSettings::lowStockThreshold()) ? 'LOW' : 'OK')]);
                        }
                    });
            } elseif ($report === 'expenses') {
                fputcsv($out, ['Date', 'Category', 'Amount', 'Paid', 'Method', 'Description', 'User']);
                Expense::with(['category:id,name', 'user:id,name'])
                    ->whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])
                    ->chunk(500, function ($chunk) use ($out) {
                        foreach ($chunk as $e) {
                            fputcsv($out, [$e->expense_date->format('Y-m-d'), $e->category?->name, $e->amount, $e->paid_amount, $e->payment_method, $e->description, $e->user?->name]);
                        }
                    });
            } elseif ($report === 'rent') {
                fputcsv($out, ['Period', 'Shop', 'Due', 'Paid', 'Remaining', 'Status', 'Due Date', 'Paid At']);
                RentPayment::with('rent:id,shop_name')
                    ->whereBetween('due_date', [$from->toDateString(), $to->toDateString()])
                    ->chunk(500, function ($chunk) use ($out) {
                        foreach ($chunk as $r) {
                            fputcsv($out, [$r->period_start->format('Y-m'), $r->rent?->shop_name, $r->amount_due, $r->amount_paid,
                                $r->remaining(), $r->status, $r->due_date->format('Y-m-d'), $r->paid_at?->format('Y-m-d')]);
                        }
                    });
            } elseif ($report === 'customers') {
                fputcsv($out, ['Name', 'Phone', 'Address', 'Total Spent', 'Outstanding Balance', 'Sales Count']);
                Customer::withCount('sales')->orderByDesc('balance')->get()
                    ->each(fn ($c) => fputcsv($out, [$c->name, $c->phone, $c->address, $c->sales()->sum('total'), $c->balance, $c->sales_count]));
            } elseif ($report === 'suppliers') {
                fputcsv($out, ['Name', 'Company', 'Phone', 'Total Purchased', 'Outstanding Balance', 'Purchases']);
                Supplier::get()->each(function ($s) use ($out) {
                    fputcsv($out, [$s->name, $s->company, $s->phone, $s->purchases()->sum('total'), $s->balance, $s->purchases()->count()]);
                });
            } else {
                $summary = $this->finance->profitSummary($from, $to);
                fputcsv($out, ['Metric', 'Value']);
                foreach ($summary as $key => $value) {
                    fputcsv($out, [$key, $value]);
                }
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
