<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use App\Services\ActiveShop as ActiveShopId;
use App\Services\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesReturn extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'return_number', 'sale_id', 'customer_id', 'user_id', 'refund_amount',
        'cost_restored', 'reason', 'payment_method', 'status', 'returned_at',
    ];

    protected function casts(): array
    {
        return [
            'refund_amount' => 'float', 'cost_restored' => 'float',
            'returned_at' => 'datetime',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesReturnItem::class);
    }

    public static function nextNumber(?int $shopId = null): string
    {
        return Sequence::next('sale_return', $shopId ?? ActiveShopId::idOrFail(), 'RET-');
    }
}
