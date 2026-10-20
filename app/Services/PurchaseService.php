<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\StockBatch;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PurchaseService
{
    public function __construct(private InventoryService $inventory) {}

    public function create(array $data, User $user): Purchase
    {
        return DB::transaction(function () use ($data, $user) {
            $branchId = BranchContext::idFor($user, $data['branch_id'] ?? null) ?? $user->branch_id;

            if ($branchId === null) {
                throw new \DomainException('no_branch');
            }

            $supplier = Supplier::lockForUpdate()->findOrFail($data['supplier_id']);

            $items = collect($data['items']);
            $subtotal = $items->sum(fn ($i) => round($i['quantity'] * $i['unit_cost'], 4));
            $discount = (float) ($data['discount'] ?? 0);
            $taxAmount = (float) ($data['tax_amount'] ?? 0);
            $total = round($subtotal - $discount + $taxAmount, 4);
            $paidAmount = min((float) ($data['paid_amount'] ?? 0), $total);
            $remaining = round($total - $paidAmount, 4);

            $purchase = Purchase::create([
                'purchase_number' => Purchase::nextNumber(),
                'branch_id' => $branchId,
                'supplier_id' => $supplier->id,
                'user_id' => $user->id,
                'purchased_at' => $data['purchased_at'] ?? now()->toDateString(),
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'remaining_amount' => $remaining,
                'payment_status' => $this->paymentStatus($paidAmount, $total),
                'status' => 'received',
                'invoice_number' => $data['invoice_number'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                $variant = ProductVariant::with('product')->findOrFail($item['product_variant_id']);
                $quantity = (float) $item['quantity'];
                $unitCost = (float) $item['unit_cost'];
                $lineTotal = round($quantity * $unitCost, 4);

                $purchaseItem = $purchase->items()->create([
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'branch_id' => $branchId,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'total_cost' => $lineTotal,
                    'batch_number' => $item['batch_number'] ?? null,
                    'manufactured_at' => $item['manufactured_at'] ?? null,
                    'expires_at' => $item['expires_at'] ?? null,
                ]);

                $this->inventory->recordMovement(
                    $variant,
                    InventoryMovement::TYPES['purchase'],
                    $quantity,
                    $unitCost,
                    Purchase::class,
                    $purchase->id,
                    null,
                    $user->id,
                    applyCosting: true,
                    branchId: $branchId,
                );

                if (! empty($item['expires_at']) || ! empty($item['batch_number'])) {
                    StockBatch::create([
                        'product_variant_id' => $variant->id,
                        'branch_id' => $branchId,
                        'supplier_id' => $supplier->id,
                        'purchase_item_id' => $purchaseItem->id,
                        'batch_number' => $item['batch_number'] ?? null,
                        'quantity' => $quantity,
                        'remaining_quantity' => $quantity,
                        'unit_cost' => $unitCost,
                        'manufactured_at' => $item['manufactured_at'] ?? null,
                        'expires_at' => $item['expires_at'] ?? null,
                        'received_at' => $purchase->purchased_at->toDateString(),
                    ]);
                }
            }

            if ($paidAmount > 0) {
                $purchase->payments()->create([
                    'amount' => $paidAmount,
                    'payment_method' => $data['payment_method'] ?? 'cash',
                    'paid_at' => now(),
                    'user_id' => $user->id,
                    'reference' => $data['payment_reference'] ?? null,
                    'notes' => $data['payment_notes'] ?? null,
                ]);
            }

            $supplier->balance = round($supplier->balance + $remaining, 4);
            $supplier->save();

            AuditLogger::log(
                'purchase.created',
                Purchase::class,
                $purchase->id,
                "Purchase {$purchase->purchase_number} from {$supplier->name} ({$total})",
                null,
                ['total' => $total, 'paid' => $paidAmount, 'remaining' => $remaining],
            );

            return $purchase->load(['items.variant.product', 'supplier', 'payments']);
        });
    }

    public function recordPayment(Purchase $purchase, array $data, User $user): PurchasePayment
    {
        return DB::transaction(function () use ($purchase, $data, $user) {
            $amount = (float) $data['amount'];

            if ($amount <= 0 || $amount > $purchase->remaining_amount + 0.0001) {
                throw new \DomainException('invalid_payment_amount');
            }

            $payment = $purchase->payments()->create([
                'amount' => $amount,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'paid_at' => $data['paid_at'] ?? now(),
                'user_id' => $user->id,
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $purchase->paid_amount = round($purchase->paid_amount + $amount, 4);
            $purchase->remaining_amount = round($purchase->total - $purchase->paid_amount, 4);
            $purchase->payment_status = $this->paymentStatus($purchase->paid_amount, $purchase->total);
            $purchase->save();

            $supplier = Supplier::lockForUpdate()->find($purchase->supplier_id);
            if ($supplier) {
                $supplier->balance = round(max(0, $supplier->balance - $amount), 4);
                $supplier->save();
            }

            AuditLogger::log(
                'purchase.payment',
                Purchase::class,
                $purchase->id,
                "Payment {$amount} on {$purchase->purchase_number}",
                ['paid' => $purchase->paid_amount - $amount],
                ['paid' => $purchase->paid_amount],
            );

            return $payment;
        });
    }

    private function paymentStatus(float $paid, float $total): string
    {
        if ($paid <= 0) {
            return 'unpaid';
        }

        return $paid + 0.0001 >= $total ? 'paid' : 'partial';
    }
}
