<?php

namespace App\Http\Controllers;

use App\Services\FinanceService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function __construct(private FinanceService $finance) {}

    public function index(Request $request): Response
    {
        $period = $request->string('period', 'month')->toString();
        [$from, $to] = $this->finance->range(
            $period,
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
        );

        $summary = $this->finance->profitSummary($from, $to);
        $cash = $this->finance->cashFlow($from, $to);

        // Comparison period (previous equal-length window)
        $days = $from->diffInDays($to) + 1;
        $prevTo = $from->copy()->subDay()->startOfDay();
        $prevFrom = $prevTo->copy()->subDays($days - 1);
        $previous = $this->finance->profitSummary($prevFrom, $prevTo);

        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $mStart = now()->subMonths($i)->startOfMonth();
            $m = $this->finance->profitSummary($mStart, $mStart->copy()->endOfMonth());
            $trend[] = [
                'label' => $mStart->format('M Y'),
                'sales' => $m['net_sales'],
                'profit_before_rent' => $m['profit_before_rent'],
                'profit_after_rent' => $m['profit_after_rent'],
                'expenses' => $m['other_expenses'],
                'rent' => $m['rent'],
            ];
        }

        return Inertia::render('finance/Index', [
            'period' => $period,
            'range' => ['from' => $summary['from'], 'to' => $summary['to']],
            'summary' => $summary,
            'cash' => $cash,
            'previous' => [
                'from' => $previous['from'],
                'to' => $previous['to'],
                'net_sales' => $previous['net_sales'],
                'profit_before_rent' => $previous['profit_before_rent'],
                'profit_after_rent' => $previous['profit_after_rent'],
                'other_expenses' => $previous['other_expenses'],
                'rent' => $previous['rent'],
                'gross_sales' => $previous['gross_sales'],
                'cogs' => $previous['cogs'],
            ],
            'trend' => $trend,
        ]);
    }
}
