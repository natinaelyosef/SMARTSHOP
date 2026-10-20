<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;

class User extends Authenticatable
{
    use BelongsToShop, HasFactory, Notifiable;

    /**
     * How much of the shop's data this user may see.
     */
    public const SCOPE_OWN = 'own';

    public const SCOPE_BRANCH = 'branch';

    public const SCOPE_ALL = 'all';

    protected $fillable = [
        'shop_id', 'name', 'email', 'password', 'role_id', 'branch_id',
        'phone', 'status', 'language', 'avatar', 'last_login_at',
        'is_platform_admin', 'is_owner', 'must_change_password', 'data_scope',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'password' => 'hashed',
            'is_platform_admin' => 'boolean',
            'is_owner' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    /**
     * Cached permission slugs so repeated route checks do not hit the
     * database on every request.
     *
     * @var Collection<int, string>|null
     */
    protected ?Collection $cachedPermissionSlugs = null;

    public function permissions(): Collection
    {
        if ($this->cachedPermissionSlugs !== null) {
            return $this->cachedPermissionSlugs;
        }

        $role = $this->role;

        if (! $role) {
            return $this->cachedPermissionSlugs = collect();
        }

        return $this->cachedPermissionSlugs = $role->grantsEverything()
            ? collect(['*'])
            : $role->permissions()->pluck('slug');
    }

    public function hasPermission(string $slug): bool
    {
        if ($this->is_platform_admin || $this->is_owner) {
            return true;
        }

        return $this->permissions()->contains($slug) || $this->permissions()->contains('*');
    }

    public function hasAnyPermission(array $slugs): bool
    {
        foreach ($slugs as $slug) {
            if ($this->hasPermission($slug)) {
                return true;
            }
        }

        return false;
    }

    public function hasAllPermissions(array $slugs): bool
    {
        foreach ($slugs as $slug) {
            if (! $this->hasPermission($slug)) {
                return false;
            }
        }

        return true;
    }

    public function canAccessModule(string $module): bool
    {
        if ($this->is_platform_admin || $this->is_owner) {
            return true;
        }

        $role = $this->role;

        if (! $role) {
            return false;
        }

        return $role->permissions()->where('module', $module)->exists();
    }

    /**
     * The widest data scope this user may use. Owners and platform
     * administrators always see the whole business.
     */
    public function effectiveDataScope(): string
    {
        if ($this->is_platform_admin || $this->is_owner) {
            return self::SCOPE_ALL;
        }

        return in_array($this->data_scope, [self::SCOPE_OWN, self::SCOPE_BRANCH, self::SCOPE_ALL], true)
            ? $this->data_scope
            : self::SCOPE_BRANCH;
    }

    /**
     * Restrict a query on shop-owned documents to what this user is
     * allowed to see: everything, their branch, or their own records.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     */
    public function applyDataScope($query, string $column = 'branch_id')
    {
        return match ($this->effectiveDataScope()) {
            self::SCOPE_ALL => $query,
            self::SCOPE_BRANCH => $this->branch_id === null
                ? $query->whereRaw('1 = 0')
                : $query->where($column, $this->branch_id),
            default => $query->where($column, $this->branch_id)
                ->where(function ($q) {
                    $q->where('user_id', $this->id)->orWhereNull('user_id');
                }),
        };
    }

    /**
     * Can this user act on the given branch?
     */
    public function canManageBranch(?int $branchId): bool
    {
        if ($this->is_platform_admin || $this->is_owner) {
            return true;
        }

        return $this->effectiveDataScope() === self::SCOPE_ALL
            || ($branchId !== null && (int) $this->branch_id === $branchId);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function flushPermissionCache(): void
    {
        $this->cachedPermissionSlugs = null;
    }
}