<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentPayment extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'rent_id', 'period_start', 'period_end', 'amount_due', 'amount_paid',
        'due_date', 'paid_at', 'payment_method', 'receipt_number', 'status',
        'notes', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date', 'period_end' => 'date', 'due_date' => 'date',
            'paid_at' => 'date',
            'amount_due' => 'float', 'amount_paid' => 'float',
        ];
    }

    public function rent(): BelongsTo
    {
        return $this->belongsTo(Rent::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function remaining(): float
    {
        return max(0, $this->amount_due - $this->amount_paid);
    }
}
