<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\StockBatch;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function __construct(private BranchStockService $branchStock) {}

    /**
     * Record a stock movement and update the branch quantity.
     *
     * The branch defaults to the one the current work is happening at,
     * so callers never have to think about it — but an explicit
     * $branchId overrides that, which transfers and back-dated entries
     * rely on.
     *
     * Positive quantity increases stock, negative decreases it.
     */
    public function recordMovement(
        ProductVariant $variant,
        string $type,
        float $quantity,
        float $unitCost = 0,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $reason = null,
        ?int $userId = null,
        bool $applyCosting = false,
        ?int $branchId = null,
    ): InventoryMovement {
        if ($quantity == 0) {
            throw new \InvalidArgumentException('Movement quantity must not be zero.');
        }

        $branchId ??= BranchContext::id();

        return DB::transaction(function () use ($variant, $type, $quantity, $unitCost, $referenceType, $referenceId, $reason, $userId, $applyCosting, $branchId) {
            if ($branchId === null) {
                throw new \DomainException('no_branch');
            }

            $allowNegative = ShopSettings::allowNegativeStock();

            $result = $this->branchStock->apply(
                (int) $variant->id,
                (int) $branchId,
                $quantity,
                $allowNegative,
                $applyCosting ? $unitCost : null
            );

            $this->branchStock->refreshVariantTotals($variant);

            $movement = InventoryMovement::create([
                'product_variant_id' => $variant->id,
                'branch_id' => $branchId,
                'movement_type' => $type,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'previous_stock' => $result['previous'],
                'new_stock' => $result['next'],
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'user_id' => $userId,
                'reason' => $reason,
            ]);

            // refreshVariantTotals has already written the new cached
            // totals onto this same instance.
            $variant->syncOriginal();

            return $movement;
        });
    }

    public static function weightedAverageCost(float $oldQty, float $oldCost, float $newQty, float $newCost): float
    {
        return BranchStockService::weightedAverageCost($oldQty, $oldCost, $newQty, $newCost);
    }

    /**
     * Stock a specific branch can sell right now.
     */
    public function availableIn(ProductVariant $variant, ?int $branchId = null): float
    {
        $branchId ??= BranchContext::id();

        if ($branchId === null) {
            return (float) $variant->stock;
        }

        return $this->branchStock->stockFor((int) $variant->id, $branchId);
    }

    /**
     * The cost a branch carries for a variant, which can differ from the
     * chain-wide average after transfers or a local price deal.
     */
    public function branchCost(ProductVariant $variant, ?int $branchId = null): ?float
    {
        $branchId ??= BranchContext::id();

        if ($branchId === null) {
            return null;
        }

        $cost = $this->branchStock->find((int) $variant->id, $branchId)?->cost;

        return $cost === null ? null : (float) $cost;
    }

    /**
     * Consume expiry batches (FIFO) for the branch doing the sale.
     */
    public function consumeBatches(ProductVariant $variant, float $quantity, ?int $branchId = null): void
    {
        $branchId ??= BranchContext::id();

        $remaining = $quantity;

        $batches = StockBatch::where('product_variant_id', $variant->id)
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->where('remaining_quantity', '>', 0)
            ->orderBy('expires_at')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }

            $take = min($remaining, (float) $batch->remaining_quantity);
            $batch->remaining_quantity = round($batch->remaining_quantity - $take, 2);
            $batch->save();
            $remaining -= $take;
        }
    }

    public function restoreBatch(ProductVariant $variant, float $quantity, ?int $branchId = null): void
    {
        $branchId ??= BranchContext::id();

        $batch = StockBatch::where('product_variant_id', $variant->id)
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->whereColumn('remaining_quantity', '<', 'quantity')
            ->orderBy('expires_at')
            ->first();

        if ($batch) {
            $batch->remaining_quantity = round(min((float) $batch->quantity, $batch->remaining_quantity + $quantity), 2);
            $batch->save();

            return;
        }

        StockBatch::create([
            'product_variant_id' => $variant->id,
            'branch_id' => $branchId,
            'batch_number' => 'RET-'.now()->format('YmdHis'),
            'quantity' => $quantity,
            'remaining_quantity' => $quantity,
            'unit_cost' => (float) $variant->cost,
            'received_at' => now()->toDateString(),
        ]);
    }

    /**
     * Rebuild a variant's cached chain total from its movements.
     */
    public function recalculateStock(ProductVariant $variant): void
    {
        $this->branchStock->refreshVariantTotals($variant);
    }
}