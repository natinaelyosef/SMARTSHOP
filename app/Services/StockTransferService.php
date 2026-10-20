<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StockTransferService
{
    public function __construct(
        private BranchStockService $branchStock,
        private InventoryService $inventory,
    ) {}

    /**
     * Move stock from one branch to another.
     *
     * @param  array  $data  from_branch_id, to_branch_id, items[{product_variant_id, quantity}]
     */
    public function create(User $user, array $data): StockTransfer
    {
        $from = (int) $data['from_branch_id'];
        $to = (int) $data['to_branch_id'];

        if ($from === $to) {
            throw new \DomainException('transfer_same_branch');
        }

        foreach ([$from, $to] as $branchId) {
            if (! Branch::whereKey($branchId)->where('is_active', true)->exists()) {
                throw new \DomainException('branch_not_found');
            }

            if (! $user->canManageBranch($branchId)) {
                throw new \DomainException('branch_forbidden');
            }
        }

        $items = collect($data['items'] ?? [])->filter(fn ($i) => (float) $i['quantity'] > 0)->values();

        if ($items->isEmpty()) {
            throw new \DomainException('transfer_no_items');
        }

        return DB::transaction(function () use ($user, $data, $items, $from, $to) {
            $transfer = StockTransfer::create([
                'transfer_number' => StockTransfer::nextNumber(),
                'from_branch_id' => $from,
                'to_branch_id' => $to,
                'user_id' => $user->id,
                'status' => StockTransfer::STATUS_COMPLETED,
                'notes' => $data['notes'] ?? null,
                'transferred_at' => now(),
            ]);

            foreach ($items as $item) {
                $variant = ProductVariant::findOrFail($item['product_variant_id']);
                $quantity = (float) $item['quantity'];

                // Verify availability before touching anything.
                $available = $this->branchStock->stockFor((int) $variant->id, $from);

                if ($available < $quantity && ! ShopSettings::allowNegativeStock()) {
                    throw new \DomainException('insufficient_stock');
                }

                $cost = (float) ($this->branchStock->find((int) $variant->id, $from)?->cost ?? $variant->cost);

                $transfer->items()->create([
                    'product_variant_id' => $variant->id,
                    'quantity' => $quantity,
                    'unit_cost' => $cost,
                ]);

                $this->inventory->recordMovement(
                    $variant,
                    InventoryMovement::TYPES['transfer'],
                    -$quantity,
                    $cost,
                    StockTransfer::class,
                    $transfer->id,
                    "Transfer {$transfer->transfer_number} out",
                    $user->id,
                    false,
                    $from
                );

                $this->inventory->recordMovement(
                    $variant,
                    InventoryMovement::TYPES['transfer'],
                    $quantity,
                    $cost,
                    StockTransfer::class,
                    $transfer->id,
                    "Transfer {$transfer->transfer_number} in",
                    $user->id,
                    false,
                    $to
                );
            }

            AuditLogger::log(
                'stock.transferred',
                StockTransfer::class,
                $transfer->id,
                "Stock transfer {$transfer->transfer_number}",
                null,
                [
                    'from' => $from,
                    'to' => $to,
                    'items' => $transfer->items()->count(),
                ],
                $data['notes'] ?? null
            );

            return $transfer->load('items.variant.product');
        });
    }

    /**
     * Undo a completed transfer by moving the stock back.
     */
    public function reverse(User $user, StockTransfer $transfer): void
    {
        if ($transfer->status !== StockTransfer::STATUS_COMPLETED) {
            throw new \DomainException('transfer_not_reversible');
        }

        DB::transaction(function () use ($user, $transfer) {
            foreach ($transfer->items as $item) {
                $variant = ProductVariant::findOrFail($item->product_variant_id);
                $quantity = (float) $item->quantity;

                $this->inventory->recordMovement(
                    $variant,
                    InventoryMovement::TYPES['transfer'],
                    -$quantity,
                    (float) $item->unit_cost,
                    StockTransfer::class,
                    $transfer->id,
                    'Transfer reversed out',
                    $user->id,
                    false,
                    (int) $transfer->to_branch_id
                );

                $this->inventory->recordMovement(
                    $variant,
                    InventoryMovement::TYPES['transfer'],
                    $quantity,
                    (float) $item->unit_cost,
                    StockTransfer::class,
                    $transfer->id,
                    'Transfer reversed in',
                    $user->id,
                    false,
                    (int) $transfer->from_branch_id
                );
            }

            $transfer->status = StockTransfer::STATUS_CANCELLED;
            $transfer->save();
        });

        AuditLogger::log(
            'stock.transfer_reversed',
            StockTransfer::class,
            $transfer->id,
            "Transfer {$transfer->transfer_number} reversed",
            ['status' => StockTransfer::STATUS_COMPLETED],
            ['status' => StockTransfer::STATUS_CANCELLED]
        );
    }
}