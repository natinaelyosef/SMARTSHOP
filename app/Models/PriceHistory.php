<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceHistory extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'branch_id', 'product_variant_id', 'old_price', 'new_price', 'cost_at_time',
        'user_id', 'reason', 'effective_at',
    ];

    protected function casts(): array
    {
        return [
            'old_price' => 'float', 'new_price' => 'float',
            'cost_at_time' => 'float', 'effective_at' => 'datetime',
        ];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
