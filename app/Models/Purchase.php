<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use App\Services\ActiveShop as ActiveShopId;
use App\Services\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'purchase_number', 'branch_id', 'supplier_id', 'user_id', 'purchased_at',
        'subtotal', 'discount', 'tax_amount', 'total', 'paid_amount',
        'remaining_amount', 'payment_status', 'status', 'invoice_number', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'purchased_at' => 'date',
            'subtotal' => 'float', 'discount' => 'float', 'tax_amount' => 'float',
            'total' => 'float', 'paid_amount' => 'float', 'remaining_amount' => 'float',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PurchasePayment::class)->orderByDesc('paid_at');
    }

    public static function nextNumber(?int $shopId = null): string
    {
        return Sequence::next('purchase', $shopId ?? ActiveShopId::idOrFail(), 'PUR-');
    }
}
