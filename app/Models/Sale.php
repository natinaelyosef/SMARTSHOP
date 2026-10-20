<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use App\Services\ActiveShop as ActiveShopId;
use App\Services\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'sale_number', 'branch_id', 'customer_id', 'user_id', 'sold_at', 'shift_id',
        'subtotal', 'discount', 'tax_amount', 'total', 'cost_of_goods',
        'profit', 'paid_amount', 'remaining_amount', 'payment_method',
        'payment_status', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'sold_at' => 'datetime',
            'subtotal' => 'float', 'discount' => 'float', 'tax_amount' => 'float',
            'total' => 'float', 'cost_of_goods' => 'float', 'profit' => 'float',
            'paid_amount' => 'float', 'remaining_amount' => 'float',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class)->orderByDesc('paid_at');
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SalesReturn::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    /**
     * Document number for this shop. Numbers come from a locked counter,
     * so two cashiers saving at the same instant can never collide.
     */
    public static function nextNumber(?int $shopId = null): string
    {
        return Sequence::next('sale', $shopId ?? ActiveShopId::idOrFail(), 'SAL-');
    }
}
