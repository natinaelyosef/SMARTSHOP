<?php

namespace App\Services;

use App\Models\ApprovalRequest;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\SalesReturn;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SalesService
{
    public function __construct(
        private InventoryService $inventory,
        private ApprovalService $approvals,
        private ShiftService $shifts,
    ) {}

    public function create(array $data, User $user): Sale
    {
        return DB::transaction(function () use ($data, $user) {
            $items = collect($data['items']);
            if ($items->isEmpty()) {
                throw new \DomainException('sale_no_items');
            }

            $branchId = BranchContext::idFor($user, $data['branch_id'] ?? null)
                ?? $user->branch_id;

            if ($branchId === null) {
                throw new \DomainException('no_branch');
            }

            $customer = null;
            if (! empty($data['customer_id'])) {
                $customer = Customer::lockForUpdate()->find($data['customer_id']);
            }

            $taxRule = null;
            $subtotal = 0.0;
            $cogs = 0.0;

            $resolved = $items->map(function ($item) use (&$subtotal, &$cogs, $branchId) {
                $variant = ProductVariant::with('product')->findOrFail($item['product_variant_id']);
                $quantity = (float) $item['quantity'];

                if ($quantity <= 0) {
                    throw new \DomainException('invalid_quantity');
                }

                // Availability is per branch: selling at Bole must not
                // consume the shelf at Addis.
                $available = $this->inventory->availableIn($variant, $branchId);

                if ($available < $quantity && ! ShopSettings::allowNegativeStock()) {
                    throw new \DomainException('insufficient_stock');
                }

                $unitPrice = isset($item['unit_price']) && $item['unit_price'] !== null
                    ? (float) $item['unit_price']
                    : (float) $variant->selling_price;

                $unitCost = (float) ($this->inventory->branchCost($variant, $branchId) ?? $variant->cost);
                $lineTotal = round($unitPrice * $quantity, 4);
                $lineCogs = round($unitCost * $quantity, 4);

                $subtotal += $lineTotal;
                $cogs += $lineCogs;

                return [
                    'variant' => $variant,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'unit_cost' => $unitCost,
                    'total_price' => $lineTotal,
                    'cost_of_goods' => $lineCogs,
                    'profit' => round($lineTotal - $lineCogs, 4),
                ];
            });

            $discount = (float) ($data['discount'] ?? 0);
            $taxRate = (float) ($data['tax_rate'] ?? 0);
            $taxable = max(0, $subtotal - $discount);
            $taxAmount = round($taxable * $taxRate / 100, 4);
            $total = round($taxable + $taxAmount, 4);

            $method = $data['payment_method'] ?? ShopSettings::shop()->default_payment_method;
            $paidAmount = $method === 'credit'
                ? min((float) ($data['paid_amount'] ?? 0), $total)
                : $total;

            $remaining = round($total - $paidAmount, 4);

            $sale = Sale::create([
                'sale_number' => Sale::nextNumber(),
                'branch_id' => $branchId,
                'customer_id' => $customer?->id,
                'user_id' => $user->id,
                'sold_at' => $data['sold_at'] ?? now(),
                'subtotal' => round($subtotal, 4),
                'discount' => $discount,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'cost_of_goods' => round($cogs, 4),
                'profit' => round($subtotal - $discount - $cogs, 4),
                'paid_amount' => $paidAmount,
                'remaining_amount' => $remaining,
                'payment_method' => $method,
                'payment_status' => $this->paymentStatus($paidAmount, $total),
                'status' => 'completed',
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($resolved as $row) {
                $variant = $row['variant'];

                $sale->items()->create([
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'quantity' => $row['quantity'],
                    'unit_price' => $row['unit_price'],
                    'unit_cost' => $row['unit_cost'],
                    'total_price' => $row['total_price'],
                    'cost_of_goods' => $row['cost_of_goods'],
                    'profit' => $row['profit'],
                ]);

                $this->inventory->recordMovement(
                    $variant,
                    InventoryMovement::TYPES['sale'],
                    -$row['quantity'],
                    $row['unit_cost'],
                    Sale::class,
                    $sale->id,
                    null,
                    $user->id,
                    false,
                    $branchId,
                );

                if ($variant->track_expiry) {
                    $this->inventory->consumeBatches($variant, $row['quantity'], $branchId);
                }
            }

            if ($paidAmount > 0) {
                $sale->payments()->create([
                    'amount' => $paidAmount,
                    'payment_method' => $method === 'credit' ? ($data['tendered_method'] ?? 'cash') : $method,
                    'paid_at' => $sale->sold_at,
                    'user_id' => $user->id,
                    'reference' => $data['reference'] ?? null,
                ]);
            }

            if ($customer && $remaining > 0) {
                $customer->balance = round($customer->balance + $remaining, 4);
                $customer->save();
            }

            // Attach to the cashier's open drawer session.
            $this->shifts->attachSale($sale);

            $this->flagForApproval($sale, $discount, $subtotal, $user);

            AuditLogger::log(
                'sale.created',
                Sale::class,
                $sale->id,
                "Sale {$sale->sale_number} ({$total})",
                null,
                ['total' => $total, 'profit' => $sale->profit, 'method' => $method],
            );

            return $sale->load(['items.variant.product', 'customer', 'user', 'payments']);
        });
    }

    public function recordCustomerPayment(Sale $sale, array $data, User $user): SalePayment
    {
        return DB::transaction(function () use ($sale, $data, $user) {
            $amount = (float) $data['amount'];

            if ($amount <= 0 || $amount > $sale->remaining_amount + 0.0001) {
                throw new \DomainException('invalid_payment_amount');
            }

            $payment = $sale->payments()->create([
                'amount' => $amount,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'paid_at' => $data['paid_at'] ?? now(),
                'user_id' => $user->id,
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $refunded = (float) $sale->returns()->sum('refund_amount');

            $sale->paid_amount = round($sale->paid_amount + $amount, 4);
            $sale->remaining_amount = round(max(0, $sale->total - $sale->paid_amount - $refunded), 4);
            $sale->payment_status = $this->paymentStatus($sale->paid_amount, $sale->total);
            $sale->save();

            if ($sale->customer_id) {
                $customer = Customer::lockForUpdate()->find($sale->customer_id);
                if ($customer) {
                    $customer->balance = round(max(0, $customer->balance - $amount), 4);
                    $customer->save();
                }
            }

            AuditLogger::log(
                'sale.payment',
                Sale::class,
                $sale->id,
                "Customer payment {$amount} on {$sale->sale_number}",
                ['paid' => $sale->paid_amount - $amount],
                ['paid' => $sale->paid_amount],
            );

            return $payment;
        });
    }

    public function returnItems(Sale $sale, array $data, User $user): SalesReturn
    {
        return DB::transaction(function () use ($sale, $data, $user) {
            $items = collect($data['items']);
            if ($items->isEmpty()) {
                throw new \DomainException('return_no_items');
            }

            $return = SalesReturn::create([
                'return_number' => SalesReturn::nextNumber(),
                'sale_id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'user_id' => $user->id,
                'refund_amount' => 0,
                'cost_restored' => 0,
                'reason' => $data['reason'] ?? null,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'status' => 'completed',
                'returned_at' => now(),
            ]);

            $refundTotal = 0.0;
            $costTotal = 0.0;

            foreach ($items as $item) {
                $saleItem = $sale->items()->lockForUpdate()->findOrFail($item['sale_item_id']);
                $quantity = (float) $item['quantity'];

                $alreadyReturned = (float) $saleItem->returned_quantity;
                if ($quantity <= 0 || $alreadyReturned + $quantity > $saleItem->quantity + 0.0001) {
                    throw new \DomainException('invalid_return_quantity');
                }

                $refund = round($quantity * $saleItem->unit_price, 4);
                $cost = round($quantity * $saleItem->unit_cost, 4);

                $return->items()->create([
                    'sale_item_id' => $saleItem->id,
                    'product_variant_id' => $saleItem->product_variant_id,
                    'quantity' => $quantity,
                    'unit_price' => $saleItem->unit_price,
                    'unit_cost' => $saleItem->unit_cost,
                    'refund_amount' => $refund,
                ]);

                $saleItem->returned_quantity = round($alreadyReturned + $quantity, 2);
                $saleItem->save();

                $variant = ProductVariant::findOrFail($saleItem->product_variant_id);
                $this->inventory->recordMovement(
                    $variant,
                    InventoryMovement::TYPES['sale_return'],
                    $quantity,
                    $saleItem->unit_cost,
                    SalesReturn::class,
                    $return->id,
                    $data['reason'] ?? null,
                    $user->id,
                    false,
                    (int) $sale->branch_id,
                );

                if ($variant->track_expiry) {
                    $this->inventory->restoreBatch($variant, $quantity, (int) $sale->branch_id);
                }

                $refundTotal += $refund;
                $costTotal += $cost;
            }

            $return->refund_amount = round($refundTotal, 4);
            $return->cost_restored = round($costTotal, 4);
            $return->save();

            if ($refundTotal > 0) {
                $sale->remaining_amount = round(max(0, $sale->total - $sale->paid_amount - $refundTotal), 4);
                $sale->save();
            }

            if ($sale->customer_id && $refundTotal > 0) {
                $customer = Customer::lockForUpdate()->find($sale->customer_id);
                if ($customer) {
                    $customer->balance = round(max(0, $customer->balance - $refundTotal), 4);
                    $customer->save();
                }
            }

            AuditLogger::log(
                'sale.returned',
                SalesReturn::class,
                $return->id,
                "Return {$return->return_number} of sale {$sale->sale_number}",
                null,
                ['refund' => $return->refund_amount, 'cost_restored' => $return->cost_restored],
                $data['reason'] ?? null,
            );

            return $return->load(['items.variant.product', 'sale']);
        });
    }

    /**
     * Large discounts and big totals are still recorded — the counter
     * keeps trading — but a manager is asked to sign them off
     * afterwards.
 */
protected function flagForApproval(Sale $sale, float $discount, float $subtotal, User $user): void
    {
        $discountPercent = $subtotal > 0 ? round($discount / $subtotal * 100, 2) : 0.0;

        if ($this->approvals->requiresApproval(ApprovalRequest::TYPE_DISCOUNT, $discount, $discountPercent)) {
            $this->approvals->request(
                $user,
                ApprovalRequest::TYPE_DISCOUNT,
                ['sale_id' => $sale->id, 'sale_number' => $sale->sale_number, 'discount' => $discount, 'percent' => $discountPercent],
                'Discount of '.$discountPercent.'% at the register',
                (int) $sale->branch_id
            );
        }

        if ($this->approvals->requiresApproval(ApprovalRequest::TYPE_SALE, (float) $sale->total)) {
            $this->approvals->request(
                $user,
                ApprovalRequest::TYPE_SALE,
                ['sale_id' => $sale->id, 'sale_number' => $sale->sale_number, 'total' => $sale->total],
                'Large sale total '.$sale->total,
                (int) $sale->branch_id
            );
        }
    }

    private function paymentStatus(float $paid, float $total): string
    {
        if ($paid <= 0) {
            return 'unpaid';
        }

        return $paid + 0.0001 >= $total ? 'paid' : 'partial';
    }
}
