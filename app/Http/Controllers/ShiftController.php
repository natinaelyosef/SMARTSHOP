<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Services\BranchContext;
use App\Services\ShiftService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Cash-drawer shifts: open a session, work the register, close and count.
 */
class ShiftController extends Controller
{
    public function __construct(private ShiftService $shifts) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $branchId = $request->integer('branch_id') ?: BranchContext::id();

        return Inertia::render('shifts/Index', [
            'current' => $this->currentPayload($this->shifts->currentFor($user, $branchId)),
            'history' => Shift::with(['user:id,name', 'branch:id,name'])
                ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
                ->where('user_id', $user->id)
                ->orderByDesc('opened_at')
                ->limit(30)
                ->get()
                ->map(fn (Shift $s) => $this->shiftRow($s)),
            'opening_float' => $branchId
                ? \App\Models\Branch::whereKey($branchId)->value('opening_float')
                : 0,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'branch_id' => ['nullable', 'integer'],
            'opening_float' => ['nullable', 'numeric', 'min:0'],
        ]);

        $this->shifts->open(
            $request->user(),
            $data['branch_id'] ?? BranchContext::id(),
            (float) ($data['opening_float'] ?? 0)
        );

        return back()->with('success', 'Shift opened.');
    }

    public function close(Request $request, Shift $shift): RedirectResponse
    {
        abort_unless(
            $shift->user_id === $request->user()->id
                || $request->user()->is_owner
                || $request->user()->hasPermission('shifts.manage'),
            403
        );

        $data = $request->validate([
            'counted_cash' => ['required', 'numeric', 'min:0'],
            'other_in' => ['nullable', 'numeric'],
            'other_out' => ['nullable', 'numeric'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $this->shifts->close(
            $shift,
            (float) $data['counted_cash'],
            (float) ($data['other_in'] ?? 0),
            (float) ($data['other_out'] ?? 0),
            $data['note'] ?? null
        );

        return back()->with('success', 'Shift closed.');
    }

    public function report(Request $request, Shift $shift): Response
    {
        abort_unless(
            $shift->user_id === $request->user()->id
                || $request->user()->is_owner
                || $request->user()->hasPermission('shifts.view'),
            403
        );

        return Inertia::render('shifts/Report', [
            'shift' => $this->shiftRow($shift),
            'report' => $this->shifts->zReport($shift),
        ]);
    }

    protected function currentPayload(?Shift $shift): ?array
    {
        return $shift ? [
            'id' => $shift->id,
            'branch' => $shift->branch?->name,
            'branch_id' => $shift->branch_id,
            'opened_at' => $shift->opened_at?->toDateTimeString(),
            'opening_float' => (float) $shift->opening_float,
            'cash_sales' => (float) $shift->cash_sales,
            'sales_count' => $shift->sales()->where('status', 'completed')->count(),
        ] : null;
    }

    protected function shiftRow(Shift $shift): array
    {
        return [
            'id' => $shift->id,
            'user' => $shift->user?->name,
            'branch' => $shift->branch?->name,
            'opened_at' => $shift->opened_at?->toDateTimeString(),
            'closed_at' => $shift->closed_at?->toDateTimeString(),
            'opening_float' => (float) $shift->opening_float,
            'cash_sales' => (float) $shift->cash_sales,
            'expected_cash' => $shift->expected_cash === null ? null : (float) $shift->expected_cash,
            'counted_cash' => $shift->counted_cash === null ? null : (float) $shift->counted_cash,
            'variance' => $shift->variance === null ? null : (float) $shift->variance,
            'status' => $shift->status,
        ];
    }
}