<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Race-safe document numbering.
 *
 * The previous implementation used `count() + 1`, which collides as soon
 * as two cashiers save at the same moment (and permanently breaks after
 * any delete). Every number is now handed out from a per-shop, per-type
 * counter row locked inside the caller's transaction.
 */
class Sequence
{
    public static function next(string $type, int $shopId, string $prefix = '', int $width = 6): string
    {
        $scope = "{$shopId}:{$type}";

        $value = DB::transaction(function () use ($scope) {
            // Create-if-absent is safe under concurrency; insertOrIgnore
            // lets exactly one transaction win the insert race.
            DB::table('sequences')->insertOrIgnore([
                'scope' => $scope,
                'next_value' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $row = DB::table('sequences')
                ->where('scope', $scope)
                ->lockForUpdate()
                ->first();

            $value = (int) $row->next_value;

            DB::table('sequences')
                ->where('scope', $scope)
                ->update(['next_value' => $value + 1, 'updated_at' => now()]);

            return $value;
        });

        return $prefix.str_pad((string) $value, $width, '0', STR_PAD_LEFT);
    }

    /**
     * Number for the shop the current request belongs to.
     */
    public static function forActiveShop(string $type, string $prefix = '', int $width = 6): string
    {
        return static::next($type, ActiveShop::idOrFail(), $prefix, $width);
    }

    /**
     * Advance past numbers already used by historical rows, so a fresh
     * counter never re-issues an existing document number.
     */
    public static function seedFrom(string $type, int $shopId, int $highestUsed): void
    {
        $scope = "{$shopId}:{$type}";

        $current = (int) (DB::table('sequences')->where('scope', $scope)->value('next_value') ?? 1);

        if ($highestUsed >= $current) {
            DB::table('sequences')->updateOrInsert(
                ['scope' => $scope],
                ['next_value' => $highestUsed + 1, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }
}