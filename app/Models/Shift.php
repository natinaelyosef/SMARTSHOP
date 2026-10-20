<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A cashier's working session and cash drawer. Open → sell → close, with
 * the counted cash compared against what the system expected.
 */
class Shift extends Model
{
    use BelongsToShop;

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'shop_id', 'branch_id', 'user_id', 'opening_float', 'cash_sales',
        'other_in', 'other_out', 'expected_cash', 'counted_cash', 'variance',
        'opened_at', 'closed_at', 'status', 'note',
    ];

    protected function casts(): array
    {
        return [
            'opening_float' => 'float',
            'cash_sales' => 'float',
            'other_in' => 'float',
            'other_out' => 'float',
            'expected_cash' => 'float',
            'counted_cash' => 'float',
            'variance' => 'float',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    /**
     * Recompute drawer totals from the sales actually recorded against
     * this shift, then store expected cash and variance.
     */
    public function recalculate(float $otherIn = 0, float $otherOut = 0): self
    {
        $this->cash_sales = (float) $this->sales()
            ->where('payment_method', 'cash')
            ->where('status', 'completed')
            ->sum('paid_amount');

        $this->other_in = $otherIn;
        $this->other_out = $otherOut;

        $this->expected_cash = round(
            (float) $this->opening_float + $this->cash_sales + $otherIn - $otherOut,
            4
        );

        if ($this->counted_cash !== null) {
            $this->variance = round((float) $this->counted_cash - $this->expected_cash, 4);
        }

        $this->save();

        return $this;
    }
}