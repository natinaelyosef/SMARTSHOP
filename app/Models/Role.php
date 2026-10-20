<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use BelongsToShop;

    protected $fillable = ['shop_id', 'name', 'slug', 'description', 'is_system'];

    protected function casts(): array
    {
        return ['is_system' => 'boolean'];
    }

    /**
     * Owners bypass the permission list entirely; everyone else is
     * checked against the role's attached permissions.
     */
    public function grantsEverything(): bool
    {
        return in_array($this->slug, ['owner', 'super_admin'], true);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Permissions cached for the current request so route middleware
     * does not lazy-load the pivot table on every check.
     *
     * @var array<int, string>|null
     */
    protected ?array $permissionSlugs = null;

    public function permissionSlugs(): array
    {
        if ($this->grantsEverything()) {
            return ['*'];
        }

        return $this->permissionSlugs ??= $this->permissions()->pluck('slug')->all();
    }
}
