<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Unit;
use App\Services\AuditLogger;
use App\Services\InventoryService;
use App\Services\ShopSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Product::with(['category:id,name', 'unit:id,name,short_name', 'variants'])
            ->withCount(['variants as variants_count', 'variants as active_variants_count' => fn ($q) => $q->where('status', 'active')])
            ->where('status', '!=', 'deleted');

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhereHas('variants', fn ($v) => $v->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('category')) {
            $query->where('category_id', $request->integer('category'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $products = $query->orderByDesc('updated_at')->paginate(12)->withQueryString();

        return Inertia::render('products/Index', [
            'products' => $products->through(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'barcode' => $p->barcode,
                'brand' => $p->brand,
                'image' => $p->image,
                'status' => $p->status,
                'category' => $p->category?->name,
                'unit' => $p->unit?->name,
                'variants_count' => $p->variants_count,
                'stock' => round($p->variants->sum('stock'), 2),
                'min_price' => $p->variants->where('status', 'active')->min('selling_price'),
                'max_price' => $p->variants->where('status', 'active')->max('selling_price'),
                'variants' => $p->variants->map(fn ($v) => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'status' => $v->status,
                    'selling_price' => (float) $v->selling_price,
                ])->values(),
                'updated_at' => $p->updated_at->diffForHumans(),
            ]),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['q', 'category', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('products/Create', [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'units' => Unit::where('status', 'active')->orderBy('name')->get(['id', 'name', 'short_name']),
            'settings' => ['currency_symbol' => ShopSettings::currencySymbol()],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'unit_id' => ['nullable', 'exists:units,id'],
            'brand' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'in:active,archived'],
            'variants' => ['required', 'array', 'min:1'],
            'variants.*.name' => ['required', 'string', 'max:255'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.barcode' => ['nullable', 'string', 'max:100'],
            'variants.*.unit_id' => ['nullable', 'exists:units,id'],
            'variants.*.cost' => ['nullable', 'numeric', 'min:0'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.min_stock' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock' => ['nullable', 'numeric', 'min:0'],
            'variants.*.track_expiry' => ['nullable', 'boolean'],
        ]);

        $baseSku = $this->uniqueSku(strtoupper(Str::substr(Str::slug($data['name'], '-'), 0, 12)) ?: 'PRD');

        $product = Product::create([
            'name' => $data['name'],
            'sku' => $baseSku,
            'barcode' => $request->input('barcode'),
            'qr_code' => $baseSku,
            'category_id' => $data['category_id'] ?? null,
            'unit_id' => $data['unit_id'] ?? null,
            'brand' => $data['brand'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => $data['status'],
        ]);

        foreach ($data['variants'] as $i => $variant) {
            $variantSku = $variant['sku'] ?: $baseSku.'-'.($i + 1);
            $ProductVariant = ProductVariant::create([
                'product_id' => $product->id,
                'unit_id' => $variant['unit_id'] ?? $product->unit_id,
                'name' => $variant['name'],
                'sku' => $this->uniqueVariantSku($variantSku),
                'barcode' => $variant['barcode'] ?? null,
                'cost' => $variant['cost'] ?? 0,
                'selling_price' => $variant['selling_price'],
                'min_stock' => $variant['min_stock'] ?? 0,
                'stock' => 0,
                'track_expiry' => ! empty($variant['track_expiry']),
                'status' => 'active',
            ]);

            if (isset($variant['stock']) && $variant['stock'] > 0) {
                app(InventoryService::class)->recordMovement(
                    $ProductVariant,
                    'initial_stock',
                    (float) $variant['stock'],
                    (float) ($variant['cost'] ?? 0),
                    Product::class,
                    $product->id,
                    'Opening stock',
                    null,
                    applyCosting: true,
                );
            }

            if ($variant['selling_price'] > 0) {
                PriceHistory::create([
                    'product_variant_id' => $ProductVariant->id,
                    'old_price' => 0,
                    'new_price' => $variant['selling_price'],
                    'cost_at_time' => $variant['cost'] ?? 0,
                    'user_id' => auth()->id(),
                    'reason' => 'Initial price',
                    'effective_at' => now(),
                ]);
            }
        }

        AuditLogger::log('product.created', Product::class, $product->id, "Product {$product->name} created");

        return redirect()->route('products.show', $product)
            ->with('success', 'Product created successfully.');
    }

    public function show(Product $product): Response
    {
        $product->load([
            'category:id,name', 'unit:id,name,short_name',
            'variants.unit:id,name,short_name',
            'variants.priceHistories' => fn ($q) => $q->latest('effective_at')->limit(10),
            'variants.priceHistories.user:id,name',
        ]);

        $purchaseHistory = $product->variants()->with('purchaseItems.purchase.supplier:id,name')
            ->get()
            ->flatMap(fn ($v) => $v->purchaseItems->map(fn ($item) => [
                'variant' => $v->name,
                'date' => $item->purchase->purchased_at->format('M d, Y'),
                'quantity' => $item->quantity,
                'unit_cost' => $item->unit_cost,
                'total' => $item->total_cost,
                'supplier' => $item->purchase->supplier?->name,
            ]))
            ->sortByDesc('date')
            ->values()
            ->all();

        return Inertia::render('products/Show', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'qr_code' => $product->qr_code,
                'brand' => $product->brand,
                'description' => $product->description,
                'status' => $product->status,
                'category' => $product->category?->name,
                'unit' => $product->unit?->name,
                'created_at' => $product->created_at->format('M d, Y'),
                'updated_at' => $product->updated_at->format('M d, Y H:i'),
                'variants' => $product->variants->map(fn ($v) => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'sku' => $v->sku,
                    'barcode' => $v->barcode,
                    'unit' => $v->unit?->name,
                    'cost' => $v->cost,
                    'selling_price' => $v->selling_price,
                    'stock' => $v->stock,
                    'min_stock' => $v->min_stock,
                    'status' => $v->status,
                    'margin' => $v->selling_price > 0
                        ? round((($v->selling_price - $v->cost) / $v->selling_price) * 100, 1)
                        : 0,
                    'losing' => $v->isLosingMoney(),
                    'low_stock' => $v->isLowStock(ShopSettings::lowStockThreshold()),
                    'price_history' => $v->priceHistories->map(fn ($h) => [
                        'id' => $h->id,
                        'old_price' => $h->old_price,
                        'new_price' => $h->new_price,
                        'cost_at_time' => $h->cost_at_time,
                        'reason' => $h->reason,
                        'user' => $h->user?->name,
                        'effective_at' => $h->effective_at->format('M d, Y H:i'),
                    ])->all(),
                ])->all(),
            ],
            'purchaseHistory' => $purchaseHistory,
            'settings' => ['currency_symbol' => ShopSettings::currencySymbol()],
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'unit_id' => ['nullable', 'exists:units,id'],
            'brand' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'barcode' => ['nullable', 'string', 'max:100'],
            'status' => ['required', 'in:active,archived'],
        ]);

        $previous = $product->only(['name', 'category_id', 'unit_id', 'brand', 'status', 'barcode']);
        $product->fill($data)->save();

        AuditLogger::log(
            'product.updated',
            Product::class,
            $product->id,
            "Product {$product->name} updated",
            $previous,
            $product->only(array_keys($data)),
        );

        return back()->with('success', 'Product updated successfully.');
    }

    public function archive(Product $product): RedirectResponse
    {
        $previous = ['status' => $product->status];
        $product->status = 'archived';
        $product->save();

        AuditLogger::log('product.archived', Product::class, $product->id, "Product {$product->name} archived", $previous, ['status' => 'archived']);

        return redirect()->route('products.index')->with('success', 'Product archived. Historical data is preserved.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $previous = ['status' => $product->status];
        $product->status = 'deleted';
        $product->save();

        AuditLogger::log('product.deleted', Product::class, $product->id, "Product {$product->name} removed from the list", $previous, ['status' => 'deleted']);

        return redirect()->route('products.index')->with('success', 'Product removed from the list. Sales history and stock records are preserved.');
    }

    public function updatePrice(Request $request, ProductVariant $variant): RedirectResponse
    {
        $data = $request->validate([
            'selling_price' => ['required', 'numeric', 'min:0'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $oldPrice = (float) $variant->selling_price;
        $newPrice = (float) $data['selling_price'];

        if ($oldPrice === $newPrice) {
            return back()->with('error', 'The new price is the same as the current price.');
        }

        $variant->selling_price = $newPrice;
        $variant->save();

        PriceHistory::create([
            'product_variant_id' => $variant->id,
            'old_price' => $oldPrice,
            'new_price' => $newPrice,
            'cost_at_time' => (float) $variant->cost,
            'user_id' => auth()->id(),
            'reason' => $data['reason'] ?? null,
            'effective_at' => now(),
        ]);

        AuditLogger::log(
            'price.changed',
            ProductVariant::class,
            $variant->id,
            'Price changed from '.$oldPrice.' to '.$newPrice,
            ['selling_price' => $oldPrice],
            ['selling_price' => $newPrice],
            $data['reason'] ?? null,
        );

        $warning = $newPrice < $variant->cost
            ? ' Warning: this price is below the estimated cost of '.$variant->cost.' and may generate a loss.'
            : '';

        return back()->with('success', 'Price updated from '.$oldPrice.' to '.$newPrice.'.'.$warning);
    }

    private function uniqueSku(string $base): string
    {
        $sku = $base;
        $i = 1;
        while (Product::where('sku', $sku)->exists()) {
            $sku = $base.'-'.(++$i);
        }

        return $sku;
    }

    private function uniqueVariantSku(string $base): string
    {
        $sku = $base;
        $i = 1;
        while (ProductVariant::withTrashed()->where('sku', $sku)->exists()) {
            $sku = $base.'-'.(++$i);
        }

        return $sku;
    }
}
