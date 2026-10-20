<?php

namespace App\Models\Concerns;

use App\Models\Scopes\ShopScope;
use App\Models\Shop;
use App\Services\ActiveShop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Marks a model as business-owned: it gains a shop_id, is filtered to the
 * active shop on every query, and is stamped automatically on create.
 *
 * Global catalogue data (permissions, units) deliberately does not use
 * this trait — those rows are shared by every tenant.
 */
trait BelongsToShop
{
    public static function bootBelongsToShop(): void
    {
        static::addGlobalScope(ShopScope::class);

        static::creating(function (Model $model): void {
            if (blank($model->getAttribute('shop_id'))) {
                $model->setAttribute('shop_id', ActiveShop::id());
            }
        });
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Read across tenant boundaries — platform administration and
     * scheduled reporting only.
     */
    public static function acrossShops(): Builder
    {
        return static::withoutGlobalScope(ShopScope::class);
    }

    public static function forShop(int|Shop $shop): Builder
    {
        $shopId = $shop instanceof Shop ? $shop->id : $shop;

        return static::withoutGlobalScope(ShopScope::class)->where('shop_id', $shopId);
    }

    public function belongsToActiveShop(): bool
    {
        return (int) $this->shop_id === ActiveShop::id();
    }

    /**
     * Restrict to a single branch. Owners and managers who can see every
     * branch of the business pass no branch and stay unscoped.
     */
    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId === null ? $query : $query->where('branch_id', $branchId);
    }
}