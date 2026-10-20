<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Four-eyes approval for operations that move meaningful money: large
 * discounts, big sales, price changes and stock adjustments.
 */
class ApprovalRequest extends Model
{
    use BelongsToShop;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const TYPE_DISCOUNT = 'discount';

    public const TYPE_SALE = 'sale';

    public const TYPE_PRICE_CHANGE = 'price_change';

    public const TYPE_STOCK_ADJUSTMENT = 'stock_adjustment';

    public const TYPE_PURCHASE = 'purchase';

    protected $fillable = [
        'shop_id', 'branch_id', 'requested_by', 'reviewed_by', 'type', 'payload',
        'reason', 'status', 'review_note', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}