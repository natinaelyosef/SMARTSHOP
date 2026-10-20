<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\SaleItem;
use App\Models\SalesReturnItem;
use App\Models\StockBatch;
use App\Services\AuditLogger;
use App\Services\BranchContext;
use App\Services\BranchStockService;
use App\Services\InventoryService;
use App\Services\ShopSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    /**
     * Branch the screen is reporting on. Managers may look at another
     * branch; everyone else is locked to their own.
     */
    private function branchId(Request $request): ?int
    {
        $requested = $request->filled('branch_id') ? $request->integer('branch_id') : null;

        return BranchContext::idFor($request->user(), $requested) ?? BranchContext::id();
    }

    public function index(Request $request): Response
    {
        $branchId = $this->branchId($request);

        $query = InventoryMovement::with(['variant.product:id,name', 'user:id,name', 'branch:id,name'])
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId));

        if ($request->filled('variant')) {
            $query->where('product_variant_id', $request->integer('variant'));
        }

        if ($request->filled('type')) {
            $query->where('movement_type', $request->string('type'));
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->string('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->string('to'));
        }

        if ($search = $request->string('q')->toString()) {
            $query->whereHas('variant.product', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        $branch = $branchId ? Branch::find($branchId) : null;

        return Inertia::render('inventory/Index', [
            'movements' => $query->latest()->paginate(20)->withQueryString(),
            'types' => InventoryMovement::TYPES,
            'branch' => $branch ? ['id' => $branch->id, 'name' => $branch->name] : null,
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name'])->all(),
            'filters' => $request->only(['q', 'variant', 'type', 'from', 'to', 'branch_id']),
        ]);
    }

    public function stock(Request $request): Response
    {
        $threshold = ShopSettings::lowStockThreshold();
        $branchId = $this->branchId($request);

        // Stock lives per branch, so this screen lists what the branch
        // being worked on actually holds.
        $stocks = BranchStock::with(['variant.product:id,name,category_id,status', 'variant.unit:id,name,short_name'])
            ->where('branch_id', $branchId)
            ->whereHas('variant', fn ($q) => $q->where('status', 'active'));

        if ($request->filled('filter')) {
            $filter = $request->string('filter');

            if ($filter === 'low') {
                $stocks->where('stock', '>', 0)->where(function ($q) use ($threshold) {
                    $q->whereColumn('stock', '<=', 'min_stock')->orWhere('stock', '<=', $threshold);
                });
            } elseif ($filter === 'out') {
                $stocks->where('stock', '<=', 0);
            } elseif ($filter === 'losing') {
                $stocks->whereHas('variant', fn ($q) => $q->where('cost', '>', 0)->whereColumn('selling_price', '<', 'cost'));
            }
        }

        if ($search = $request->string('q')->toString()) {
            $stocks->whereHas('variant', function ($q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhereHas('product', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        $variants = $stocks->orderBy('stock')->paginate(20)->withQueryString();

        $expiring = StockBatch::with('variant.product:id,name')
            ->where('branch_id', $branchId)
            ->where('remaining_quantity', '>', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now()->addDays(90))
            ->orderBy('expires_at')
            ->limit(20)
            ->get();

        $stockValue = (float) BranchStock::where('branch_id', $branchId)
            ->selectRaw('COALESCE(SUM(stock*cost),0) as v')->value('v');

        $branch = $branchId ? Branch::find($branchId) : null;

        return Inertia::render('inventory/Stock', [
            'branch' => $branch ? ['id' => $branch->id, 'name' => $branch->name] : null,
            'variants' => $variants->through(fn (BranchStock $row) => [
                'id' => $row->product_variant_id,
                'product' => $row->variant?->product?->name,
                'name' => $row->variant?->name,
                'sku' => $row->variant?->sku,
                'barcode' => $row->variant?->barcode,
                'unit' => $row->variant?->unit?->short_name ?: $row->variant?->unit?->name,
                'stock' => (float) $row->stock,
                'min_stock' => (float) ($row->min_stock ?: $row->variant?->min_stock),
                'cost' => (float) $row->cost,
                'chain_stock' => (float) ($row->variant?->stock ?? 0),
                'selling_price' => (float) $row->variant?->selling_price,
                'stock_value' => round((float) $row->stock * (float) $row->cost, 2),
                'margin' => $row->variant?->selling_price > 0
                    ? round((($row->variant->selling_price - $row->cost) / $row->variant->selling_price) * 100, 1)
                    : 0,
                'status' => $row->stock <= 0 ? 'out' : (
                    $row->stock <= (float) ($row->min_stock ?: $threshold) ? 'low' : 'ok'
                ),
                'losing' => $row->variant?->isLosingMoney() ?? false,
            ]),
            'expiring' => $expiring->map(fn ($b) => [
                'id' => $b->id,
                'variant' => $b->variant?->product?->name.' '.($b->variant?->name ?? ''),
                'batch_number' => $b->batch_number,
                'quantity' => $b->remaining_quantity,
                'expires_at' => $b->expires_at->format('M d, Y'),
                'state' => $b->expires_at->isPast() ? 'expired' : ($b->expires_at->diffInDays(now()) <= 7 ? 'critical' : ($b->expires_at->diffInDays(now()) <= 30 ? 'soon' : 'watch')),
            ]),
            'stockValue' => $stockValue,
            'filters' => $request->only(['q', 'filter']),
        ]);
    }

    public function adjust(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'product_variant_id' => ['required', 'exists:product_variants,id'],
            'movement_type' => ['required', 'in:damaged,expired,adjustment,initial_stock,purchase_return'],
            'quantity' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $variant = ProductVariant::with('product')->findOrFail($data['product_variant_id']);
        $branchId = $this->branchId($request);

        $type = $data['movement_type'];
        $qty = (float) $data['quantity'];

        if (in_array($type, ['damaged', 'expired'], true) && $qty > 0) {
            $qty = -$qty;
        }

        if ($type === 'adjustment') {
            // quantity is a signed delta relative to current stock
        } elseif ($qty < 0) {
            $qty = abs($qty) * -1;
        }

        $currentStock = app(BranchStockService::class)->stockFor((int) $variant->id, $branchId);

        try {
            $this->inventory->recordMovement(
                $variant,
                $type,
                $qty,
                (float) $variant->cost,
                null,
                null,
                $data['reason'],
                $request->user()->id,
                false,
                $branchId,
            );
        } catch (\DomainException $e) {
            return back()->withErrors(['quantity' => 'Adjustment would make stock negative. Current stock: '.$currentStock.'.']);
        }

        $newStock = app(BranchStockService::class)->stockFor((int) $variant->id, $branchId);

        AuditLogger::log(
            'inventory.adjusted',
            ProductVariant::class,
            $variant->id,
            'Stock adjusted by '.$qty.' ('.$type.') at branch #'.$branchId,
            ['stock' => $currentStock],
            ['stock' => $newStock],
            $data['reason'],
        );

        return back()->with('success', 'Stock updated. New stock: '.$newStock.'.');
    }

    public function variant(ProductVariant $variant): Response
    {
        $variant->load(['product:id,name,sku,category_id', 'unit:id,name,short_name', 'priceHistories.user:id,name']);

        $movements = InventoryMovement::where('product_variant_id', $variant->id)
            ->with('user:id,name')->latest()->limit(50)->get();

        $purchaseItems = $variant->purchaseItems()->with('purchase.supplier:id,name')
            ->latest()->limit(25)->get()
            ->map(fn ($i) => [
                'date' => $i->purchase?->purchased_at->format('M d, Y'),
                'supplier' => $i->purchase?->supplier?->name,
                'purchase_number' => $i->purchase?->purchase_number,
                'quantity' => $i->quantity,
                'unit_cost' => $i->unit_cost,
                'total' => $i->total_cost,
                'batch_number' => $i->batch_number,
                'expires_at' => $i->expires_at?->format('M d, Y'),
            ]);

        $saleStats = SaleItem::where('product_variant_id', $variant->id)
            ->selectRaw('COALESCE(SUM(quantity),0) as qty, COALESCE(SUM(total_price),0) as revenue, COALESCE(SUM(cost_of_goods),0) as cogs, COALESCE(SUM(profit),0) as profit')
            ->first();

        $returned = SalesReturnItem::where('product_variant_id', $variant->id)
            ->selectRaw('COALESCE(SUM(quantity),0) as qty, COALESCE(SUM(refund_amount),0) as refund, COALESCE(SUM(quantity*unit_cost),0) as cogs')
            ->first();

        $batches = $variant->stockBatches()->orderBy('expires_at')->get();

        return Inertia::render('inventory/Variant', [
            'variant' => [
                'id' => $variant->id,
                'product' => $variant->product?->name,
                'name' => $variant->name,
                'sku' => $variant->sku,
                'barcode' => $variant->barcode,
                'unit' => $variant->unit?->name,
                'stock' => $variant->stock,
                'min_stock' => $variant->min_stock,
                'cost' => $variant->cost,
                'selling_price' => $variant->selling_price,
                'status' => $variant->status,
                'margin' => $variant->selling_price > 0 ? round((($variant->selling_price - $variant->cost) / $variant->selling_price) * 100, 1) : 0,
                'losing' => $variant->isLosingMoney(),
                'created_at' => $variant->created_at->format('M d, Y'),
            ],
            'movements' => $movements->map(fn ($m) => [
                'id' => $m->id,
                'date' => $m->created_at->format('M d, Y'),
                'time' => $m->created_at->format('H:i'),
                'type' => $m->movement_type,
                'quantity' => $m->quantity,
                'previous_stock' => $m->previous_stock,
                'new_stock' => $m->new_stock,
                'unit_cost' => $m->unit_cost,
                'user' => $m->user?->name,
                'reference' => $m->reference_type ? class_basename($m->reference_type).' #'.$m->reference_id : null,
                'reason' => $m->reason,
            ]),
            'priceHistory' => $variant->priceHistories->map(fn ($h) => [
                'id' => $h->id,
                'old_price' => $h->old_price,
                'new_price' => $h->new_price,
                'cost_at_time' => $h->cost_at_time,
                'reason' => $h->reason,
                'user' => $h->user?->name,
                'effective_at' => $h->effective_at->format('M d, Y H:i'),
            ]),
            'purchaseHistory' => $purchaseItems,
            'batches' => $batches->map(fn ($b) => [
                'id' => $b->id,
                'batch_number' => $b->batch_number,
                'quantity' => $b->quantity,
                'remaining' => $b->remaining_quantity,
                'unit_cost' => $b->unit_cost,
                'expires_at' => $b->expires_at?->format('M d, Y'),
                'supplier' => $b->supplier?->name,
            ]),
            'profitability' => [
                'quantity_sold' => $saleStats->qty - $returned->qty,
                'revenue' => round($saleStats->revenue - $returned->refund, 2),
                'cogs' => round($saleStats->cogs - $returned->cogs, 2),
                'profit' => round(($saleStats->revenue - $returned->refund) - ($saleStats->cogs - $returned->cogs), 2),
                'stock_value' => round($variant->stock * $variant->cost, 2),
            ],
        ]);
    }
}
