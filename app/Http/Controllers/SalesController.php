<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\TaxRule;
use App\Services\FinanceService;
use App\Services\SalesService;
use App\Services\ShopSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalesController extends Controller
{
    public function __construct(private SalesService $sales) {}

    /** POS screen data. */
    public function pos(): Response
    {
        $decimalUnits = ['kg', 'g', 'l', 'ml', 'm'];

        $variants = ProductVariant::with(['product:id,name,sku,category_id,image', 'unit:id,short_name,name'])
            ->where('status', 'active')
            ->whereHas('product', fn ($q) => $q->where('status', 'active'))
            ->orderByDesc('updated_at')
            ->limit(800)
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'product_id' => $v->product_id,
                'product' => $v->product?->name,
                'name' => $v->name,
                'sku' => $v->sku,
                'barcode' => $v->barcode,
                'price' => $v->selling_price,
                'cost' => $v->cost,
                'stock' => $v->stock,
                'track_expiry' => $v->track_expiry,
                'category_id' => $v->product?->category_id,
                'image' => $v->product?->image,
                'unit' => $v->unit?->short_name,
                'allow_decimal' => in_array(strtolower((string) $v->unit?->short_name), $decimalUnits, true),
                'min_stock' => $v->min_stock,
            ]);

        $tax = TaxRule::activeFor('sales');
        $shop = ShopSettings::shop();

        return Inertia::render('pos/Index', [
            'variants' => $variants,
            'categories' => Category::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'customers' => Customer::where('status', 'active')->orderBy('name')->limit(200)
                ->get(['id', 'name', 'phone', 'balance']),
            'shop' => [
                'name' => $shop->name,
                'address' => $shop->address,
                'phone' => $shop->phone,
            ],
            'today' => $this->todaySummary(),
            'next_sale_number' => Sale::nextNumber(),
            'settings' => [
                'currency_symbol' => ShopSettings::currencySymbol(),
                'default_payment_method' => $shop->default_payment_method,
                'allow_negative_stock' => ShopSettings::allowNegativeStock(),
                'tax_rate' => $tax?->rate ?? 0,
            ],
        ]);
    }

    private function todaySummary(): array
    {
        return [
            'count' => Sale::whereDate('sold_at', today())->count(),
            'revenue' => (float) Sale::whereDate('sold_at', today())->sum('total'),
        ];
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:cash,bank,mobile,credit'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'tendered_method' => ['nullable', 'in:cash,bank,mobile'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $sale = $this->sales->create($data, $request->user());
        } catch (\DomainException $e) {
            $message = match ($e->getMessage()) {
                'insufficient_stock' => 'Unable to complete the sale. Please check the product stock and try again.',
                'sale_no_items' => 'Please add at least one product to the sale.',
                'invalid_quantity' => 'Quantity must be greater than zero.',
                default => 'Unable to complete the sale. Please try again.',
            };

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 422);
            }

            return back()->withErrors(['error' => $message]);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'sale' => $this->saleReceipt($sale),
                'stocks' => $sale->items->mapWithKeys(fn ($i) => [
                    $i->product_variant_id => (float) $i->variant->fresh()->stock,
                ]),
                'today' => $this->todaySummary(),
                'shop' => [
                    'name' => ShopSettings::shop()->name,
                    'address' => ShopSettings::shop()->address,
                    'phone' => ShopSettings::shop()->phone,
                    'currency_symbol' => ShopSettings::currencySymbol(),
                ],
            ], 201);
        }

        if ($request->header('X-Inertia')) {
            return redirect()->route('sales.show', $sale)->with('success', 'Sale completed successfully.');
        }

        return redirect()->route('sales.show', $sale);
    }

    private function saleReceipt(Sale $sale): array
    {
        return [
            'id' => $sale->id,
            'sale_number' => $sale->sale_number,
            'sold_at' => $sale->sold_at->format('M d, Y H:i'),
            'cashier' => $sale->user?->name,
            'customer' => $sale->customer?->name,
            'subtotal' => $sale->subtotal,
            'discount' => $sale->discount,
            'tax_amount' => $sale->tax_amount,
            'total' => $sale->total,
            'profit' => $sale->profit,
            'paid_amount' => $sale->paid_amount,
            'remaining_amount' => $sale->remaining_amount,
            'payment_method' => $sale->payment_method,
            'payment_status' => $sale->payment_status,
            'items' => $sale->items->map(fn ($i) => [
                'name' => $i->variant?->product?->name.' — '.($i->variant?->name ?? ''),
                'quantity' => $i->quantity,
                'unit_price' => $i->unit_price,
                'total_price' => $i->total_price,
            ])->all(),
        ];
    }

    public function index(Request $request): Response
    {
        $query = Sale::with(['user:id,name', 'customer:id,name']);

        if ($period = $request->string('period')->toString()) {
            [$from, $to] = app(FinanceService::class)->range(
                $period,
                $request->string('from')->toString() ?: null,
                $request->string('to')->toString() ?: null,
            );
            $query->whereBetween('sold_at', [$from, $to]);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->string('payment_status'));
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(fn ($q) => $q->where('sale_number', 'like', "%{$search}%")
                ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%")));
        }

        if ($request->boolean('mine') && $request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        $sales = $query->latest('sold_at')->paginate(15)->withQueryString();

        return Inertia::render('sales/Index', [
            'sales' => $sales->through(fn ($s) => [
                'id' => $s->id,
                'sale_number' => $s->sale_number,
                'sold_at' => $s->sold_at->format('M d, Y H:i'),
                'customer' => $s->customer?->name,
                'cashier' => $s->user?->name,
                'total' => $s->total,
                'profit' => $s->profit,
                'payment_method' => $s->payment_method,
                'payment_status' => $s->payment_status,
                'remaining_amount' => $s->remaining_amount,
                'items_count' => $s->items()->count(),
            ]),
            'filters' => $request->only(['period', 'from', 'to', 'payment_status', 'q', 'mine']),
        ]);
    }

    public function show(Sale $sale): Response
    {
        $sale->load(['items.variant.product', 'customer', 'user:id,name', 'payments.user:id,name', 'returns.items']);

        return Inertia::render('sales/Show', [
            'sale' => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'sold_at' => $sale->sold_at->format('M d, Y H:i'),
                'cashier' => $sale->user?->name,
                'customer' => $sale->customer?->name,
                'customer_id' => $sale->customer_id,
                'subtotal' => $sale->subtotal,
                'discount' => $sale->discount,
                'tax_amount' => $sale->tax_amount,
                'total' => $sale->total,
                'cost_of_goods' => $sale->cost_of_goods,
                'profit' => $sale->profit,
                'paid_amount' => $sale->paid_amount,
                'remaining_amount' => $sale->remaining_amount,
                'payment_method' => $sale->payment_method,
                'payment_status' => $sale->payment_status,
                'notes' => $sale->notes,
                'items' => $sale->items->map(fn ($i) => [
                    'id' => $i->id,
                    'variant_id' => $i->product_variant_id,
                    'name' => $i->variant?->product?->name.' — '.($i->variant?->name ?? ''),
                    'quantity' => $i->quantity,
                    'returned_quantity' => $i->returned_quantity,
                    'unit_price' => $i->unit_price,
                    'unit_cost' => $i->unit_cost,
                    'total_price' => $i->total_price,
                    'profit' => $i->profit,
                ])->all(),
                'payments' => $sale->payments->map(fn ($p) => [
                    'id' => $p->id,
                    'amount' => $p->amount,
                    'method' => $p->payment_method,
                    'paid_at' => $p->paid_at->format('M d, Y H:i'),
                    'user' => $p->user?->name,
                ])->all(),
                'returns' => $sale->returns->map(fn ($r) => [
                    'id' => $r->id,
                    'return_number' => $r->return_number,
                    'refund_amount' => $r->refund_amount,
                    'reason' => $r->reason,
                    'returned_at' => $r->returned_at->format('M d, Y H:i'),
                    'user' => $r->user?->name,
                ])->all(),
            ],
            'shop' => [
                'name' => ShopSettings::shop()->name,
                'address' => ShopSettings::shop()->address,
                'phone' => ShopSettings::shop()->phone,
                'currency_symbol' => ShopSettings::currencySymbol(),
            ],
        ]);
    }

    public function pay(Request $request, Sale $sale): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,bank,mobile'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $this->sales->recordCustomerPayment($sale, $data, $request->user());
        } catch (\DomainException $e) {
            return back()->withErrors(['amount' => 'Payment cannot exceed the remaining balance of '.$sale->remaining_amount.'.']);
        }

        return back()->with('success', 'Customer payment recorded.');
    }

    public function returnForm(Sale $sale): Response
    {
        $sale->load(['items.variant.product', 'customer']);

        return Inertia::render('sales/Return', [
            'sale' => [
                'id' => $sale->id,
                'sale_number' => $sale->sale_number,
                'sold_at' => $sale->sold_at->format('M d, Y H:i'),
                'customer' => $sale->customer?->name,
                'total' => $sale->total,
                'items' => $sale->items->map(fn ($i) => [
                    'id' => $i->id,
                    'name' => $i->variant?->product?->name.' — '.($i->variant?->name ?? ''),
                    'quantity' => $i->quantity,
                    'returned_quantity' => $i->returned_quantity,
                    'returnable' => $i->quantity - $i->returned_quantity,
                    'unit_price' => $i->unit_price,
                ])->all(),
            ],
            'settings' => ['currency_symbol' => ShopSettings::currencySymbol()],
        ]);
    }

    public function returnItems(Request $request, Sale $sale): RedirectResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.sale_item_id' => ['required', 'exists:sale_items,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['required', 'in:cash,bank,mobile,credit'],
        ]);

        try {
            $return = $this->sales->returnItems($sale, $data, $request->user());
        } catch (\DomainException $e) {
            return back()->withErrors(['items' => $e->getMessage() === 'invalid_return_quantity'
                ? 'The return quantity exceeds the quantity sold on this sale.'
                : 'Unable to process the return.']);
        }

        return redirect()->route('sales.show', $sale)
            ->with('success', 'Return '.$return->return_number.' recorded. Refund: '.$return->refund_amount.' and inventory restored.');
    }
}
