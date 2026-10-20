<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shop extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'logo', 'address', 'phone', 'email', 'currency',
        'currency_symbol', 'language', 'timezone', 'costing_method',
        'low_stock_threshold', 'default_payment_method', 'allow_negative_stock',
        'notification_prefs', 'receipt_settings', 'onboarding_completed',
        'team_mode', 'discount_approval_threshold', 'sale_approval_threshold',
    ];

    protected function casts(): array
    {
        return [
            'notification_prefs' => 'array',
            'receipt_settings' => 'array',
            'allow_negative_stock' => 'boolean',
            'onboarding_completed' => 'boolean',
            'low_stock_threshold' => 'float',
            'discount_approval_threshold' => 'float',
            'sale_approval_threshold' => 'float',
        ];
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function activeBranches(): HasMany
    {
        return $this->hasMany(Branch::class)->where('is_active', true);
    }

    public function primaryBranch(): ?Branch
    {
        return $this->branches()->where('is_primary', true)->first()
            ?? $this->branches()->orderBy('id')->first();
    }

    public function owner(): ?User
    {
        return $this->users()->where('is_owner', true)->first();
    }

    /**
     * The branch a newly registered owner starts on.
     */
    public function defaultBranch(): ?Branch
    {
        return $this->primaryBranch();
    }
}