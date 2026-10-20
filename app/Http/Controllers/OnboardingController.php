<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Role;
use App\Models\Unit;
use App\Services\ShopSettings;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function index(): Response
    {
        $shop = ShopSettings::shop();

        return Inertia::render('onboarding/Index', [
            'shop' => [
                'name' => $shop->name,
                'address' => $shop->address,
                'phone' => $shop->phone,
                'email' => $shop->email,
                'currency' => $shop->currency,
                'currency_symbol' => $shop->currency_symbol,
                'language' => $shop->language,
                'costing_method' => $shop->costing_method,
                'low_stock_threshold' => $shop->low_stock_threshold,
                'default_payment_method' => $shop->default_payment_method,
                'allow_negative_stock' => $shop->allow_negative_stock,
                'onboarding_completed' => $shop->onboarding_completed,
            ],
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'units' => Unit::where('status', 'active')->orderBy('name')->get(['id', 'name', 'short_name']),
            'roles' => Role::orderBy('name')->get(['id', 'name', 'slug']),
            'settings' => ['currency_symbol' => ShopSettings::currencySymbol()],
        ]);
    }
}
