<?php

namespace App\Services;

use App\Models\Shop;
use RuntimeException;

/**
 * Reads business settings for the shop the current request belongs to.
 *
 * Every value is resolved per shop — there is no global "current shop"
 * singleton any more, which is what allows one install to run several
 * independent businesses side by side.
 */
class ShopSettings
{
    public static function shop(): Shop
    {
        $shop = ActiveShop::shop();

        if (! $shop) {
            throw new RuntimeException('No shop selected for this request.');
        }

        return $shop;
    }

    public static function id(): int
    {
        return ActiveShop::idOrFail();
    }

    public static function allowNegativeStock(): bool
    {
        return (bool) static::shop()->allow_negative_stock;
    }

    public static function currency(): string
    {
        return (string) static::shop()->currency;
    }

    public static function currencySymbol(): string
    {
        return (string) static::shop()->currency_symbol;
    }

    public static function lowStockThreshold(): float
    {
        return (float) static::shop()->low_stock_threshold;
    }

    public static function costingMethod(): string
    {
        return (string) static::shop()->costing_method;
    }

    public static function teamMode(): string
    {
        return static::shop()->team_mode === 'team' ? 'team' : 'single';
    }

    public static function isTeamMode(): bool
    {
        return static::teamMode() === 'team';
    }

    /**
     * Discounts at or above this percentage need a manager's approval.
     * Zero disables the check.
     */
    public static function discountApprovalThreshold(): float
    {
        return (float) static::shop()->discount_approval_threshold;
    }

    /**
     * Sale totals at or above this amount need a manager's approval.
     * Zero disables the check.
     */
    public static function saleApprovalThreshold(): float
    {
        return (float) static::shop()->sale_approval_threshold;
    }

    public static function flush(): void
    {
        ActiveShop::flush();
    }
}