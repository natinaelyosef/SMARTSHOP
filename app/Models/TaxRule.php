<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class TaxRule extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id', 'name', 'type', 'rate', 'effective_from', 'effective_to',
        'is_active', 'is_estimate', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'float',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_active' => 'boolean',
            'is_estimate' => 'boolean',
        ];
    }

    public static function activeFor(string $type = 'sales'): ?self
    {
        return static::where('type', $type)
            ->where('is_active', true)
            ->where('effective_from', '<=', now()->toDateString())
            ->orderByDesc('effective_from')
            ->first();
    }
}
