<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'purchase_id', 'product_id', 'product_variant_id', 'quantity',
        'unit_cost', 'total_cost', 'branch_id', 'batch_number', 'manufactured_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float', 'unit_cost' => 'float', 'total_cost' => 'float',
            'manufactured_at' => 'date', 'expires_at' => 'date',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
