<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Services\PurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function __construct(private PurchaseService $purchases) {}

    public function index(Request $request): Response
    {
        $query = Purchase::with(['supplier:id,name', 'user:id,name']);

        if ($search = $request->string('q')->toString()) {
            $query->where(fn ($q) => $q->where('purchase_number', 'like', "%{$search}%")
                ->orWhere('invoice_number', 'like', "%{$search}%")
                ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', "%{$search}%")));
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->string('payment_status'));
        }

        if ($request->filled('from')) {
            $query->whereDate('purchased_at', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('purchased_at', '<=', $request->string('to'));
        }

        $purchases = $query->latest('purchased_at')->latest('id')->paginate(12)->withQueryString();

        return Inertia::render('purchases/Index', [
            'purchases' => $purchases->through(fn ($p) => [
                'id' => $p->id,
                'purchase_number' => $p->purchase_number,
                'supplier' => $p->supplier?->name,
                'purchased_at' => $p->purchased_at->format('M d, Y'),
                'total' => $p->total,
                'paid_amount' => $p->paid_amount,
                'remaining_amount' => $p->remaining_amount,
                'payment_status' => $p->payment_status,
                'user' => $p->user?->name,
                'items_count' => $p->items()->count(),
            ]),
            'filters' => $request->only(['q', 'payment_status', 'from', 'to']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('purchases/Create', [
            'suppliers' => Supplier::where('status', 'active')->orderBy('name')->get(['id', 'name', 'phone', 'balance']),
            'variants' => ProductVariant::with('product:id,name,sku')
                ->where('status', 'active')
                ->orderByDesc('updated_at')
                ->limit(500)
                ->get()
                ->map(fn ($v) => [
                    'id' => $v->id,
                    'label' => $v->product?->name.' — '.$v->name,
                    'sku' => $v->sku,
                    'barcode' => $v->barcode,
                    'current_cost' => $v->cost,
                    'stock' => $v->stock,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'purchased_at' => ['required', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'in:cash,bank,mobile'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'items.*.batch_number' => ['nullable', 'string', 'max:100'],
            'items.*.expires_at' => ['nullable', 'date'],
            'items.*.manufactured_at' => ['nullable', 'date'],
        ]);

        try {
            $purchase = $this->purchases->create($data, $request->user());
        } catch (\DomainException $e) {
            return back()->withErrors(['items' => 'Unable to receive stock: '.($e->getMessage() === 'insufficient_stock' ? 'stock validation failed.' : $e->getMessage())]);
        }

        return redirect()->route('purchases.show', $purchase)
            ->with('success', 'Purchase '.$purchase->purchase_number.' recorded. Inventory and costs updated.');
    }

    public function show(Purchase $purchase): Response
    {
        $purchase->load(['supplier', 'user:id,name', 'items.variant.product', 'payments.user:id,name']);

        return Inertia::render('purchases/Show', [
            'purchase' => [
                'id' => $purchase->id,
                'purchase_number' => $purchase->purchase_number,
                'invoice_number' => $purchase->invoice_number,
                'purchased_at' => $purchase->purchased_at->format('M d, Y'),
                'supplier' => $purchase->supplier?->name,
                'supplier_id' => $purchase->supplier_id,
                'user' => $purchase->user?->name,
                'subtotal' => $purchase->subtotal,
                'discount' => $purchase->discount,
                'tax_amount' => $purchase->tax_amount,
                'total' => $purchase->total,
                'paid_amount' => $purchase->paid_amount,
                'remaining_amount' => $purchase->remaining_amount,
                'payment_status' => $purchase->payment_status,
                'notes' => $purchase->notes,
                'items' => $purchase->items->map(fn ($i) => [
                    'id' => $i->id,
                    'variant' => $i->variant?->product?->name.' — '.($i->variant?->name ?? ''),
                    'sku' => $i->variant?->sku,
                    'quantity' => $i->quantity,
                    'unit_cost' => $i->unit_cost,
                    'total_cost' => $i->total_cost,
                    'batch_number' => $i->batch_number,
                    'expires_at' => $i->expires_at?->format('M d, Y'),
                ])->all(),
                'payments' => $purchase->payments->map(fn ($p) => [
                    'id' => $p->id,
                    'amount' => $p->amount,
                    'method' => $p->payment_method,
                    'paid_at' => $p->paid_at->format('M d, Y H:i'),
                    'user' => $p->user?->name,
                    'reference' => $p->reference,
                ])->all(),
            ],
        ]);
    }

    public function pay(Request $request, Purchase $purchase): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,bank,mobile'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $this->purchases->recordPayment($purchase, $data, $request->user());
        } catch (\DomainException $e) {
            return back()->withErrors(['amount' => 'Payment cannot exceed the remaining balance of '.$purchase->remaining_amount.'.']);
        }

        return back()->with('success', 'Supplier payment recorded.');
    }
}
