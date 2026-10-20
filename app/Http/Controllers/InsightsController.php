<?php

namespace App\Http\Controllers;

use App\Services\FinanceService;
use App\Services\InsightsService;
use App\Services\ShopSettings;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InsightsController extends Controller
{
    public function __construct(
        private InsightsService $insights,
        private FinanceService $finance,
    ) {}

    public function index(): Response
    {
        $month = $this->finance->profitSummary(now()->startOfMonth(), now());

        return Inertia::render('insights/Index', [
            'insights' => $this->insights->insights(),
            'metrics' => [
                'month_sales' => $month['gross_sales'],
                'month_profit' => $month['profit_after_rent'],
                'month_margin' => $month['net_sales'] > 0
                    ? round(($month['gross_profit'] / $month['net_sales']) * 100, 1)
                    : 0,
                'symbol' => ShopSettings::currencySymbol(),
            ],
            'suggestedQuestions' => [
                'How much profit did I make this month?',
                'Which products are losing money?',
                'What are my biggest expenses?',
                'How much rent did I pay this year?',
                'Which products should I reorder?',
                'Which supplier supplied the most products?',
                'Compare this month with last month.',
                'How much money do customers owe me?',
                'How much do I owe suppliers?',
            ],
            'messages' => [],
        ]);
    }

    public function ask(Request $request)
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
        ]);

        return response()->json([
            'answer' => $this->insights->answer($data['question']),
            'question' => $data['question'],
        ]);
    }
}
