<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\BranchContext;
use App\Services\EmployeeReportService;
use App\Services\FinanceService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffReportController extends Controller
{
    public function __construct(
        private EmployeeReportService $reports,
        private FinanceService $finance,
    ) {}

    public function index(Request $request): Response
    {
        [$from, $to] = $this->finance->range(
            $request->string('period')->toString() ?: 'month',
            $request->query('from'),
            $request->query('to')
        );

        $branchId = $request->filled('branch_id')
            ? (int) $request->integer('branch_id')
            : (($request->user()->effectiveDataScope() === User::SCOPE_ALL) ? null : BranchContext::id());

        $report = $this->reports->leaderboard([
            'from' => $from,
            'to' => $to,
            'branch_id' => $branchId,
        ]);

        return Inertia::render('staff/Index', [
            'period' => $request->string('period')->toString() ?: 'month',
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'branch_id' => $branchId,
            'rows' => $report['rows'],
            'totals' => $report['totals'],
            'symbol' => \App\Services\ShopSettings::currencySymbol(),
            'branches' => \App\Models\Branch::where('is_active', true)
                ->orderBy('name')->get(['id', 'name'])->all(),
        ]);
    }

    public function show(Request $request, User $user): Response
    {
        [$from, $to] = $this->finance->range(
            $request->string('period')->toString() ?: 'month',
            $request->query('from'),
            $request->query('to')
        );

        $report = $this->reports->leaderboard([
            'from' => $from,
            'to' => $to,
            'branch_id' => $user->branch_id,
        ]);

        $row = collect($report['rows'])->firstWhere('user_id', $user->id);

        return Inertia::render('staff/Show', [
            'employee' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role?->name,
                'branch' => $user->branch?->name,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at?->format('M d, Y H:i'),
            ],
            'row' => $row,
            'series' => $this->reports->dailySeries($user->id, $from, $to, $user->branch_id),
            'period' => $request->string('period')->toString() ?: 'month',
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'symbol' => \App\Services\ShopSettings::currencySymbol(),
            'shifts' => $user->shifts()
                ->with('branch:id,name')
                ->orderByDesc('opened_at')->limit(20)->get()
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'branch' => $s->branch?->name,
                    'opened_at' => $s->opened_at?->format('M d, Y H:i'),
                    'closed_at' => $s->closed_at?->format('M d, Y H:i'),
                    'expected_cash' => $s->expected_cash,
                    'counted_cash' => $s->counted_cash,
                    'variance' => $s->variance,
                    'status' => $s->status,
                ]),
        ]);
    }
}