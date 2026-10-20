<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class ExpenseCategory extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'name', 'slug', 'is_system', 'status'];

    protected function casts(): array
    {
        return ['is_system' => 'boolean'];
    }
}
