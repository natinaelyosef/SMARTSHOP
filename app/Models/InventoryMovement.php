<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'product_variant_id', 'branch_id', 'movement_type', 'quantity', 'unit_cost',
        'previous_stock', 'new_stock', 'reference_type', 'reference_id',
        'user_id', 'reason',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float', 'unit_cost' => 'float',
            'previous_stock' => 'float', 'new_stock' => 'float',
        ];
    }

    public const TYPES = [
        'purchase' => 'purchase',
        'sale' => 'sale',
        'sale_return' => 'sale_return',
        'purchase_return' => 'purchase_return',
        'damaged' => 'damaged',
        'expired' => 'expired',
        'adjustment' => 'adjustment',
        'transfer' => 'transfer',
        'initial_stock' => 'initial_stock',
    ];

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
