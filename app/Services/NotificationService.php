<?php

namespace App\Services;

use App\Models\ApprovalRequest;
use App\Models\BranchStock;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\ProductVariant;
use App\Models\RentPayment;
use App\Models\Role;
use App\Models\StockBatch;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Carbon;

class NotificationService
{
    /** Build fresh alerts and persist ones not yet notified. */
    public function refresh(): array
    {
        $alerts = array_merge(
            $this->stockAlerts(),
            $this->expiryAlerts(),
            $this->rentAlerts(),
            $this->creditAlerts(),
        );

        foreach ($alerts as $alert) {
            $exists = Notification::where('type', $alert['type'])
                ->where('data->key', $alert['key'])
                ->whereNull('read_at')
                ->where('created_at', '>=', now()->subDay())
                ->exists();

            if (! $exists) {
                Notification::create([
                    'user_id' => null,
                    'type' => $alert['type'],
                    'level' => $alert['level'],
                    'title' => $alert['title'],
                    'message' => $alert['message'],
                    'data' => ['key' => $alert['key'], 'link' => $alert['link'] ?? null],
                ]);
            }
        }

        return $alerts;
    }

    public function stockAlerts(): array
    {
        $threshold = ShopSettings::lowStockThreshold();
        $branchId = BranchContext::id();
        $alerts = [];

        $branchLabel = $branchId
            ? ' · '.optional(BranchContext::branch())->name
            : '';

        $outOfStock = $this->branchStockQuery($branchId)
            ->where('stock', '<=', 0)
            ->limit(50)
            ->get();

        foreach ($outOfStock as $row) {
            $alerts[] = [
                'type' => 'stock.out',
                'level' => 'danger',
                'key' => 'branch-stock-'.$branchId.'-'.$row->product_variant_id,
                'title' => 'Out of stock',
                'message' => optional($row->variant)->fullName().' is out of stock'.$branchLabel.'.',
                'link' => '/inventory',
            ];
        }

        $low = $this->branchStockQuery($branchId)
            ->where('stock', '>', 0)
            ->where(function ($q) use ($threshold) {
                $q->whereColumn('stock', '<=', 'min_stock')
                    ->orWhere('stock', '<=', $threshold);
            })
            ->limit(50)
            ->get()
            ->reject(fn ($row) => $outOfStock->contains('product_variant_id', $row->product_variant_id));

        foreach ($low as $row) {
            $alerts[] = [
                'type' => 'stock.low',
                'level' => 'warning',
                'key' => 'branch-stock-'.$branchId.'-'.$row->product_variant_id,
                'title' => 'Low stock',
                'message' => optional($row->variant)->fullName().' has only '.$row->stock.' left'.$branchLabel.'.',
                'link' => '/inventory',
            ];
        }

        return $alerts;
    }

    /**
     * Low/out-of-stock checks run against the branch being worked on, so
     * a manager at one branch is not warned about another branch's shelf.
     */
    protected function branchStockQuery(?int $branchId)
    {
        $query = BranchStock::with(['variant.product:id,name,sku', 'branch:id,name']);

        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        return $query;
    }

    public function expiryAlerts(): array
    {
        $alerts = [];
        $soon = Carbon::today()->addDays(30);

        $expiring = StockBatch::with('variant.product')
            ->where('remaining_quantity', '>', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $soon)
            ->orderBy('expires_at')
            ->limit(50)
            ->get();

        foreach ($expiring as $batch) {
            $expired = $batch->expires_at->isPast();
            $alerts[] = [
                'type' => $expired ? 'stock.expired' : 'stock.expiring',
                'level' => $expired ? 'danger' : 'warning',
                'key' => 'batch-'.$batch->id,
                'title' => $expired ? 'Product expired' : 'Product expiring soon',
                'message' => ($batch->variant?->fullName() ?? 'Batch '.$batch->batch_number)
                    .($expired ? ' expired on ' : ' expires on ').$batch->expires_at->toFormattedDateString(),
                'link' => '/inventory',
            ];
        }

        return $alerts;
    }

