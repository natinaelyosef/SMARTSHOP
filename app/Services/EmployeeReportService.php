<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SalesReturn;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Per-employee performance: what each cashier actually sold, at what
 * margin, and whether the drawer balanced.
 */
class EmployeeReportService
{
    /**
     * Leaderboard of employees over a date range.
     *
     * @param  array  $options  branch_id, from, to, limit
     * @return array{rows: array<int, array>, totals: array}
     */
    public function leaderboard(array $options = []): array
    {
        $from = $options['from'] ?? now()->startOfMonth()->startOfDay();
        $to = $options['to'] ?? now()->endOfDay();
        $branchId = $options['branch_id'] ?? null;
        $limit = (int) ($options['limit'] ?? 50);

        $salesQuery = Sale::where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to])
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId));

        $totals = $salesQuery->selectRaw(
            'user_id,
             COUNT(*) as sales_count,
             COALESCE(SUM(total),0) as revenue,
             COALESCE(SUM(profit),0) as profit,
             COALESCE(SUM(discount),0) as discounts,
             COALESCE(SUM(remaining_amount),0) as outstanding'
        )->groupBy('user_id')->get()->keyBy('user_id');

        $returnsQuery = SalesReturn::whereBetween('returned_at', [$from, $to])
            ->when($branchId !== null, fn ($q) => $q->whereHas(
                'sale',
                fn ($s) => $s->where('branch_id', $branchId)
            ));

        $returns = $returnsQuery->selectRaw(
            'user_id, COUNT(*) as returns_count, COALESCE(SUM(refund_amount),0) as refunded'
        )->groupBy('user_id')->get()->keyBy('user_id');

        $cashDrawer = Shift::where('closed_at', '>=', $from)
            ->where('closed_at', '<=', $to)
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->selectRaw(
                'user_id,
                 COUNT(*) as shifts,
                 COALESCE(SUM(CASE WHEN variance < 0 THEN variance ELSE 0 END),0) as shortages,
                 COALESCE(SUM(CASE WHEN variance > 0 THEN variance ELSE 0 END),0) as overages'
            )
            ->groupBy('user_id')->get()->keyBy('user_id');

        $users = User::with(['branch:id,name', 'role:id,name'])
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->get()
            ->keyBy('id');

        $rows = [];

        foreach ($users as $id => $user) {
            $saleRow = $totals->get($id);
            $returnRow = $returns->get($id);
            $drawerRow = $cashDrawer->get($id);

            if (! $saleRow && ! $returnRow && ! $drawerRow) {
                continue;
            }

            $count = (int) ($saleRow->sales_count ?? 0);
            $revenue = (float) ($saleRow->revenue ?? 0);

            $rows[] = [
                'user_id' => $id,
                'name' => $user->name,
                'role' => $user->role?->name,
                'branch' => $user->branch?->name,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at?->diffForHumans(),
                'sales_count' => $count,
                'revenue' => round($revenue, 4),
                'profit' => round((float) ($saleRow->profit ?? 0), 4),
                'discounts' => round((float) ($saleRow->discounts ?? 0), 4),
                'margin' => $revenue > 0 ? round(((float) ($saleRow->profit ?? 0)) / $revenue * 100, 2) : 0.0,
                'average_sale' => $count > 0 ? round($revenue / $count, 4) : 0.0,
                'returns_count' => (int) ($returnRow->returns_count ?? 0),
                'refunded' => round((float) ($returnRow->refunded ?? 0), 4),
                'shifts' => (int) ($drawerRow->shifts ?? 0),
                'cash_shortages' => round((float) ($drawerRow->shortages ?? 0), 4),
                'cash_overages' => round((float) ($drawerRow->overages ?? 0), 4),
            ];
        }

        usort($rows, fn ($a, $b) => $b['revenue'] <=> $a['revenue']);

        return [
            'rows' => array_slice($rows, 0, $limit),
            'totals' => [
                'employees' => count($rows),
                'revenue' => round(array_sum(array_column($rows, 'revenue')), 4),
                'profit' => round(array_sum(array_column($rows, 'profit')), 4),
                'sales_count' => array_sum(array_column($rows, 'sales_count')),
                'refunded' => round(array_sum(array_column($rows, 'refunded')), 4),
                'cash_shortages' => round(array_sum(array_column($rows, 'cash_shortages')), 4),
                'cash_overages' => round(array_sum(array_column($rows, 'cash_overages')), 4),
            ],
        ];
    }

    /**
     * Per-day revenue for one employee, for a sparkline.
     */
    public function dailySeries(int $userId, $from, $to, ?int $branchId = null): array
    {
        $rows = Sale::where('status', 'completed')
            ->where('user_id', $userId)
            ->whereBetween('sold_at', [$from, $to])
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->selectRaw('DATE(sold_at) as day, COALESCE(SUM(total),0) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day');

        $out = [];

        for ($day = \Illuminate\Support\Carbon::parse($from)->startOfDay();
             $day->lte(\Illuminate\Support\Carbon::parse($to));
             $day->addDay()) {
            $key = $day->toDateString();
            $out[] = [
                'label' => $day->format('M d'),
                'total' => (float) ($rows[$key] ?? 0),
            ];
        }

        return $out;
    }
}