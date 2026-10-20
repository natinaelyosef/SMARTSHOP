<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The authoritative quantity a single branch holds for one variant.
 *
 * `product_variants.stock` is kept as a chain-wide cached total for
 * reporting, but every sellable check reads this table.
 */
class BranchStock extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'branch_id', 'product_variant_id', 'stock', 'min_stock', 'cost'];

    protected function casts(): array
    {
        return [
            'stock' => 'float',
            'min_stock' => 'float',
            'cost' => 'float',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function isBelowThreshold(float $shopThreshold): bool
    {
        $threshold = $this->min_stock > 0 ? $this->min_stock : $shopThreshold;

        return $this->stock <= $threshold;
    }
}