    public function rentAlerts(): array
    {
        $alerts = [];

        $due = RentPayment::with('rent')
            ->whereIn('status', ['unpaid', 'partial'])
            ->where('due_date', '<=', Carbon::today()->addDays(7))
            ->orderBy('due_date')
            ->limit(20)
            ->get();

        foreach ($due as $payment) {
            $overdue = $payment->due_date->isPast();
            $alerts[] = [
                'type' => $overdue ? 'rent.overdue' : 'rent.due',
                'level' => $overdue ? 'danger' : 'warning',
                'key' => 'rent-'.$payment->id,
                'title' => $overdue ? 'Rent overdue' : 'Rent due soon',
                'message' => $payment->rent?->shop_name.' rent of '.$payment->remaining().' due '
                    .$payment->due_date->toFormattedDateString(),
                'link' => '/rent',
            ];
        }

        return $alerts;
    }

    public function creditAlerts(): array
    {
        $alerts = [];

        Customer::where('balance', '>', 0)->orderByDesc('balance')->limit(10)->get()
            ->each(fn ($c) => $alerts[] = [
                'type' => 'customer.credit',
                'level' => 'info',
                'key' => 'customer-'.$c->id,
                'title' => 'Customer credit outstanding',
                'message' => $c->name.' owes '.$c->balance,
                'link' => '/customers/'.$c->id,
            ]);

        Supplier::where('balance', '>', 0)->orderByDesc('balance')->limit(10)->get()
            ->each(fn ($s) => $alerts[] = [
                'type' => 'supplier.debt',
                'level' => 'info',
                'key' => 'supplier-'.$s->id,
                'title' => 'Supplier payment due',
                'message' => 'You owe '.$s->name.' '.$s->balance,
                'link' => '/suppliers/'.$s->id,
            ]);

        return $alerts;
    }

    public function counts(): array
    {
        $alerts = array_merge($this->stockAlerts(), $this->expiryAlerts(), $this->rentAlerts());

        return [
            'danger' => count(array_filter($alerts, fn ($a) => $a['level'] === 'danger')),
            'warning' => count(array_filter($alerts, fn ($a) => $a['level'] === 'warning')),
            'info' => count(array_filter($alerts, fn ($a) => $a['level'] === 'info')),
            'total' => count($alerts),
        ];
    }

    /**
     * Tell whoever can sign off that a request is waiting for them.
     */
    public function notifyApprovers(ApprovalRequest $request): void
    {
        $approverIds = Role::whereIn('slug', RbacTemplates::approverRoles())
            ->pluck('id')
            ->all();

        $recipients = User::whereIn('role_id', $approverIds)
            ->where('status', 'active')
            ->whereKeyNot($request->requested_by)
            ->get();

        foreach ($recipients as $user) {
            Notification::create([
                'user_id' => $user->id,
                'type' => 'approval.pending',
                'level' => 'warning',
                'title' => 'Approval needed',
                'message' => ($request->requester?->name ?? 'Someone')
                    .' requested a '.$request->type.' that needs your sign-off.',
                'data' => ['key' => 'approval-'.$request->id, 'link' => '/approvals'],
            ]);
        }
    }

    /**
     * Tell the requester how their request was decided.
     */
    public function notifyApprovalDecision(ApprovalRequest $request): void
    {
        Notification::create([
            'user_id' => $request->requested_by,
            'type' => 'approval.'.$request->status,
            'level' => $request->status === ApprovalRequest::STATUS_APPROVED ? 'info' : 'warning',
            'title' => 'Request '.($request->status === ApprovalRequest::STATUS_APPROVED ? 'approved' : 'rejected'),
            'message' => 'Your '.$request->type.' request was '.$request->status
                .($request->review_note ? ': '.$request->review_note : '.'),
            'data' => ['key' => 'approval-'.$request->id, 'link' => '/approvals'],
        ]);
    }
}
