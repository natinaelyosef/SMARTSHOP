<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ShiftService
{
    /**
     * Start a cashier's session and drawer.
     */
    public function open(User $user, ?int $branchId, float $openingFloat = 0.0): Shift
    {
        $branchId ??= $user->branch_id ?? BranchContext::id();

        if ($branchId === null) {
            throw new \DomainException('no_branch');
        }

        if (! $user->canManageBranch($branchId)) {
            throw new \DomainException('branch_forbidden');
        }

        return DB::transaction(function () use ($user, $branchId, $openingFloat) {
            $open = Shift::where('user_id', $user->id)
                ->where('branch_id', $branchId)
                ->where('status', Shift::STATUS_OPEN)
                ->lockForUpdate()
                ->first();

            if ($open) {
                throw new \DomainException('shift_already_open');
            }

            $shift = Shift::create([
                'user_id' => $user->id,
                'branch_id' => $branchId,
                'opening_float' => $openingFloat,
                'cash_sales' => 0,
                'other_in' => 0,
                'other_out' => 0,
                'opened_at' => now(),
                'status' => Shift::STATUS_OPEN,
            ]);

            AuditLogger::log(
                'shift.opened',
                Shift::class,
                $shift->id,
                "Shift opened by {$user->name}",
                null,
                ['branch_id' => $branchId, 'opening_float' => $openingFloat]
            );

            return $shift;
        });
    }

    /**
     * Close the drawer, comparing counted cash to what was expected.
     */
    public function close(Shift $shift, float $countedCash, float $otherIn = 0.0, float $otherOut = 0.0, ?string $note = null): Shift
    {
        if (! $shift->isOpen()) {
            throw new \DomainException('shift_not_open');
        }

        return DB::transaction(function () use ($shift, $countedCash, $otherIn, $otherOut, $note) {
            $shift->recalculate($otherIn, $otherOut);

            $shift->counted_cash = $countedCash;
            $shift->variance = round($countedCash - (float) $shift->expected_cash, 4);
            $shift->closed_at = now();
            $shift->status = Shift::STATUS_CLOSED;
            $shift->note = $note;
            $shift->save();

            AuditLogger::log(
                'shift.closed',
                Shift::class,
                $shift->id,
                'Shift closed',
                ['status' => Shift::STATUS_OPEN],
                ['status' => Shift::STATUS_CLOSED, 'variance' => $shift->variance]
            );

            return $shift;
        });
    }

    /**
     * The session the given user currently has open at a branch.
     */
    public function currentFor(User $user, ?int $branchId = null): ?Shift
    {
        $branchId ??= BranchContext::id();

        return Shift::where('user_id', $user->id)
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->where('status', Shift::STATUS_OPEN)
            ->latest('opened_at')
            ->first();
    }

    /**
     * Attach a completed sale to the cashier's open shift so the drawer
     * totals line up.
     */
    public function attachSale(Sale $sale): void
    {
        $shift = $this->currentFor($sale->user, (int) $sale->branch_id);

        if ($shift) {
            $sale->forceFill(['shift_id' => $shift->id])->save();
        }
    }

    /**
     * Z-report figures for a shift, including per-method breakdown.
     */
    public function zReport(Shift $shift): array
    {
        $sales = $shift->sales()->where('status', 'completed')->get();

        $byMethod = $sales->groupBy('payment_method')
            ->map(fn ($rows, $method) => [
                'method' => $method,
                'count' => $rows->count(),
                'total' => round((float) $rows->sum('total'), 4),
                'paid' => round((float) $rows->sum('paid_amount'), 4),
            ])
            ->values()
            ->all();

        $returns = \App\Models\SalesReturn::whereHas('sale', fn ($q) => $q->where('shift_id', $shift->id))
            ->get();

        return [
            'shift_id' => $shift->id,
            'user' => $shift->user?->name,
            'branch' => $shift->branch?->name,
            'opened_at' => $shift->opened_at?->toDateTimeString(),
            'closed_at' => $shift->closed_at?->toDateTimeString(),
            'sales_count' => $sales->count(),
            'gross_sales' => round((float) $sales->sum('total'), 4),
            'discounts' => round((float) $sales->sum('discount'), 4),
            'profit' => round((float) $sales->sum('profit'), 4),
            'opening_float' => (float) $shift->opening_float,
            'cash_sales' => (float) $shift->cash_sales,
            'other_in' => (float) $shift->other_in,
            'other_out' => (float) $shift->other_out,
            'expected_cash' => (float) $shift->expected_cash,
            'counted_cash' => $shift->counted_cash,
            'variance' => $shift->variance,
            'returns_count' => $returns->count(),
            'returns_value' => round((float) $returns->sum('refund_amount'), 4),
            'by_payment_method' => $byMethod,
        ];
    }
}