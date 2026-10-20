<?php

namespace App\Http\Controllers;

use App\Models\TaxPayment;
use App\Models\TaxPeriod;
use App\Models\TaxRule;
use App\Services\AuditLogger;
use App\Services\FinanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaxController extends Controller
{
    public function __construct(private FinanceService $finance) {}

    public function index(Request $request): Response
    {
        $rules = TaxRule::orderByDesc('effective_from')->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'type' => $r->type,
                'rate' => $r->rate,
                'effective_from' => $r->effective_from->format('M d, Y'),
                'effective_to' => $r->effective_to?->format('M d, Y'),
                'is_active' => $r->is_active,
                'is_estimate' => $r->is_estimate,
                'notes' => $r->notes,
            ]);

        $periods = TaxPeriod::orderByDesc('start_date')->get()
            ->map(function ($p) {
                $summary = $this->finance->profitSummary($p->start_date, $p->end_date);

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'period_type' => $p->period_type,
                    'start_date' => $p->start_date->format('M d, Y'),
                    'end_date' => $p->end_date->format('M d, Y'),
                    'taxable_amount' => $summary['net_sales'],
                    'tax_amount' => $summary['estimated_tax'],
                    'paid_amount' => $p->paid_amount,
                    'remaining_amount' => round($summary['estimated_tax'] - $p->paid_amount, 2),
                    'status' => $p->paid_amount + 0.0001 >= $summary['estimated_tax'] ? 'paid' : 'open',
                    'tax_rate' => $summary['tax_rate'],
                    'payments' => $p->payments()->with('user:id,name')->get()->map(fn ($t) => [
                        'id' => $t->id,
                        'amount' => $t->amount,
                        'paid_at' => $t->paid_at->format('M d, Y'),
                        'reference' => $t->reference,
                        'user' => $t->user?->name,
                        'notes' => $t->notes,
                    ]),
                ];
            });

        $active = TaxRule::activeFor('sales');
        $yearSummary = $this->finance->profitSummary(now()->startOfYear(), now());

        return Inertia::render('tax/Index', [
            'rules' => $rules,
            'periods' => $periods,
            'summary' => [
                'active_rule' => $active ? [
                    'name' => $active->name,
                    'rate' => $active->rate,
                    'is_estimate' => $active->is_estimate,
                    'effective_from' => $active->effective_from->format('M d, Y'),
                ] : null,
                'year_taxable' => $yearSummary['net_sales'],
                'year_estimate' => $yearSummary['estimated_tax'],
                'year_paid' => (float) TaxPayment::whereBetween('paid_at', [now()->startOfYear(), now()])->sum('amount'),
                'year_remaining' => round($yearSummary['estimated_tax'] - (float) TaxPayment::whereBetween('paid_at', [now()->startOfYear(), now()])->sum('amount'), 2),
            ],
        ]);
    }

    public function storeRule(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:sales,purchase'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after:effective_from'],
            'is_estimate' => ['required', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($data['is_estimate'] === false) {
            $verified = $request->boolean('verified_official_rules');
            if (! $verified) {
                return back()->withErrors(['is_estimate' => 'Only mark tax as official after verifying with authoritative tax rules.']);
            }
        }

        TaxRule::where('type', $data['type'])->update(['is_active' => false]);

        $rule = TaxRule::create([...$data, 'is_active' => true]);

        AuditLogger::log('tax.rule.created', TaxRule::class, $rule->id, 'Tax rule created: '.$rule->name.' at '.$rule->rate.'%');

        return back()->with('success', 'Tax rule created. Previous rules remain in history.');
    }

    public function storePeriod(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'period_type' => ['required', 'in:monthly,quarterly,yearly'],
        ]);

        $period = TaxPeriod::create([...$data, 'status' => 'open']);

        return back()->with('success', 'Tax period created.');
    }

    public function pay(Request $request, TaxPeriod $period): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paid_at' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $payment = $period->payments()->create([
            ...$data,
            'tax_rule_id' => TaxRule::activeFor('sales')?->id,
            'user_id' => $request->user()->id,
        ]);

        $period->paid_amount = round($period->paid_amount + $data['amount'], 4);
        $period->remaining_amount = round(max(0, $period->tax_amount - $period->paid_amount), 4);
        $period->status = $period->remaining_amount <= 0.0001 ? 'paid' : 'open';
        $period->save();

        AuditLogger::log('tax.payment', TaxPayment::class, $payment->id, 'Tax payment of '.$data['amount'].' for '.$period->name);

        return back()->with('success', 'Tax payment recorded.');
    }
}
