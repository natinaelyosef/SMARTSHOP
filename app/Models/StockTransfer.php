<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use App\Services\ActiveShop as ActiveShopId;
use App\Services\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockTransfer extends Model
{
    use BelongsToShop;

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'shop_id', 'transfer_number', 'from_branch_id', 'to_branch_id', 'user_id',
        'approval_request_id', 'status', 'notes', 'transferred_at',
    ];

    protected function casts(): array
    {
        return ['transferred_at' => 'datetime'];
    }

    public function fromBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItem::class);
    }

    public static function nextNumber(?int $shopId = null): string
    {
        return Sequence::next('stock_transfer', $shopId ?? ActiveShopId::idOrFail(), 'TRF-');
    }
}