<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

/**
 * Per-branch stock.
 *
 * This is the authority on how much a branch can actually sell. The
 * `product_variants.stock` column is only a chain-wide cached total kept
 * for fast reporting, refreshed after every change.
 */
class BranchStockService
{
    public function ensureRow(int $variantId, int $branchId): BranchStock
    {
        return BranchStock::firstOrCreate(
            ['branch_id' => $branchId, 'product_variant_id' => $variantId],
            ['min_stock' => 0, 'stock' => 0, 'cost' => 0]
        );
    }

    public function find(int $variantId, int $branchId): ?BranchStock
    {
        return BranchStock::where('product_variant_id', $variantId)
            ->where('branch_id', $branchId)
            ->first();
    }

    public function stockFor(int $variantId, int $branchId): float
    {
        return (float) (BranchStock::where('product_variant_id', $variantId)
            ->where('branch_id', $branchId)
            ->value('stock') ?? 0);
    }

    /**
     * Apply a signed quantity change to one branch.
     *
     * Positive increases stock, negative decreases it. Returns the
     * movement of quantities (before → after) so callers can log it.
     *
     * @return array{stock: BranchStock, previous: float, next: float}
     */
    public function apply(
        int $variantId,
        int $branchId,
        float $quantity,
        bool $allowNegative = false,
        ?float $incomingUnitCost = null,
    ): array {
        if ($quantity == 0) {
            throw new \InvalidArgumentException('Stock change must not be zero.');
        }

        return DB::transaction(function () use ($variantId, $branchId, $quantity, $allowNegative, $incomingUnitCost) {
            $this->ensureRow($variantId, $branchId);

            $row = BranchStock::where('product_variant_id', $variantId)
                ->where('branch_id', $branchId)
                ->lockForUpdate()
                ->firstOrFail();

            $previous = (float) $row->stock;
            $next = round($previous + $quantity, 2);

            if ($next < 0 && ! $allowNegative) {
                throw new \DomainException('insufficient_stock');
            }

            if ($incomingUnitCost !== null && $quantity > 0) {
                $row->cost = static::weightedAverageCost(
                    $previous,
                    (float) $row->cost,
                    $quantity,
                    $incomingUnitCost
                );
            }

            $row->stock = $next;
            $row->save();

            return ['stock' => $row, 'previous' => $previous, 'next' => $next];
        });
    }

    public static function weightedAverageCost(float $oldQty, float $oldCost, float $newQty, float $newCost): float
    {
        $totalQty = $oldQty + $newQty;

        if ($totalQty <= 0) {
            return round($newCost, 4);
        }

        return round(($oldQty * $oldCost + $newQty * $newCost) / $totalQty, 4);
    }

    /**
     * Refresh the cached chain-wide total and cost from the branch rows.
     */
    public function refreshVariantTotals(ProductVariant $variant): void
    {
        $totals = BranchStock::where('product_variant_id', $variant->id)
            ->selectRaw('COALESCE(SUM(stock),0) as stock, COALESCE(SUM(stock * cost),0) as value')
            ->first();

        $variant->stock = round((float) ($totals->stock ?? 0), 2);

        $stockValue = (float) ($totals->value ?? 0);

        if ($stockValue > 0) {
            $variant->cost = round($stockValue / max((float) $variant->stock, 0.0001), 4);
        }

        $variant->save();
    }

    /**
     * Copy every branch row for a variant into one more branch. Used
     * when a new branch is opened for an existing catalogue.
     */
    public function seedBranch(int $branchId, ?int $fromBranchId = null): int
    {
        $source = $fromBranchId
            ? BranchStock::where('branch_id', $fromBranchId)->get()
            : BranchStock::query()->get();

        $copied = 0;

        foreach ($source as $row) {
            BranchStock::firstOrCreate(
                ['branch_id' => $branchId, 'product_variant_id' => $row->product_variant_id],
                ['stock' => 0, 'min_stock' => $row->min_stock, 'cost' => $row->cost]
            );
            $copied++;
        }

        return $copied;
    }

    /**
     * Variants whose branch quantity has fallen to or below the
     * effective reorder point.
     */
    public function lowStockQuery(int $branchId, float $shopThreshold)
    {
        return BranchStock::query()
            ->with(['variant.product:id,name,sku', 'branch:id,name'])
            ->where('branch_id', $branchId)
            ->where('stock', '>', 0)
            ->where(function ($query) use ($shopThreshold) {
                $query->whereColumn('stock', '<=', 'min_stock')
                    ->orWhere('stock', '<=', $shopThreshold);
            });
    }

    /**
     * Branch ids this shop owns, used when reporting across branches.
     *
     * @return array<int, int>
     */
    public function branchIds(?int $shopId = null): array
    {
        $query = Branch::query()->where('is_active', true);

        if ($shopId !== null) {
            $query->where('shop_id', $shopId);
        }

        return $query->pluck('id')->map(fn ($id) => (int) $id)->all();
    }
}