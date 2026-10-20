<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use BelongsToShop, SoftDeletes;

    protected $fillable = [
        'shop_id', 'branch_id', 'name', 'phone', 'email', 'address', 'notes', 'balance', 'status',
    ];

    protected function casts(): array
    {
        return ['balance' => 'float'];
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function payments(): HasMany
    {
        return $this->hasManyThrough(SalePayment::class, Sale::class);
    }
}
