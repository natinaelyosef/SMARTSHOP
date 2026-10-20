<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'sale_id', 'product_id', 'product_variant_id', 'quantity', 'unit_price',
        'unit_cost', 'total_price', 'cost_of_goods', 'profit', 'returned_quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float', 'unit_price' => 'float', 'unit_cost' => 'float',
            'total_price' => 'float', 'cost_of_goods' => 'float', 'profit' => 'float',
            'returned_quantity' => 'float',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
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
