<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockBatch extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'product_variant_id', 'branch_id', 'supplier_id', 'purchase_item_id', 'batch_number',
        'quantity', 'remaining_quantity', 'unit_cost', 'manufactured_at',
        'expires_at', 'received_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float', 'remaining_quantity' => 'float', 'unit_cost' => 'float',
            'manufactured_at' => 'date', 'expires_at' => 'date', 'received_at' => 'date',
        ];
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
