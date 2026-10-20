<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use BelongsToShop, SoftDeletes;

    protected $fillable = [
        'shop_id', 'branch_id', 'name', 'company', 'phone', 'email', 'address',
        'tax_id', 'notes', 'balance', 'status',
    ];

    protected function casts(): array
    {
        return ['balance' => 'float'];
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function purchasePayments(): HasMany
    {
        return $this->hasManyThrough(PurchasePayment::class, Purchase::class);
    }
}
