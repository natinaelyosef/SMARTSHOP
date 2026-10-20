<?php

namespace Tests\Unit;

use App\Services\InventoryService;
use PHPUnit\Framework\TestCase;

class InventoryServiceTest extends TestCase
{
    public function test_weighted_average_cost_blends_old_and_new_cost(): void
    {
        $this->assertSame(10.0, InventoryService::weightedAverageCost(10, 8, 10, 12));
        $this->assertSame(9.0, InventoryService::weightedAverageCost(20, 8, 10, 11));
        $this->assertSame(5.0, InventoryService::weightedAverageCost(0, 5, 12, 5));
    }

    public function test_weighted_average_cost_uses_new_cost_when_stock_is_exhausted(): void
    {
        $this->assertSame(7.5, InventoryService::weightedAverageCost(0, 3, 0, 7.5));
        $this->assertSame(9.0, InventoryService::weightedAverageCost(-5, 4, 5, 9));
    }

    public function test_weighted_average_cost_is_rounded_to_four_decimals(): void
    {
        $this->assertSame(6.6667, InventoryService::weightedAverageCost(1, 7, 2, 6.5));
    }
}
