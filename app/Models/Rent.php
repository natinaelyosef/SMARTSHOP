<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rent extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'branch_id', 'shop_name', 'landlord_name', 'landlord_phone',
        'monthly_amount', 'due_day', 'start_date', 'end_date', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return [
            'monthly_amount' => 'float',
            'start_date' => 'date',
            'end_date' => 'date',
            'due_day' => 'integer',
        ];
    }

    public function payments(): HasMany
    {
        return $this->hasMany(RentPayment::class)->orderByDesc('period_start');
    }
}
