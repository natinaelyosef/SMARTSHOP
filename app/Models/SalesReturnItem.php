<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesReturnItem extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'sales_return_id', 'sale_item_id', 'product_variant_id', 'quantity',
        'unit_price', 'unit_cost', 'refund_amount',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float', 'unit_price' => 'float',
            'unit_cost' => 'float', 'refund_amount' => 'float',
        ];
    }

    public function salesReturn(): BelongsTo
    {
        return $this->belongsTo(SalesReturn::class);
    }

    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
