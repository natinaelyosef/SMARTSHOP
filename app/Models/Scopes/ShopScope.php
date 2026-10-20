<?php

namespace App\Models\Scopes;

use App\Services\ActiveShop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Confines every query to the active shop.
 *
 * Fails closed: if no shop can be resolved the query matches nothing,
 * so a missing tenant context can never leak another business's data.
 */
class ShopScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $shopId = ActiveShop::id();

        if ($shopId === null) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $builder->where($model->getTable().'.shop_id', $shopId);
    }
}