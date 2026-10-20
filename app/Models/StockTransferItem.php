<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferItem extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'stock_transfer_id', 'product_variant_id', 'quantity', 'unit_cost'];

    protected function casts(): array
    {
        return ['quantity' => 'float', 'unit_cost' => 'float'];
    }

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class, 'stock_transfer_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}