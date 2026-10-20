<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\PriceHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\Rent;
use App\Models\Sale;
use App\Models\Shop;
use App\Models\Supplier;
use App\Models\TaxPeriod;
use App\Models\Unit;
use App\Models\User;
use App\Services\ActiveShop;
use App\Services\BranchStockService;
use App\Services\InventoryService;
use App\Services\NotificationService;
use App\Services\PurchaseService;
use App\Services\SalesService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $shop = Shop::where('name', 'SmartShop Manager')->first();

        if (! $shop || Product::count() > 0) {
            return;
        }

        // Everything below is business data, so pin the tenant and act
        // as a signed-in user: BranchContext resolves through Auth.
        ActiveShop::force($shop->id);

        $admin = User::where('email', 'admin@smartshop.et')->first() ?? User::first();
        $cashier = User::where('email', 'cashier@smartshop.et')->first() ?? $admin;

        Auth::login($admin);

        $branches = Branch::where('is_active', true)->orderBy('id')->get();
        $primaryBranchId = (int) ($branches->first()->id ?? 0);
        $admin->forceFill(['branch_id' => $primaryBranchId])->save();

        foreach (['Food', 'Drinks', 'Electronics', 'Clothing', 'Cosmetics', 'Household', 'Stationery', 'Other'] as $name) {
            Category::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'status' => 'active']);
        }

        $unitPiece = Unit::where('slug', 'piece')->first() ?? Unit::first();
        $unitBottle = Unit::where('slug', 'bottle')->first() ?? $unitPiece;
        $unitBox = Unit::where('slug', 'box')->first() ?? $unitPiece;
        $unitKg = Unit::where('slug', 'kilogram')->first() ?? $unitPiece;

        $catalog = [
            ['Coca-Cola', 'Drinks', 'CCE', 'Non-alcoholic beverages', [
                ['Bottle 300ml', 14, 20, 10], ['Bottle 500ml', 20, 28, 12],
                ['Bottle 1L', 30, 42, 8], ['Can 330ml', 16, 23, 10],
            ]],
            ['Bottled Water', 'Drinks', 'WTR', 'Drinking water', [
                ['Bottle 500ml', 7, 12, 15], ['Bottle 1L', 11, 18, 12],
            ]],
            ['Ambo Mineral Water', 'Drinks', 'AMB', 'Mineral water', [
                ['Bottle 300ml', 8, 13, 15], ['Bottle 1.5L', 15, 24, 10],
            ]],
            ['Injera Flour', 'Food', 'FLR', 'Teff flour', [
                ['Pack 1kg', 45, 60, 20], ['Pack 5kg', 210, 275, 8],
            ]],
            ['Cooking Oil', 'Food', 'OIL', 'Vegetable cooking oil', [
                ['Bottle 1L', 95, 125, 12], ['Bottle 3L', 265, 340, 6],
            ]],
            ['Sugar', 'Food', 'SGR', 'White sugar', [
                ['Pack 1kg', 48, 62, 20], ['Pack 2kg', 92, 118, 12],
            ]],
            ['Rice', 'Food', 'RCE', 'Long grain rice', [
                ['Pack 1kg', 62, 80, 15], ['Pack 5kg', 295, 375, 6],
            ]],
            ['Pasta', 'Food', 'PST', 'Macaroni', [
                ['Pack 400g', 32, 45, 18],
            ]],
            ['Laundry Soap', 'Household', 'SOP', 'Bar soap', [
                ['Bar 200g', 38, 52, 25], ['Pack 6 bars', 210, 280, 8],
            ]],
            ['Dish Detergent', 'Household', 'DET', 'Dishwashing liquid', [
                ['Bottle 500ml', 65, 88, 12], ['Bottle 1L', 120, 158, 8],
            ]],
            ['Toothpaste', 'Cosmetics', 'TPT', 'Dental care', [
                ['Tube 100ml', 55, 78, 15],
            ]],
            ['Shampoo', 'Cosmetics', 'SHP', 'Hair care', [
                ['Bottle 400ml', 145, 195, 8],
            ]],
            ['Ballpoint Pen', 'Stationery', 'PEN', 'Writing instruments', [
                ['Piece', 6, 10, 60], ['Box 50 pcs', 240, 330, 6],
            ]],
            ['Exercise Book', 'Stationery', 'BOK', 'Notebooks', [
                ['Piece', 18, 28, 50], ['Pack 10 pcs', 165, 230, 8],
            ]],
            ['LED Bulb', 'Electronics', 'BLB', 'Lighting', [
                ['9W', 55, 85, 15], ['12W', 70, 105, 12],
            ]],
            ['USB Cable', 'Electronics', 'USB', 'Phone accessories', [
                ['Micro-USB 1m', 45, 75, 20], ['Type-C 1m', 55, 90, 18],
            ]],
        ];

        $suppliers = [
            ['name' => 'ABC Distributor', 'company' => 'ABC Trading PLC', 'phone' => '+251 911 000 111', 'address' => 'Merkato, Addis Ababa'],
            ['name' => 'Habesha Drinks Wholesale', 'company' => 'Habesha Beverages', 'phone' => '+251 911 222 333', 'address' => 'Kality, Addis Ababa'],
            ['name' => 'Ethio FMCG Supplies', 'company' => 'Ethio FMCG', 'phone' => '+251 911 444 555', 'address' => 'Sarbet, Addis Ababa'],
            ['name' => 'Genji Trading', 'company' => 'Genji Import & Export', 'phone' => '+251 911 666 777', 'address' => 'Bole, Addis Ababa'],
        ];

        $supplierModels = collect($suppliers)->map(fn ($s) => Supplier::create([...$s, 'status' => 'active']));

        $customers = collect([
            ['name' => 'Abebe Kebede', 'phone' => '+251 912 101 201', 'address' => 'Bole'],
            ['name' => 'Tigist Haile', 'phone' => '+251 912 303 404', 'address' => 'Piyasa'],
            ['name' => 'Dawit Alemu', 'phone' => '+251 912 505 606', 'address' => 'Merkato'],
            ['name' => 'Selamawit Girma', 'phone' => '+251 912 707 808', 'address' => 'CMC'],
            ['name' => 'Restaurant Buna', 'phone' => '+251 912 909 101', 'address' => 'Kazanchis'],
            ['name' => 'Mini Market Sun', 'phone' => '+251 912 121 323', 'address' => 'Sarbet'],
        ])->map(fn ($c) => Customer::create([...$c, 'status' => 'active']));

        $unitMap = ['Drinks' => $unitBottle, 'Food' => $unitKg];
        $variants = collect();
        $products = [];

        foreach ($catalog as [$name, $categoryName, $skuBase, $brand, $variantDefs]) {
            $category = Category::where('slug', Str::slug($categoryName))->first();
            $product = Product::create([
                'name' => $name,
                'sku' => $skuBase,
                'barcode' => '613'.$skuBase.'000',
                'qr_code' => $skuBase,
                'category_id' => $category?->id,
                'unit_id' => ($unitMap[$categoryName] ?? $unitPiece)->id,
                'brand' => $brand,
                'description' => $brand,
                'status' => 'active',
            ]);

            foreach ($variantDefs as $i => [$vName, $cost, $price, $minStock]) {
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'unit_id' => $product->unit_id,
                    'name' => $vName,
                    'sku' => $skuBase.'-'.($i + 1),
                    'barcode' => '613'.$skuBase.($i + 1),
                    'cost' => $cost,
                    'selling_price' => $price,
                    'min_stock' => $minStock,
                    'stock' => 0,
                    'track_expiry' => in_array($categoryName, ['Drinks', 'Food', 'Cosmetics'], true),
                    'status' => 'active',
                ]);

                PriceHistory::create([
                    'product_variant_id' => $variant->id,
                    'old_price' => 0,
                    'new_price' => $price,
                    'cost_at_time' => $cost,
                    'user_id' => $admin->id,
                    'reason' => 'Initial price',
                    'effective_at' => now()->subMonths(6),
                ]);

                $variants->push($variant);
                $products[] = $product;
            }
        }

        // Every branch gets a zeroed stock line for every variant, so
        // the second branch is usable from day one.
        foreach ($branches as $branch) {
            foreach ($variants as $variant) {
                BranchStock::firstOrCreate(
                    ['branch_id' => $branch->id, 'product_variant_id' => $variant->id],
                    ['stock' => 0, 'min_stock' => $variant->min_stock, 'cost' => (float) $variant->cost]
                );
            }
        }

        $purchaseService = app(PurchaseService::class);
        $salesService = app(SalesService::class);
        $inventory = app(InventoryService::class);

        $monthsBack = 6;
        $stocks = [];

        for ($m = $monthsBack; $m >= 0; $m--) {
            $monthStart = now()->subMonths($m)->startOfMonth();
            $batches = $variants->chunk(4);

            foreach ($batches as $index => $chunk) {
                $supplier = $supplierModels[$index % $supplierModels->count()];
                $items = [];

                foreach ($chunk as $variant) {
                    $drift = 1 + (($monthsBack - $m) * 0.03);
                    $baseCost = $variant->cost / (1 + ($monthsBack * 0.03));
                    $unitCost = round($baseCost * $drift * (random_int(95, 105) / 100), 2);
                    $quantity = random_int(60, 220);
                    $purchaseDate = $monthStart->copy()->addDays(random_int(1, 18));
                    if ($purchaseDate->isFuture()) {
                        $purchaseDate = now()->copy()->subDays(random_int(0, 6));
                    }

                    $items[] = [
                        'product_variant_id' => $variant->id,
                        'quantity' => $quantity,
                        'unit_cost' => $unitCost,
                        'batch_number' => $variant->track_expiry ? 'B'.strtoupper(Str::random(6)) : null,
                        'expires_at' => $variant->track_expiry
                            ? $purchaseDate->copy()->addDays(random_int(120, 500))->toDateString()
                            : null,
                        'manufactured_at' => $variant->track_expiry ? $purchaseDate->copy()->subDays(30)->toDateString() : null,
                    ];

                    $stocks[$variant->id] = ($stocks[$variant->id] ?? 0) + $quantity;
                }

                $paidRatio = random_int(0, 10) < 7 ? 1.0 : (random_int(30, 80) / 100);

                $purchaseService->create([
                    'branch_id' => $primaryBranchId,
                    'supplier_id' => $supplier->id,
                    'purchased_at' => $purchaseDate->toDateString(),
                    'discount' => 0,
                    'tax_amount' => 0,
                    'paid_amount' => 0,
                    'payment_method' => 'cash',
                    'invoice_number' => 'INV-'.strtoupper(Str::random(8)),
                    'items' => $items,
                ], $admin);

                // Apply partial payment through the service afterwards
                $purchase = Purchase::latest('id')->first();
                if ($paidRatio > 0) {
                    $purchaseService->recordPayment($purchase, [
                        'amount' => round($purchase->total * $paidRatio, 2),
                        'payment_method' => random_int(0, 1) ? 'cash' : 'bank',
                        'paid_at' => $purchase->purchased_at->copy()->addDays(random_int(0, 10)),
                    ], $admin);
                }
            }
        }

        // Sales history: last 75 days
        $activeVariants = $variants->filter(fn ($v) => ($stocks[$v->id] ?? 0) > 10)->values();
        $paymentMethods = ['cash', 'cash', 'cash', 'cash', 'mobile', 'bank', 'credit'];

        for ($day = 75; $day >= 0; $day--) {
            $date = now()->subDays($day);
            if ($date->isFuture()) {
                continue;
            }

            $salesCount = $date->isWeekend() ? random_int(5, 9) : random_int(3, 7);

            for ($s = 0; $s < $salesCount; $s++) {
                $lineCount = random_int(1, 4);
                $items = [];
                $available = $activeVariants->filter(fn ($v) => ($stocks[$v->id] ?? 0) > 0);

                if ($available->isEmpty()) {
                    break;
                }

                for ($l = 0; $l < $lineCount; $l++) {
                    $variant = $available->random();
                    $qty = random_int(1, min(6, max(1, (int) floor($stocks[$variant->id]))));
                    if ($qty <= 0 || $stocks[$variant->id] < $qty) {
                        continue;
                    }
                    $items[] = [
                        'product_variant_id' => $variant->id,
                        'quantity' => $qty,
                        'unit_price' => $variant->selling_price,
                    ];
                    $stocks[$variant->id] -= $qty;
                }

                if (empty($items)) {
                    continue;
                }

                $method = $paymentMethods[array_rand($paymentMethods)];
                $customer = $method === 'credit' ? $customers->random() : (random_int(0, 3) === 0 ? $customers->random() : null);

                $saleData = [
                    'branch_id' => $primaryBranchId,
                    'items' => $items,
                    'payment_method' => $method,
                    'discount' => random_int(0, 10) === 0 ? random_int(5, 25) : 0,
                    'customer_id' => $customer?->id,
                    'sold_at' => $date->copy()->setTime(random_int(8, 20), random_int(0, 59), random_int(0, 59)),
                ];

                if ($method === 'credit') {
                    $saleData['paid_amount'] = random_int(40, 90) / 100;
                    $saleData['tendered_method'] = 'cash';
                }

                try {
                    $salesService->create($saleData, random_int(0, 1) ? $cashier : $admin);
                } catch (\Throwable $e) {
                    continue;
                }
            }
        }

        // A few returns for realism
        $completedSales = Sale::where('status', 'completed')
            ->where('sold_at', '>=', now()->subDays(30))->inRandomOrder()->limit(4)->get();

        foreach ($completedSales as $sale) {
            $item = $sale->items->first();
            if (! $item || $item->quantity < 2) {
                continue;
            }
            try {
                $salesService->returnItems($sale, [
                    'items' => [['sale_item_id' => $item->id, 'quantity' => 1]],
                    'reason' => 'Customer changed mind',
                    'payment_method' => 'cash',
                ], $admin);
            } catch (\Throwable $e) {
                continue;
            }
        }

        // Expenses for the last 6 months
        $expenseMap = [
            'Electricity' => [3800, 6200], 'Water' => [700, 1500], 'Internet' => [1800, 2400],
            'Salary' => [28000, 34000], 'Transportation' => [1500, 4200], 'Maintenance' => [800, 3500],
            'Packaging' => [500, 1800], 'Bank fees' => [300, 900], 'Marketing' => [1200, 5000],
            'Security' => [2500, 3500],
        ];

        foreach ($expenseMap as $categoryName => [$min, $max]) {
            $category = ExpenseCategory::where('slug', Str::slug($categoryName))->first();
            if (! $category) {
                continue;
            }
            for ($m = $monthsBack; $m >= 0; $m--) {
                $expenseDate = now()->subMonths($m)->setDay(random_int(1, 27));
                if ($expenseDate->isFuture()) {
                    $expenseDate = now()->copy()->subDays(random_int(0, 10));
                }
                $amount = random_int($min, $max);
                Expense::create([
                    'expense_category_id' => $category->id,
                    'amount' => $amount,
                    'expense_date' => $expenseDate->toDateString(),
                    'payment_method' => random_int(0, 1) ? 'cash' : 'bank',
                    'is_paid' => $m > 0,
                    'paid_amount' => $m > 0 ? $amount : 0,
                    'description' => $categoryName.' — monthly bill',
                    'receipt_reference' => 'RCT-'.strtoupper(Str::random(6)),
                    'user_id' => $admin->id,
                ]);
            }
        }

        // Rent contract with history
        $rent = Rent::create([
            'branch_id' => $primaryBranchId,
            'shop_name' => 'Main Shop — Bole',
            'landlord_name' => 'Getachew Property',
            'landlord_phone' => '+251 911 888 999',
            'monthly_amount' => 20000,
            'due_day' => 1,
            'start_date' => now()->subMonths($monthsBack)->startOfMonth()->toDateString(),
            'status' => 'active',
            'notes' => 'Monthly rent contract',
        ]);

        for ($m = $monthsBack; $m >= 0; $m--) {
            $periodStart = now()->subMonths($m)->startOfMonth();
            $dueDate = $periodStart->copy()->addDay(0);
            $isFuture = $periodStart->isFuture();
            if ($isFuture) {
                continue;
            }

            $payment = $rent->payments()->create([
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodStart->copy()->endOfMonth()->toDateString(),
                'amount_due' => 20000,
                'amount_paid' => 0,
                'due_date' => $dueDate->toDateString(),
                'status' => 'unpaid',
            ]);

            if ($m > 1) {
                $payment->amount_paid = 20000;
                $payment->status = 'paid';
                $payment->paid_at = $dueDate->copy()->addDays(random_int(0, 5))->toDateString();
                $payment->payment_method = 'bank';
                $payment->receipt_number = 'RNT-'.strtoupper(Str::random(6));
                $payment->user_id = $admin->id;
                $payment->save();
            } elseif ($m === 1) {
                $payment->amount_paid = 12000;
                $payment->status = 'partial';
                $payment->paid_at = $dueDate->copy()->addDays(3)->toDateString();
                $payment->payment_method = 'cash';
                $payment->user_id = $admin->id;
                $payment->save();
            }
        }

        // Tax period for this year
        TaxPeriod::firstOrCreate(
            ['name' => now()->format('Y').' Estimated Tax'],
            [
                'start_date' => now()->startOfYear()->toDateString(),
                'end_date' => now()->endOfYear()->toDateString(),
                'period_type' => 'yearly',
                'status' => 'open',
            ],
        );

        // Prime notifications
        app(NotificationService::class)->refresh();
    }
}
