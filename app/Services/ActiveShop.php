<?php

namespace App\Services;

use App\Models\Shop;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;
use RuntimeException;

/**
 * Resolves which business ("shop") the current request is acting for.
 *
 * Ordinary staff always act for their own shop. Platform administrators
 * may switch between shops via the session, which is how one install can
 * host several completely independent businesses.
 *
 * Resolution order:
 *   1. an explicit override (queued jobs, console commands, seeders, tests)
 *   2. the session, for platform administrators only
 *   3. the authenticated user's own shop
 *
 * When nothing resolves, callers get `null` and query scopes fail closed
 * rather than leaking another tenant's rows.
 */
class ActiveShop
{
    /**
     * Shop id forced for the current process, bypassing session and auth.
     */
    protected static ?int $forced = null;

    /**
     * Cached shop instances, keyed by id, for the lifetime of the request.
     *
     * @var array<int, Shop>
     */
    protected static array $resolved = [];

    public static function id(): ?int
    {
        if (static::$forced !== null) {
            return static::$forced;
        }

        $user = Auth::user();

        if (! $user) {
            return null;
        }

        if ($user->is_platform_admin) {
            $selected = Session::get('active_shop_id');

            return $selected !== null ? (int) $selected : null;
        }

        return $user->shop_id !== null ? (int) $user->shop_id : null;
    }

    public static function idOrFail(): int
    {
        $id = static::id();

        if ($id === null) {
            throw new RuntimeException('No active shop for this request.');
        }

        return $id;
    }

    public static function shop(): ?Shop
    {
        $id = static::id();

        if ($id === null) {
            return null;
        }

        return static::$resolved[$id] ??= Cache::remember(
            "shop.{$id}",
            300,
            fn () => Shop::find($id)
        );
    }

    /**
     * Shop record used while creating new tenants (registration, seeds)
     * before anyone is authenticated.
     */
    public static function make(array $attributes): Shop
    {
        return Shop::create($attributes);
    }

    public static function set(?int $shopId): void
    {
        Session::put('active_shop_id', $shopId);
    }

    public static function isPlatformAdmin(): bool
    {
        return (bool) Auth::user()?->is_platform_admin;
    }

    /**
     * True when the current user is not tied to a single business.
     */
    public static function mustChooseShop(): bool
    {
        return static::isPlatformAdmin() && static::id() === null;
    }

    /**
     * Run a callback with a specific shop forced as the active tenant.
     * Used by seeders, queued jobs and tests.
     */
    public static function runIn(?int $shopId, callable $callback): mixed
    {
        $previousForced = static::$forced;

        static::$forced = $shopId;

        try {
            return $callback();
        } finally {
            static::$forced = $previousForced;
        }
    }

    public static function force(?int $shopId): void
    {
        static::$forced = $shopId;
    }

    public static function flush(): void
    {
        static::$forced = null;
        static::$resolved = [];
    }

    /**
     * Every shop a platform administrator may switch into.
     */
    public static function switchable(): \Illuminate\Support\Collection
    {
        if (! static::isPlatformAdmin()) {
            $shop = static::shop();

            return $shop ? collect([$shop]) : collect();
        }

        return Shop::orderBy('name')->get();
    }
}