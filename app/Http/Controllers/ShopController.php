<?php

namespace App\Http\Controllers;

use App\Models\Shop;
use App\Services\ActiveShop;
use App\Services\BranchContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform administration: choosing which business to work in. Only
 * platform administrators reach these screens.
 */
class ShopController extends Controller
{
    public function select(): Response
    {
        abort_unless(ActiveShop::isPlatformAdmin(), 403);

        return Inertia::render('shops/Select', [
            'shops' => ActiveShop::switchable()->map(fn (Shop $shop) => [
                'id' => $shop->id,
                'name' => $shop->name,
                'phone' => $shop->phone,
                'currency_symbol' => $shop->currency_symbol,
                'branches' => $shop->branches()->where('is_active', true)->count(),
                'users' => $shop->users()->where('status', 'active')->count(),
                'active' => $shop->id === ActiveShop::id(),
            ])->values(),
        ]);
    }

    public function enter(Request $request, Shop $shop): RedirectResponse
    {
        abort_unless(ActiveShop::isPlatformAdmin(), 403);

        ActiveShop::set($shop->id);
        BranchContext::set(null);

        return redirect()->route('pos');
    }

    public function clear(Request $request): RedirectResponse
    {
        abort_unless(ActiveShop::isPlatformAdmin(), 403);

        ActiveShop::set(null);
        BranchContext::set(null);

        return redirect()->route('shops.select');
    }
}