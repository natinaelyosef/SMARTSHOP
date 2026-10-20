<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Throwable;

/**
 * Resolves which branch of the active shop the current work is for.
 *
 * A user restricted to their branch is locked to it. Owners and users
 * with an "all" data scope may switch branches; the choice is remembered
 * for the session so every page, report and POS sale agrees on it.
 */
class BranchContext
{
    public const SESSION_KEY = 'active_branch_id';

    /**
     * The branch every new document should be stamped with.
     */
    public static function id(): ?int
    {
        $user = Auth::user();

        if (! $user) {
            return null;
        }

        $allowed = static::allowedIds($user);

        if ($allowed === null) {
            // No branch restriction — resolve from the session.
            $selected = static::sessionValue();

            return $selected !== null && in_array($selected, static::activeBranchIds(), true)
                ? $selected
                : ($user->branch_id !== null && in_array((int) $user->branch_id, static::activeBranchIds(), true)
                    ? (int) $user->branch_id
                    : static::activeBranchIds()[0] ?? null);
        }

        return $allowed[0] ?? null;
    }

    public static function branch(): ?Branch
    {
        $id = static::id();

        return $id === null ? null : Branch::find($id);
    }

    /**
     * A branch the user is actually allowed to post to right now.
     */
    public static function idFor(?User $user, ?int $branchId = null): ?int
    {
        $user ??= Auth::user();

        if (! $user) {
            return null;
        }

        if ($user->canManageBranch($branchId) && $branchId !== null) {
            $exists = static::activeBranchIds();

            return in_array($branchId, $exists, true) ? $branchId : null;
        }

        return static::id();
    }

    public static function set(?int $branchId): void
    {
        static::writeSession($branchId);
    }

    /**
     * Branches this user may switch between.
     *
     * @return array<int, int>
     */
    public static function switchable(?User $user = null): array
    {
        $user ??= Auth::user();

        if (! $user) {
            return [];
        }

        if ($user->is_platform_admin || $user->is_owner || $user->effectiveDataScope() === User::SCOPE_ALL) {
            return static::activeBranchIds();
        }

        return $user->branch_id !== null && in_array((int) $user->branch_id, static::activeBranchIds(), true)
            ? [(int) $user->branch_id]
            : [];
    }

    /**
     * @return array<int, int>
     */
    public static function activeBranchIds(): array
    {
        return Branch::where('is_active', true)
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Null when the user is not branch-locked, otherwise the only ids
     * they may use.
     *
     * @return array<int, int>|null
     */
    protected static function allowedIds(User $user): ?array
    {
        if ($user->is_platform_admin || $user->is_owner) {
            return null;
        }

        if ($user->effectiveDataScope() === User::SCOPE_ALL) {
            return null;
        }

        return $user->branch_id !== null ? [(int) $user->branch_id] : [];
    }

    protected static function sessionValue(): ?int
    {
        $value = static::readSession();

        return $value === null ? null : (int) $value;
    }

    protected static function readSession(): ?int
    {
        try {
            return Session::get(self::SESSION_KEY);
        } catch (Throwable) {
            // No session available (console, queue worker).
            return null;
        }
    }

    protected static function writeSession(?int $branchId): void
    {
        try {
            if ($branchId === null) {
                Session::forget(self::SESSION_KEY);
            } else {
                Session::put(self::SESSION_KEY, $branchId);
            }
        } catch (Throwable) {
            // Nothing to persist outside an HTTP session.
        }
    }
}