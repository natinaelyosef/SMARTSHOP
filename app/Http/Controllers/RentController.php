<?php

namespace App\Http\Controllers;

use App\Models\Rent;
use App\Models\RentPayment;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class RentController extends Controller
{
    public function index(Request $request): Response
    {
        $rents = Rent::orderByDesc('status')->orderBy('shop_name')->get();

        foreach ($rents as $rent) {
            $this->ensureSchedule($rent, 3);
        }

        $year = (int) $request->integer('year', now()->year);

        $payments = RentPayment::with(['rent:id,shop_name,landlord_name,monthly_amount', 'user:id,name'])
            ->whereYear('period_start', $year)
            ->orderByDesc('period_start')
            ->get();

        $summary = [
            'year' => $year,
            'due' => (float) $payments->sum('amount_due'),
            'paid' => (float) $payments->sum('amount_paid'),
            'outstanding' => round($payments->sum('amount_due') - $payments->sum('amount_paid'), 2),
            'overdue' => (float) $payments->whereIn('status', ['unpaid', 'partial'])
                ->where('due_date', '<', today())->sum('amount_due'),
        ];

        return Inertia::render('rent/Index', [
            'rents' => $rents->map(fn ($r) => [
                'id' => $r->id,
                'shop_name' => $r->shop_name,
                'landlord_name' => $r->landlord_name,
                'landlord_phone' => $r->landlord_phone,
                'monthly_amount' => $r->monthly_amount,
                'due_day' => $r->due_day,
                'start_date' => $r->start_date->format('M d, Y'),
                'status' => $r->status,
                'notes' => $r->notes,
            ]),
            'payments' => $payments->map(fn ($p) => [
                'id' => $p->id,
                'rent_id' => $p->rent_id,
                'shop' => $p->rent?->shop_name,
                'period' => $p->period_start->format('F Y'),
                'period_start' => $p->period_start->toDateString(),
                'amount_due' => $p->amount_due,
                'amount_paid' => $p->amount_paid,
                'remaining' => $p->remaining(),
                'due_date' => $p->due_date->format('M d, Y'),
                'paid_at' => $p->paid_at?->format('M d, Y'),
                'payment_method' => $p->payment_method,
                'receipt_number' => $p->receipt_number,
                'status' => $p->status,
                'user' => $p->user?->name,
                'notes' => $p->notes,
            ]),
            'summary' => $summary,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'shop_name' => ['required', 'string', 'max:255'],
            'landlord_name' => ['nullable', 'string', 'max:255'],
            'landlord_phone' => ['nullable', 'string', 'max:50'],
            'monthly_amount' => ['required', 'numeric', 'min:0.01'],
            'due_day' => ['required', 'integer', 'between:1,28'],
            'start_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $rent = Rent::create([
            ...$data,
            'start_date' => Carbon::parse($data['start_date'])->toDateString(),
            'status' => 'active',
        ]);

        $this->ensureSchedule($rent, 3);

        AuditLogger::log('rent.created', Rent::class, $rent->id, 'Rent contract created for '.$rent->shop_name, null, $data);

        return back()->with('success', 'Rent contract created. Schedule generated.');
    }

    public function update(Request $request, Rent $rent): RedirectResponse
    {
        $data = $request->validate([
            'shop_name' => ['required', 'string', 'max:255'],
            'landlord_name' => ['nullable', 'string', 'max:255'],
            'landlord_phone' => ['nullable', 'string', 'max:50'],
            'monthly_amount' => ['required', 'numeric', 'min:0.01'],
            'due_day' => ['required', 'integer', 'between:1,28'],
            'status' => ['required', 'in:active,ended'],
            'notes' => ['nullable', 'string'],
        ]);

        $previous = $rent->only(['monthly_amount', 'status', 'landlord_name']);
        $rent->update($data);

        // Rent change only affects future unpaid schedule rows; history stays intact.
        RentPayment::where('rent_id', $rent->id)
            ->whereIn('status', ['unpaid'])
            ->where('period_start', '>=', now()->startOfMonth())
            ->update(['amount_due' => $data['monthly_amount'], 'due_date' => null]);

        RentPayment::where('rent_id', $rent->id)
            ->whereNull('due_date')
            ->get()
            ->each(function ($p) use ($rent) {
                $p->due_date = $p->period_start->copy()->addDays($rent->due_day - 1);
                $p->save();
            });

        AuditLogger::log('rent.updated', Rent::class, $rent->id, 'Rent contract updated', $previous, $data);

        return back()->with('success', 'Rent contract updated. Future unpaid months now use the new amount.');
    }

    public function pay(Request $request, RentPayment $payment): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,bank,mobile'],
            'paid_at' => ['nullable', 'date'],
            'receipt_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $remaining = $payment->remaining();

        if ($data['amount'] > $remaining + 0.0001) {
            return back()->withErrors(['amount' => 'Payment cannot exceed the outstanding rent of '.$remaining.'.']);
        }

        $previous = [
            'amount_paid' => $payment->amount_paid,
            'status' => $payment->status,
        ];

        $payment->amount_paid = round($payment->amount_paid + $data['amount'], 4);
        $payment->status = $payment->amount_paid + 0.0001 >= $payment->amount_due ? 'paid' : 'partial';
        $payment->paid_at = Carbon::parse($data['paid_at'] ?? now())->toDateString();
        $payment->payment_method = $data['payment_method'];
        $payment->receipt_number = $data['receipt_number'] ?? $payment->receipt_number;
        $payment->notes = $data['notes'] ?? $payment->notes;
        $payment->user_id = $request->user()->id;
        $payment->save();

        AuditLogger::log(
            'rent.paid',
            RentPayment::class,
            $payment->id,
            'Rent payment of '.$data['amount'].' for '.$payment->period_start->format('F Y'),
            $previous,
            ['amount_paid' => $payment->amount_paid, 'status' => $payment->status],
        );

        return back()->with('success', 'Rent payment recorded. Status: '.$payment->status.'.');
    }

    /** Ensure schedule rows exist for the next $months months. */
    public function ensureSchedule(Rent $rent, int $months = 3): void
    {
        if ($rent->status !== 'active') {
            return;
        }

        $cursor = Carbon::parse($rent->start_date)->startOfMonth();
        $limit = now()->startOfMonth()->addMonths($months);

        while ($cursor <= $limit) {
            if ($cursor->gte($rent->start_date->copy()->startOfMonth())) {
                RentPayment::firstOrCreate(
                    [
                        'rent_id' => $rent->id,
                        'period_start' => $cursor->toDateString(),
                    ],
                    [
                        'period_end' => $cursor->copy()->endOfMonth()->toDateString(),
                        'amount_due' => $rent->monthly_amount,
                        'amount_paid' => 0,
                        'due_date' => $cursor->copy()->addDays($rent->due_day - 1)->toDateString(),
                        'status' => 'unpaid',
                    ]
                );
            }
            $cursor->addMonth();
        }
    }
}
