<?php

namespace App\Http\Controllers;

use App\Models\PurchaseItem;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Supplier::query();

        if ($search = $request->string('q')->toString()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('company', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%"));
        }

        $suppliers = $query->orderBy('name')->paginate(12)->withQueryString();

        return Inertia::render('suppliers/Index', [
            'suppliers' => $suppliers->through(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'company' => $s->company,
                'phone' => $s->phone,
                'address' => $s->address,
                'balance' => $s->balance,
                'status' => $s->status,
                'purchases_count' => $s->purchases()->count(),
                'total_purchased' => (float) $s->purchases()->sum('total'),
                'last_purchase' => optional($s->purchases()->max('purchased_at')),
            ]),
            'filters' => $request->only('q'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $supplier = Supplier::create($data);

        AuditLogger::log('supplier.created', Supplier::class, $supplier->id, "Supplier {$supplier->name} created");

        return back()->with('success', 'Supplier created.');
    }

    public function show(Supplier $supplier): Response
    {
        $purchases = $supplier->purchases()->with('user:id,name')->latest('purchased_at')->paginate(10);

        $payments = PurchasePayment::whereHas('purchase', fn ($q) => $q->where('supplier_id', $supplier->id))
            ->with('purchase:id,purchase_number', 'user:id,name')
            ->latest('paid_at')->limit(15)->get();

        $productsSupplied = PurchaseItem::whereIn(
            'purchase_id',
            $supplier->purchases()->select('id')
        )
            ->with('variant.product:id,name')
            ->selectRaw('product_variant_id, SUM(quantity) as qty, AVG(unit_cost) as avg_cost')
            ->groupBy('product_variant_id')
            ->orderByDesc('qty')
            ->limit(15)
            ->get()
            ->map(fn ($i) => [
                'variant' => $i->variant?->product?->name.' '.($i->variant?->name ?? ''),
                'quantity' => $i->qty,
                'avg_cost' => round($i->avg_cost, 2),
            ]);

        return Inertia::render('suppliers/Show', [
            'supplier' => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'company' => $supplier->company,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'address' => $supplier->address,
                'tax_id' => $supplier->tax_id,
                'notes' => $supplier->notes,
                'balance' => $supplier->balance,
                'status' => $supplier->status,
                'created_at' => $supplier->created_at->format('M d, Y'),
            ],
            'purchases' => $purchases->through(fn ($p) => [
                'id' => $p->id,
                'purchase_number' => $p->purchase_number,
                'purchased_at' => $p->purchased_at->format('M d, Y'),
                'total' => $p->total,
                'paid_amount' => $p->paid_amount,
                'remaining_amount' => $p->remaining_amount,
                'payment_status' => $p->payment_status,
                'user' => $p->user?->name,
            ]),
            'payments' => $payments->map(fn ($p) => [
                'id' => $p->id,
                'purchase' => $p->purchase?->purchase_number,
                'amount' => $p->amount,
                'method' => $p->payment_method,
                'paid_at' => $p->paid_at->format('M d, Y H:i'),
                'user' => $p->user?->name,
            ]),
            'productsSupplied' => $productsSupplied,
        ]);
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', 'in:active,archived'],
        ]);

        $previous = $supplier->only(array_keys($data));
        $supplier->update($data);

        AuditLogger::log('supplier.updated', Supplier::class, $supplier->id, "Supplier {$supplier->name} updated", $previous, $data);

        return back()->with('success', 'Supplier updated.');
    }
}
