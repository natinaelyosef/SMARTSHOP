<?php

namespace App\Services;

use App\Models\ApprovalRequest;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Four-eyes control over sensitive operations.
 *
 * Price changes and stock adjustments are *held* until a manager
 * approves them. Large discounts and big sales are recorded normally but
 * flagged for sign-off, so the counter never stalls waiting for a yes.
 */
class ApprovalService
{
    /**
     * Does this operation need a second pair of eyes?
     */
    public function requiresApproval(string $type, float $amount, ?float $percent = null): bool
    {
        return match ($type) {
            ApprovalRequest::TYPE_DISCOUNT => (function () use ($percent) {
                $threshold = ShopSettings::discountApprovalThreshold();

                return $threshold > 0 && (float) $percent >= $threshold;
            })(),
            ApprovalRequest::TYPE_SALE => (function () use ($amount) {
                $threshold = ShopSettings::saleApprovalThreshold();

                return $threshold > 0 && $amount >= $threshold;
            })(),
            default => false,
        };
    }

    /**
     * Actions a manager can queue for approval.
     */
    public function canRequest(User $user): bool
    {
        return $user->hasPermission('price.manage')
            || $user->hasPermission('inventory.manage')
            || $user->is_owner
            || $user->is_platform_admin;
    }

    public function request(
        User $user,
        string $type,
        array $payload,
        ?string $reason = null,
        ?int $branchId = null,
    ): ApprovalRequest {
        $request = DB::transaction(function () use ($user, $type, $payload, $reason, $branchId) {
            return ApprovalRequest::create([
                'requested_by' => $user->id,
                'branch_id' => $branchId ?? BranchContext::id(),
                'type' => $type,
                'payload' => $payload,
                'reason' => $reason,
                'status' => ApprovalRequest::STATUS_PENDING,
            ]);
        });

        AuditLogger::log(
            'approval.requested',
            ApprovalRequest::class,
            $request->id,
            "Approval requested: {$type}",
            null,
            $payload,
            $reason
        );

        app(NotificationService::class)->notifyApprovers($request);

        return $request;
    }

    /**
     * Approve or reject. Approving a held action applies it.
     */
    public function review(ApprovalRequest $request, User $reviewer, bool $approve, ?string $note = null): ApprovalRequest
    {
        if (! $request->isPending()) {
            throw new \DomainException('approval_already_reviewed');
        }

        if ($request->requested_by === $reviewer->id && ! $reviewer->is_owner && ! $reviewer->is_platform_admin) {
            throw new \DomainException('approval_self_review');
        }

        return DB::transaction(function () use ($request, $reviewer, $approve, $note) {
            $request->status = $approve
                ? ApprovalRequest::STATUS_APPROVED
                : ApprovalRequest::STATUS_REJECTED;
            $request->reviewed_by = $reviewer->id;
            $request->reviewed_at = now();
            $request->review_note = $note;
            $request->save();

            if ($approve) {
                $this->apply($request);
            }

            AuditLogger::log(
                $approve ? 'approval.approved' : 'approval.rejected',
                ApprovalRequest::class,
                $request->id,
                ($approve ? 'Approved' : 'Rejected')." {$request->type}",
                ['status' => ApprovalRequest::STATUS_PENDING],
                ['status' => $request->status],
                $note
            );

            return $request;
        });
    }

    /**
     * Carry out a held action once it clears review.
     */
    protected function apply(ApprovalRequest $request): void
    {
        $payload = $request->payload ?? [];

        if ($request->type === ApprovalRequest::TYPE_PRICE_CHANGE && ! empty($payload['product_variant_id'])) {
            $variant = ProductVariant::find($payload['product_variant_id']);

            if (! $variant) {
                return;
            }

            $old = (float) $variant->selling_price;
            $new = (float) ($payload['new_price'] ?? $old);

            if ($new <= 0 || $new === $old) {
                return;
            }

            $variant->selling_price = $new;
            $variant->save();

            $variant->priceHistories()->create([
                'branch_id' => $request->branch_id,
                'old_price' => $old,
                'new_price' => $new,
                'cost_at_time' => (float) $variant->cost,
                'user_id' => $request->reviewed_by,
                'reason' => $request->reason,
                'effective_at' => now(),
            ]);
        }

        if ($request->type === ApprovalRequest::TYPE_STOCK_ADJUSTMENT && ! empty($payload['product_variant_id'])) {
            $variant = ProductVariant::find($payload['product_variant_id']);

            if (! $variant) {
                return;
            }

            app(InventoryService::class)->recordMovement(
                $variant,
                \App\Models\InventoryMovement::TYPES['adjustment'],
                (float) ($payload['quantity'] ?? 0),
                (float) ($payload['unit_cost'] ?? $variant->cost),
                ApprovalRequest::class,
                $request->id,
                $request->reason,
                $request->reviewed_by,
                false,
                $request->branch_id,
            );
        }
    }

    public function pending(?int $branchId = null)
    {
        return ApprovalRequest::with(['requester:id,name', 'reviewer:id,name', 'branch:id,name'])
            ->where('status', ApprovalRequest::STATUS_PENDING)
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->latest()
            ->get();
    }

    public function pendingCount(?int $branchId = null): int
    {
        return ApprovalRequest::where('status', ApprovalRequest::STATUS_PENDING)
            ->when($branchId !== null, fn ($q) => $q->where('branch_id', $branchId))
            ->count();
    }
}