<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\SalePayment;
use App\Services\AuditLogger;
use App\Services\SalesService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Customer::query();

        if ($search = $request->string('q')->toString()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%"));
        }

        if ($request->boolean('debtor')) {
            $query->where('balance', '>', 0);
        }

        $customers = $query->orderBy('name')->paginate(12)->withQueryString();

        return Inertia::render('customers/Index', [
            'customers' => $customers->through(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'address' => $c->address,
                'balance' => $c->balance,
                'status' => $c->status,
                'sales_count' => $c->sales()->count(),
                'total_spent' => (float) $c->sales()->sum('total'),
            ]),
            'filters' => $request->only('q', 'debtor'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $customer = Customer::create($data);

        AuditLogger::log('customer.created', Customer::class, $customer->id, "Customer {$customer->name} created");

        return back()->with('success', 'Customer created.');
    }

    public function show(Customer $customer): Response
    {
        $sales = $customer->sales()->with('user:id,name')->latest('sold_at')->paginate(10);

        $payments = SalePayment::whereIn('sale_id', $customer->sales()->select('id'))
            ->with('sale:id,sale_number', 'user:id,name')
            ->latest('paid_at')->limit(15)->get();

        return Inertia::render('customers/Show', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'address' => $customer->address,
                'notes' => $customer->notes,
                'balance' => $customer->balance,
                'status' => $customer->status,
                'total_spent' => (float) $customer->sales()->sum('total'),
                'created_at' => $customer->created_at->format('M d, Y'),
            ],
            'sales' => $sales->through(fn ($s) => [
                'id' => $s->id,
                'sale_number' => $s->sale_number,
                'sold_at' => $s->sold_at->format('M d, Y H:i'),
                'total' => $s->total,
                'paid_amount' => $s->paid_amount,
                'remaining_amount' => $s->remaining_amount,
                'payment_status' => $s->payment_status,
                'cashier' => $s->user?->name,
            ]),
            'payments' => $payments->map(fn ($p) => [
                'id' => $p->id,
                'sale' => $p->sale?->sale_number,
                'amount' => $p->amount,
                'method' => $p->payment_method,
                'paid_at' => $p->paid_at->format('M d, Y H:i'),
                'user' => $p->user?->name,
            ]),
        ]);
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:active,archived'],
        ]);

        $previous = $customer->only(array_keys($data));
        $customer->update($data);

        AuditLogger::log('customer.updated', Customer::class, $customer->id, "Customer {$customer->name} updated", $previous, $data);

        return back()->with('success', 'Customer updated.');
    }

    /** Record a payment against a customer's outstanding credit. */
    public function pay(Request $request, Customer $customer, SalesService $salesService): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,bank,mobile'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($data['amount'] > $customer->balance + 0.0001) {
            return back()->withErrors(['amount' => 'Payment cannot exceed the outstanding balance of '.$customer->balance.'.']);
        }

        $openSales = $customer->sales()
            ->where('remaining_amount', '>', 0)
            ->orderBy('sold_at')
            ->get();

        $remaining = (float) $data['amount'];

        foreach ($openSales as $sale) {
            if ($remaining <= 0) {
                break;
            }
            $apply = min($remaining, $sale->remaining_amount);
            $salesService->recordCustomerPayment($sale, [
                'amount' => $apply,
                'payment_method' => $data['payment_method'],
                'notes' => $data['notes'] ?? null,
            ], $request->user());
            $remaining -= $apply;
        }

        return back()->with('success', 'Payment of '.$data['amount'].' recorded for '.$customer->name.'.');
    }
}
