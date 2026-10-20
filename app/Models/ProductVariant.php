<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use App\Services\BranchContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use BelongsToShop, SoftDeletes;

    protected $fillable = [
        'shop_id', 'product_id', 'unit_id', 'name', 'sku', 'barcode', 'attributes',
        'cost', 'selling_price', 'min_stock', 'stock', 'track_expiry', 'status',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'float',
            'selling_price' => 'float',
            'min_stock' => 'float',
            'stock' => 'float',
            'track_expiry' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(ProductAttribute::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function priceHistories(): HasMany
    {
        return $this->hasMany(PriceHistory::class)->orderByDesc('effective_at');
    }

    public function stockBatches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function isLowStock(float $threshold): bool
    {
        return $this->stock <= $this->min_stock || $this->stock <= $threshold;
    }

    public function isOutOfStock(): bool
    {
        return $this->stock <= 0;
    }

    public function isLosingMoney(): bool
    {
        return $this->selling_price > 0 && $this->cost > 0 && $this->selling_price < $this->cost;
    }

    public function fullName(): string
    {
        return trim(($this->product?->name ?? '').' '.$this->name);
    }
}
