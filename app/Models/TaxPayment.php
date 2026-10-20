<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxPayment extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'tax_period_id', 'tax_rule_id', 'amount', 'paid_at', 'reference', 'user_id', 'notes'];

    protected function casts(): array
    {
        return ['amount' => 'float', 'paid_at' => 'date'];
    }

    public function taxPeriod(): BelongsTo
    {
        return $this->belongsTo(TaxPeriod::class);
    }

    public function taxRule(): BelongsTo
    {
        return $this->belongsTo(TaxRule::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
