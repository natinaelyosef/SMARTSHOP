<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\StockTransfer;
use App\Services\BranchContext;
use App\Services\BranchStockService;
use App\Services\StockTransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockTransferController extends Controller
{
    public function __construct(
        private StockTransferService $transfers,
        private BranchStockService $branchStock,
    ) {}

    public function index(): Response
    {
        return Inertia::render('transfers/Index', [
            'transfers' => StockTransfer::with(['fromBranch:id,name', 'toBranch:id,name', 'user:id,name', 'items'])
                ->withCount('items')
                ->latest('created_at')
                ->limit(50)
                ->get()
                ->map(fn (StockTransfer $t) => [
                    'id' => $t->id,
                    'transfer_number' => $t->transfer_number,
                    'from' => $t->fromBranch?->name,
                    'to' => $t->toBranch?->name,
                    'user' => $t->user?->name,
                    'status' => $t->status,
                    'lines' => $t->items_count,
                    'notes' => $t->notes,
                    'transferred_at' => $t->transferred_at?->format('M d, Y H:i'),
                ]),
            'branches' => Branch::where('is_active', true)
                ->orderByDesc('is_primary')->orderBy('name')
                ->get(['id', 'name', 'code'])
                ->all(),
            'active_branch_id' => BranchContext::id(),
        ]);
    }

    /**
     * Stock a branch can still send out — the source list for the form.
     *
     * Returned as JSON so the transfer modal can filter it live without a
     * full page reload.
     */
    public function sourceStock(Request $request): JsonResponse
    {
        $branchId = BranchContext::idFor($request->user(), $request->integer('branch_id') ?: null)
            ?? BranchContext::id();

        abort_if($branchId === null, 422, 'No branch selected.');

        $variants = BranchStock::with(['variant.product:id,name,sku'])
            ->where('branch_id', $branchId)
            ->where('stock', '>', 0)
            ->orderByDesc('stock')
            ->limit(200)
            ->get()
            ->map(fn (BranchStock $row) => [
                'product_variant_id' => $row->product_variant_id,
                'label' => $row->variant?->fullName(),
                'sku' => $row->variant?->sku,
                'stock' => (float) $row->stock,
                'cost' => (float) $row->cost,
            ]);

        return response()->json(['variants' => $variants]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from_branch_id' => ['required', 'integer'],
            'to_branch_id' => ['required', 'integer', 'different:from_branch_id'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $this->transfers->create($request->user(), $data);

        return back()->with('success', 'Stock transferred.');
    }

    public function destroy(Request $request, StockTransfer $transfer): RedirectResponse
    {
        $this->transfers->reverse($request->user(), $transfer);

        return back()->with('success', 'Transfer reversed.');
    }
}