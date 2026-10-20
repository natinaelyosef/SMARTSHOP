<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\RentPayment;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\SalesReturn;
use App\Models\TaxPayment;
use App\Models\TaxRule;
use Illuminate\Support\Carbon;

class FinanceService
{
    /**
     * Full profit & loss summary for a date range.
     * Profit is separated from cash: expenses/rent use accrual (incurred) amounts.
     */
    public function profitSummary(Carbon $from, Carbon $to): array
    {
        $start = $from->copy()->startOfDay();
        $end = $to->copy()->endOfDay();

        $salesTotals = Sale::whereBetween('sold_at', [$start, $end])
            ->where('status', 'completed')
            ->selectRaw('COALESCE(SUM(total),0) as total, COALESCE(SUM(cost_of_goods),0) as cogs, COALESCE(SUM(discount),0) as discount, COUNT(*) as count')
            ->first();

        $returns = SalesReturn::whereBetween('returned_at', [$start, $end])
            ->selectRaw('COALESCE(SUM(refund_amount),0) as refund, COALESCE(SUM(cost_restored),0) as cost')
            ->first();

        $grossSales = (float) $salesTotals->total;
        $returnsTotal = (float) $returns->refund;
        $netSales = round($grossSales - $returnsTotal, 4);
        $cogs = round((float) $salesTotals->cogs - (float) $returns->cost, 4);
        $grossProfit = round($netSales - $cogs, 4);

        $otherExpenses = (float) Expense::whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->whereHas('category', fn ($q) => $q->where('slug', '!=', 'rent'))
            ->sum('amount');

        $profitBeforeRent = round($grossProfit - $otherExpenses, 4);

        $rentAccrued = (float) RentPayment::whereBetween('due_date', [$start->toDateString(), $end->toDateString()])
            ->sum('amount_due');

        $rentPaid = (float) RentPayment::whereBetween('due_date', [$start->toDateString(), $end->toDateString()])
            ->sum('amount_paid');

        $rentOutstanding = round($rentAccrued - $rentPaid, 4);
        $profitAfterRent = round($profitBeforeRent - $rentAccrued, 4);

        $taxRule = TaxRule::activeFor('sales');
        $taxRate = $taxRule ? (float) $taxRule->rate : 0;
        $estimatedTax = $taxRule && $taxRule->is_estimate
            ? round(max(0, $profitAfterRent) * $taxRate / 100, 4)
            : 0.0;

        $netProfit = round($profitAfterRent - $estimatedTax, 4);

        $purchasesTotal = (float) Purchase::whereBetween('purchased_at', [$start->toDateString(), $end->toDateString()])
            ->sum('total');

        return [
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'sales_count' => (int) $salesTotals->count,
            'gross_sales' => round($grossSales, 4),
            'returns_total' => round($returnsTotal, 4),
            'net_sales' => $netSales,
            'discounts' => round((float) $salesTotals->discount, 4),
            'cogs' => $cogs,
            'gross_profit' => $grossProfit,
            'other_expenses' => round($otherExpenses, 4),
            'profit_before_rent' => $profitBeforeRent,
            'rent' => round($rentAccrued, 4),
            'rent_paid' => round($rentPaid, 4),
            'rent_outstanding' => $rentOutstanding,
            'profit_after_rent' => $profitAfterRent,
            'tax_rate' => $taxRate,
            'estimated_tax' => $estimatedTax,
            'net_profit' => $netProfit,
            'purchases' => round($purchasesTotal, 4),
        ];
    }

    /** Cash view — money that actually moved, independent of profit. */
    public function cashFlow(Carbon $from, Carbon $to): array
    {
        $start = $from->copy()->startOfDay();
        $end = $to->copy()->endOfDay();

        $cashFromSales = (float) SalePayment::whereBetween('paid_at', [$start, $end])->sum('amount');
        $cashToSuppliers = (float) PurchasePayment::whereBetween('paid_at', [$start, $end])->sum('amount');
        $cashForExpenses = (float) Expense::whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->where('is_paid', true)->sum('paid_amount');
        $cashForRent = (float) RentPayment::whereBetween('due_date', [$start->toDateString(), $end->toDateString()])->sum('amount_paid');
        $cashForTax = (float) TaxPayment::whereBetween('paid_at', [$start->toDateString(), $end->toDateString()])->sum('amount');
        $cashFromPurchases = (float) Purchase::whereBetween('purchased_at', [$start->toDateString(), $end->toDateString()])->sum('paid_amount');

        $inflow = round($cashFromSales, 4);
        $outflow = round($cashToSuppliers + $cashForExpenses + $cashForRent + $cashForTax, 4);

        return [
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'cash_from_sales' => round($cashFromSales, 4),
            'cash_from_purchases_booked' => round($cashFromPurchases, 4),
            'supplier_payments' => round($cashToSuppliers, 4),
            'expense_payments' => round($cashForExpenses, 4),
            'rent_payments' => round($cashForRent, 4),
            'tax_payments' => round($cashForTax, 4),
            'total_inflow' => $inflow,
            'total_outflow' => $outflow,
            'net_cash_movement' => round($inflow - $outflow, 4),
        ];
    }

    /** Resolve a named period to a date range. */
    public function range(string $period, ?string $from = null, ?string $to = null): array
    {
        $now = now();

        return match ($period) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'yesterday' => [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()],
            'week' => [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()],
            'month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
            'last_month' => [$now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->subMonthNoOverflow()->endOfMonth()],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear()],
            'last_year' => [$now->copy()->subYear()->startOfYear(), $now->copy()->subYear()->endOfYear()],
            'custom' => [
                Carbon::parse($from ?? $now->toDateString())->startOfDay(),
                Carbon::parse($to ?? $now->toDateString())->endOfDay(),
            ],
            default => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
        };
    }
}
