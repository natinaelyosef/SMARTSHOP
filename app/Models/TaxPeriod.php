<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxPeriod extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'name', 'start_date', 'end_date', 'period_type', 'taxable_amount',
        'tax_amount', 'paid_amount', 'remaining_amount', 'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date', 'end_date' => 'date',
            'taxable_amount' => 'float', 'tax_amount' => 'float',
            'paid_amount' => 'float', 'remaining_amount' => 'float',
        ];
    }

    public function payments(): HasMany
    {
        return $this->hasMany(TaxPayment::class)->orderByDesc('paid_at');
    }
}
